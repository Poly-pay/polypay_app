## Private Transfer Flow (Developer Guide)

This document explains the end-to-end private transfer (“Mixer”) flow in PolyPay from a developer’s perspective.

A user deposits assets into a pool contract, which records a Poseidon commitment in an on-chain Merkle tree. To withdraw, the user generates a Noir zero-knowledge proof in the browser demonstrating ownership of a deposit without revealing which one. The backend relays this proof through zkVerify for aggregated verification, then executes the withdrawal on-chain so the user’s wallet never appears in the withdrawal transaction.

It builds on:

- [Privacy Architecture](../privacy-architecture.md)
- [Zero-Knowledge Implementation](../zero-knowledge-implementation.md)

---

### High-Level Overview

Goals:

- Allow users to **deposit** assets into a shared Mixer contract.
- Later, allow them to **withdraw** to any address without linking:
  - the deposit wallet, and
  - the withdrawal recipient.
- Enforce:
  - **Correctness** – withdrawals must correspond to real deposits.
  - **Single use** – each deposit can only be withdrawn once.

Core building blocks:

- **Secret per wallet** – derived once from a wallet signature.
- **Per-pool index `n`** – distinguishes multiple deposits from the same secret.
- **Commitment + nullifier** – bind deposits and withdrawals.
- **Merkle tree per pool** – tracks all commitments for a (token, denomination) pair.
- **Noir circuit** – proves knowledge of a deposit without revealing which one.
- **zkVerify aggregation** – scalable verification of proofs.
- **Relayer backend** – hides the user’s EOA from on-chain interactions.

```text
Deposit:
  Client                           Contract                      Backend
    |                                |                              |
    |  sign message, derive secret   |                              |
    |  compute (commitment, nullifier)                              |
    |                                |                              |
    |--deposit(token, denom, commitment)->|                         |
    |                                | insert leaf into Merkle      |
    |                                | emit Deposit event           |
    |                                |--------Deposit log---------->|
    |                                |               index into MixerDeposit table

Withdraw:
  Client                           Backend                     zkVerify        Contract
    |                                |                            |               |
    |  load deposits, find owned     |                            |               |
    |  generate Noir proof           |                            |               |
    |                                |                            |               |
    |---POST /mixer/withdraw-------->|                            |               |
    |                                |--submit proof------------->|               |
    |                                |<--aggregation result-------|               |
    |                                |---Mixer.withdraw(proof)------------------->|
    |                                |                            | verify proof  |
    |                                |                            | transfer funds|
    |                                |<-----------tx receipt----------------------|
    |<------withdrawal complete------|                            |               |
```

---

### Key Concepts

#### Pools

- A **pool** is defined by `(tokenAddress, denomination)`.
- On-chain:
  - `poolId = keccak256(abi.encodePacked(token, denomination))`.
  - Each `poolId` has its own Merkle tree and root history.

#### Wallet Secret

- Frontend derives a deterministic secret per wallet:
  - `secret = keccak256(signatureBytes) mod BN254_MODULUS`, where `signatureBytes` is the raw byte output of `wallet.sign(MIXER_SECRET_MESSAGE)`. Keccak-256 is applied to the signature bytes, not the message string.
  - The sign message is defined as `MIXER_SECRET_MESSAGE = "polypay-mixer-secret"`.
- Implemented client-side in the `useMixerKeys` hook.
- Never sent to the backend; stored in-memory (and recomputed via signing if needed).

#### Index `n`

- Integer `n = 0, 1, 2, ...`.
- Used to derive multiple deposits from the same secret.
- For each pool, the frontend finds the smallest `n` such that the resulting commitment is not already in that pool.

#### Nullifier (pool-bound)

- To avoid clashes between pools despite the global `commitmentUsed` check, PolyPay binds nullifiers to pools.
- Pseudocode:

```text
poolIdField = keccak256(token, denomination) mod BN254
inner       = poseidon(secret, n)
nullifier   = poseidon(inner, poolIdField)
commitment  = poseidon(secret, nullifier)
```

- Implemented in `computeCommitmentAndNullifier()` in the frontend mixer keys hook.

- Properties:
  - Same `(secret, n)` but different `(token, denomination)` → different `nullifier` and `commitment`.
  - Prevents “Commitment already used” when depositing in multiple pools.

#### Merkle Tree

- Each pool has a sparse Merkle tree of fixed depth (`TREE_DEPTH = 20`).
- Leaves are commitments.
- The contract stores:
  - `trees[poolId].nextIndex`
  - `trees[poolId].filledSubtrees`
  - `rootHistory[poolId][i]` circular buffer of past roots.

#### Nullifier Hash

- Noir circuit and Solidity use:

```text
nullifier_hash = poseidon(nullifier, nullifier)
```

- This is the public value stored on-chain to mark a deposit as spent:
  - `nullifierUsed[poolId][nullifier_hash] = true`.

