-- Make (address, chainId) the real uniqueness key for accounts, and propagate
-- chainId onto transactions so the foreign key targets the composite key.
--
-- Root cause: contract addresses derive from CREATE = keccak256(rlp(sender, nonce)),
-- which does NOT include chainId. The same relayer wallet can therefore produce
-- identical addresses on Horizen and Base, which violated `accounts.address @unique`
-- and blocked multi-chain batch deployments.
--
-- Migration order matters: backfill transactions.chain_id BEFORE swapping
-- constraints, otherwise the new composite FK has nothing to point at.
--
-- Object naming convention follows the init migration: `@@unique` and `@unique`
-- are implemented as UNIQUE INDEXes (so DROP INDEX / CREATE UNIQUE INDEX),
-- while explicit @relation foreign keys are real constraints
-- (DROP CONSTRAINT / ADD CONSTRAINT FOREIGN KEY).

-- 0. Pre-check: refuse to migrate if any transaction references a missing account.
--    A NULL chain_id after backfill would block the NOT NULL step downstream.
DO $$
DECLARE orphan_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO orphan_count
    FROM transactions t
    LEFT JOIN accounts a ON a.address = t.account_address
    WHERE a.address IS NULL;

    IF orphan_count > 0 THEN
        RAISE EXCEPTION 'Found % orphan transactions with no matching account. Resolve manually before re-running.', orphan_count;
    END IF;
END $$;

-- 1. Add the new column as NULLABLE so the table accepts the change without a default.
ALTER TABLE "transactions" ADD COLUMN "chain_id" INTEGER;

-- 2. Backfill from the parent account row.
UPDATE "transactions" t
SET "chain_id" = a."chain_id"
FROM "accounts" a
WHERE a."address" = t."account_address";

-- 3. Promote to NOT NULL once every row has a value.
ALTER TABLE "transactions" ALTER COLUMN "chain_id" SET NOT NULL;

-- 4. Drop the old indexes / FK we're replacing.
--    UNIQUE INDEX → DROP INDEX, FK constraint → DROP CONSTRAINT.
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_account_address_fkey";
DROP INDEX "transactions_account_address_nonce_key";
DROP INDEX "accounts_address_key";

-- 5. Replace with composite (address, chainId) uniqueness on accounts.
CREATE UNIQUE INDEX "accounts_address_chain_id_key"
    ON "accounts" ("address", "chain_id");

-- 6. Replace transaction-side composite unique + FK so the relation targets (address, chainId).
CREATE UNIQUE INDEX "transactions_account_address_chain_id_nonce_key"
    ON "transactions" ("account_address", "chain_id", "nonce");

ALTER TABLE "transactions"
    ADD CONSTRAINT "transactions_account_address_chain_id_fkey"
    FOREIGN KEY ("account_address", "chain_id")
    REFERENCES "accounts" ("address", "chain_id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- 7. Swap the supporting helper index for the composite key.
DROP INDEX IF EXISTS "transactions_account_address_idx";
CREATE INDEX "transactions_account_address_chain_id_idx"
    ON "transactions" ("account_address", "chain_id");

-- 8. Same fix for reserved_nonces. Without chainId, two chains sharing an
--    address would also share a nonce-reservation row and could collide.
ALTER TABLE "reserved_nonces" ADD COLUMN "chain_id" INTEGER;

UPDATE "reserved_nonces" r
SET "chain_id" = a."chain_id"
FROM "accounts" a
WHERE a."address" = r."account_address";

-- Any reservation pointing at an address with no matching account is stale —
-- safe to drop, the system will recreate as needed.
DELETE FROM "reserved_nonces" WHERE "chain_id" IS NULL;

ALTER TABLE "reserved_nonces" ALTER COLUMN "chain_id" SET NOT NULL;

DROP INDEX "reserved_nonces_account_address_nonce_key";

CREATE UNIQUE INDEX "reserved_nonces_account_address_chain_id_nonce_key"
    ON "reserved_nonces" ("account_address", "chain_id", "nonce");