---

### Deposit Flow (Client → Contract → Indexer)

#### 1. Derive secret (client)

- `useMixerKeys.ensureBaseSecret()`:
  - Signs a fixed message with the wallet.
  - Hashes the signature with Keccak-256.
  - Reduces modulo BN254 prime to obtain `secret`.

#### 2. Compute next `n` for the pool

- Frontend calls backend:
  - `GET /mixer/deposits?chainId&token&denomination`
  - Backend returns:
    - `commitments[]` – all commitment hex strings for that pool.
    - `leafIndices[]` – corresponding leaf indices.
- `getNextDepositIndex(commitments, token, denomination)`:
  - Maintains a `Set` of existing commitments in the pool.
  - Iterates `n = 0, 1, 2, ...`:
    - Computes `(commitment, nullifier)` using the pool-bound formula.
    - Picks the first `n` whose `commitment` is not in the set.

#### 3. Submit `deposit` transaction

- Frontend:
  - For ERC20:
    - `approve(mixerAddress, denomination)` first (only if the current allowance is less than `denomination`; skipped when sufficient allowance already exists).
  - Then call:

```solidity
function deposit(address token, uint256 denomination, bytes32 commitment) external payable;
```

- Contract enforces:
  - `allowedDenominations[poolId] == true`
  - `!commitmentUsed[commitment]` (global across pools)
  - `msg.value == denomination` for ETH pools
  - `msg.value == 0` for ERC20 pools

#### 4. Update Merkle tree and events (contract)

- For each deposit:
  - Inserts the `commitment` as a new leaf at `leafIndex = trees[poolId].nextIndex`.
  - Updates internal tree nodes up to the root using Poseidon.
  - Stores new root in `rootHistory[poolId]` (bounded circular buffer).
  - Sets `commitmentUsed[commitment] = true`.
  - Emits:

```solidity
event Deposit(bytes32 indexed commitment, uint256 leafIndex, uint256 timestamp, address indexed token, uint256 denomination);
```

#### 5. Indexer persists deposits (backend)

- A cron job (`MixerIndexerService`) reads `Deposit` logs from supported chains.
- For each log:
  - Recomputes `poolId` from `(token, denomination)`.
  - Upserts into `MixerDeposit` table:
    - `chainId, poolId, leafIndex, commitment, token, denomination, blockNumber, txHash`.
- API `GET /mixer/deposits` is a thin wrapper over this table.

---

### Withdraw Flow (Client → Backend → zkVerify → Contract)

#### 1. Discover user-owned deposits

Frontend `getWithdrawableSlots(chainId, token, denomination)`:

1. Fetch deposits from backend:
   - `GET /mixer/deposits` → `commitments[]`, `leafIndices[]` for the pool.

2. Recover which deposits belong to the current wallet:
    - `useMixerKeys.findMyDeposits(commitments, leafIndices, token, denomination)`:
     - Ensures `secret` is available.
     - Builds `Map(commitment → leafIndex)` for the pool.
      - Iterates `n` from `0..maxN`, where `maxN = max(commitments.length * 2, 100)` (with `FIND_DEPOSITS_BATCH_SIZE = 50` controlling parallelism):
       - Batches in chunks of 50 and runs `computeCommitmentAndNullifier(secret, n, token, denomination)` in parallel.
       - If derived `commitment` exists in the map, returns a `MixerDepositSlot`.
      - **Performance note:** `maxN` scales linearly with pool size (e.g., 10,000 deposits → `maxN = 20,000`). Each iteration calls `poseidonHash2` three times. With batch parallelism of 50, this results in 400 sequential batches in the worst case. For large pools this can take several seconds. Planned mitigations include progressive loading and per-wallet `n` caching in localStorage.
     - Returns matched deposits as `MixerDepositSlot`:

```text
MixerDepositSlot {
  n: number;
  commitment: bigint;
  nullifier: bigint;
  leafIndex: number;
}
```

3. Filter out already-withdrawn slots:
   - For each slot:
     - Compute `nullifierHash = poseidon(nullifier, nullifier)`.
     - Call `mixer.nullifierUsed(poolId, nullifierHash)` via `readContract`.
     - Keep only those with `nullifierUsed == false`.

4. Return:
   - `slots: MixerDepositSlot[]`
   - `commitments: string[]` (full pool commitments, cached for Merkle proof).

#### 2. Build Merkle path and circuit inputs

When the user selects a slot and a recipient:

1. Compute Merkle path:
   - Using the same `commitments[]` and `slot.leafIndex`:
     - `useMerkleTree.getRootAndPath(commitments, leafIndex)` → `root`, `siblings[20]`, `pathIndices[20]`.

2. Compute `nullifierHash` and encode public inputs as fields:

```text
nullifierHash = poseidon(nullifier, nullifier)
recipientField = BigInt(recipientAddress)
tokenField     = BigInt(tokenAddress)
denomField     = BigInt(denomination)
```

3. Circuit inputs to Noir:

```text
Private:
  secret        : Field
  nullifier     : Field
  merkle_path   : [Field; 20]
  path_indices  : [Field; 20]

Public:
  merkle_root   : Field
  nullifier_hash: Field
  recipient     : Field
  token_address : Field
  denomination  : Field
```

The circuit enforces:

- `commitment = poseidon(secret, nullifier)`
- `poseidon(nullifier, nullifier) == nullifier_hash`
- `commitment` is a valid leaf in the Merkle tree with root `merkle_root`.

It does **not** check `poolId` explicitly; binding to the pool is enforced at the contract level by:

- Using the `root` from that pool’s root history.
- Checking `nullifierUsed[poolId][nullifierHash]`.

#### 3. Generate proof in the browser

- Frontend loads compiled Noir artifact from `packages/nextjs/public/mixer-circuit/target/mixer_circuit.json`.
- Steps:
  1. `noir.execute(circuitInput)` → witness.
  2. `UltraPlonkBackend.generateProof(witness)` → `{ proof, publicInputs }`.
  3. `UltraPlonkBackend.getVerificationKey()` → `vk` (exported as base64).

#### 4. Submit withdrawal request to backend

- Frontend sends:
  - `chainId, token, denomination, recipient`
  - `nullifierHash`, `root`
  - `proof` (bytes array)
  - `publicInputs`
  - `vk` (verification key)
- Backend:
  - Registers the verifying key with zkVerify (if needed).
  - Submits the proof to zkVerify to obtain an aggregated leaf.
  - Persists a `MixerWithdrawRequest` row with:
    - `aggregationId, domainId`
    - encoded public inputs
    - status, retry metadata, etc.

#### 5. zkVerify aggregation and on-chain execution

- `MixerService.pollForAggregation()` polls zkVerify every **10 seconds** (`MIXER_AGGREGATION_INTERVAL_MS`) for up to **30 attempts** (`MIXER_AGGREGATION_MAX_ATTEMPTS`).
- Once the aggregation status is `'Aggregated'`, the backend waits **40 seconds** (`MIXER_FINALIZATION_WAIT_MS`) for on-chain finalization, then calls `Mixer.withdraw` on-chain via `MixerService.executeWithRetry()`:

```solidity
function withdraw(
    address token,
    uint256 denomination,
    address recipient,
    bytes32 nullifierHash,
    bytes32 root,
    MixerProof calldata proof
) external;
```

- `MixerProof` includes:
  - `aggregationId`
  - `domainId`
  - `zkMerklePath[]` (path inside zkVerify’s aggregation tree)
  - `leafCount`
  - `index`

On-chain checks:

1. `allowedDenominations[poolId]`
2. `isKnownRoot(poolId, root)`
3. `!nullifierUsed[poolId][nullifierHash]`
4. `_verifyMixerProof(root, nullifierHash, recipient, token, denomination, proof)`:
   - Re-encodes the public inputs (`root`, `nullifierHash`, `recipient`, `token`, `denomination`).
   - Computes the zkVerify leaf hash combining:
     - `PROVING_SYSTEM_ID`, `vkHash`, `VERSION_HASH`, and `keccak256(encodedInputs)`.
   - Asks zkVerify to confirm that this leaf is part of the aggregation.

If all checks pass:

- `nullifierUsed[poolId][nullifierHash] = true`
- Funds are transferred to `recipient`:
  - ETH via `call{ value: denomination }`
  - ERC20 via `SafeERC20.safeTransfer`
- `Withdrawal` event is emitted.

---

### Privacy and UX Notes

- **Privacy:**
  - The deposit address is never used in the withdrawal transaction.
  - The withdrawal is sent through a relayer backend.
  - On-chain, observers see:
    - `Deposit(commitment, leafIndex, token, denomination)`
    - `Withdrawal(recipient, nullifierHash, token, denomination)`
  - They cannot link which deposit belongs to which withdrawal.

- **UX considerations:**
  - `findMyDeposits` can become heavy as pools grow:
    - Current implementation uses parallel batches to mitigate latency.
    - Future work:
      - Progressive loading of deposits.
      - Local caching of `n` values per wallet and pool.
  - Recipient selection:
    - By default, the frontend uses the current PolyPay multisig account on the selected network.
    - Users can override with any address for more flexible workflows.
---

### Constants Reference

| Constant | Value |
|----------|-------|
| `TREE_DEPTH` | `20` |
| `ROOT_HISTORY_SIZE` | `30` |
| `BN254_MODULUS` | `21888242871839275222246405745257275088548364400416034343698204186575808495617` |
| `MIXER_SECRET_MESSAGE` | `"polypay-mixer-secret"` |
| `FIND_DEPOSITS_BATCH_SIZE` | `50` |
| `maxN` (computed) | `max(commitments.length * 2, 100)` |