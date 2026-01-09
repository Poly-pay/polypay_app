# Database Connection Guide

This guide explains how to connect to the PolyPay PostgreSQL database and perform basic operations.

## Table of Contents

1. [Database Overview](#database-overview)
2. [Connection Methods](#connection-methods)
3. [Basic SQL Queries](#basic-sql-queries)
4. [Useful Commands](#useful-commands)
5. [Troubleshooting](#troubleshooting)

---

## Database Overview

PolyPay uses **PostgreSQL 16** as its database, managed by **Prisma ORM**.

### Database Configuration

- **Host**: `localhost`
- **Port**: `5433` (mapped from container port 5432)
- **Database**: `polypay_multisig_db`
- **User**: `polypay_user`
- **Password**: `polypay_password`
- **Connection String**:
  ```
  postgresql://polypay_user:polypay_password@localhost:5433/polypay_multisig_db
  ```

### Database Tables

The database contains 12 tables:

- `users` - User accounts with commitment-based identity
- `accounts` - Multi-signature accounts
- `account_signers` - Many-to-many relationship between users and accounts
- `transactions` - Transaction records (TRANSFER, BATCH, ADD_SIGNER, etc.)
- `votes` - ZK proof votes for transactions
- `batch_items` - Items in batch payments
- `contacts` - Saved recipient addresses
- `contact_groups` - Contact groups
- `contact_group_entries` - Many-to-many relationship between contacts and groups
- `notifications` - User notifications
- `reserved_nonces` - Temporary nonce reservations (2-min TTL)
- `_prisma_migrations` - Migration history

---

## Connection Methods

### Method 1: Direct Connection with psql

If you have PostgreSQL client installed locally:

```bash
psql postgresql://polypay_user:polypay_password@localhost:5433/polypay_multisig_db
```

Or using individual parameters:

```bash
PGPASSWORD=polypay_password psql -h localhost -p 5433 -U polypay_user -d polypay_multisig_db
```

### Method 2: Docker Exec

Connect via the Docker container:

```bash
docker exec -it polypay-postgres-db psql -U polypay_user -d polypay_multisig_db
```

### Method 3: Prisma Studio (GUI)

Open a visual database browser:

```bash
cd packages/backend
npx prisma studio
```

This opens a web interface at `http://localhost:51212`


---

## Basic SQL Queries

Once connected to the database, you can run these queries:

### List All Tables

```sql
\dt
```

**Expected Output:**
```
                 List of relations
 Schema |         Name          | Type  |    Owner     
--------+-----------------------+-------+--------------
 public | _prisma_migrations    | table | polypay_user
 public | account_signers       | table | polypay_user
 public | accounts              | table | polypay_user
 public | batch_items           | table | polypay_user
 public | contact_group_entries | table | polypay_user
 public | contact_groups        | table | polypay_user
 public | contacts              | table | polypay_user
 public | notifications         | table | polypay_user
 public | reserved_nonces       | table | polypay_user
 public | transactions          | table | polypay_user
 public | users                 | table | polypay_user
 public | votes                 | table | polypay_user
(12 rows)
```

### Count Records in Each Table

```sql
SELECT
    'users' as table_name,
    COUNT(*) as row_count
FROM "users"
UNION ALL
SELECT 'accounts', COUNT(*) FROM "accounts"
UNION ALL
SELECT 'transactions', COUNT(*) FROM "transactions"
UNION ALL
SELECT 'votes', COUNT(*) FROM "votes"
UNION ALL
SELECT 'batch_items', COUNT(*) FROM "batch_items"
UNION ALL
SELECT 'contacts', COUNT(*) FROM "contacts";
```

**Sample Output:**
```
  table_name  | row_count 
--------------+-----------
 users        |         2
 accounts     |         1
 transactions |         1
 votes        |         1
 batch_items  |         0
 contacts     |         1
```

---

## Useful Commands

### psql Meta-Commands

These commands work inside the `psql` terminal:

| Command | Description |
|---------|-------------|
| `\dt` | List all tables |
| `\d "TableName"` | Describe table structure |
| `\l` | List all databases |
| `\du` | List database users |
| `\c dbname` | Connect to different database |
| `\q` | Quit psql |
| `\?` | Show all psql commands |
| `\h` | Show SQL command help |


## Troubleshooting

### Problem: Connection Refused

**Error:**
```
psql: error: connection to server at "localhost" (127.0.0.1), port 5433 failed: Connection refused
```

**Solutions:**

1. Check if PostgreSQL container is running:
   ```bash
   docker ps | grep postgres
   ```

2. If not running, start it:
   ```bash
   cd packages/backend
   docker-compose up -d postgres
   ```

3. Check if port 5433 is available:
   ```bash
   lsof -i :5433
   ```

### Problem: Authentication Failed

**Error:**
```
psql: error: connection to server at "localhost", port 5433 failed: FATAL: password authentication failed
```

**Solutions:**

1. Verify credentials in `.env` file:
   ```bash
   cd packages/backend
   cat .env | grep DATABASE_URL
   ```

2. Ensure using correct password: `polypay_password`

### Problem: Database Does Not Exist

**Error:**
```
psql: error: database "polypay_multisig_db" does not exist
```

**Solutions:**

1. Create database:
   ```bash
   docker exec -it polypay-postgres-db createdb -U polypay_user polypay_multisig_db
   ```

2. Run migrations:
   ```bash
   cd packages/backend
   npx prisma migrate deploy
   ```

### Problem: Tables Not Found

**Error:**
```
ERROR: relation "Account" does not exist
```

**Solutions:**

1. Run Prisma migrations:
   ```bash
   cd packages/backend
   npx prisma migrate dev
   ```

2. Generate Prisma client:
   ```bash
   npx prisma generate
   ```

### Problem: Permission Denied

**Error:**
```
ERROR: permission denied for table Account
```

**Solution:**

Grant permissions to user:
```sql
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO polypay_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO polypay_user;
```

---

## Quick Reference

### Connection String Format

```
postgresql://[user]:[password]@[host]:[port]/[database]
postgresql://polypay_user:polypay_password@localhost:5433/polypay_multisig_db
```

### Common Query Patterns

**Select all:**
```sql
SELECT * FROM "users";
```

**Sample Output:**
```
           id           |                         commitment                          | name  |         createdAt          |         updatedAt
------------------------+-------------------------------------------------------------+-------+----------------------------+----------------------------
 cmjqwz6ma0000z30g7n5x7mng | 11929693182900301036129064097584397649043495813248127264764... | NULL  | 2025-12-29T01:46:24.322Z  | 2025-12-29T01:46:24.322Z
 cmjqx0lso0003z30g7mwgqw4t | 14477441120600890950319476616048398915250246163026472112136... | NULL  | 2025-12-29T01:47:30.648Z  | 2025-12-29T01:47:30.648Z
 cmjs9mv6u00043h0gwqz2eqbq | 60277843965429234127374181712568449813557139821167903709222... | NULL  | 2025-12-30T00:28:30.822Z  | 2025-12-30T00:28:30.822Z
 cmk23wr5d0009td0g9o6kbb53a | 83168478697521869364693811390424592439717889897640643770797... | me    | 2026-01-05T21:45:56.209Z  | 2026-01-05T22:16:18.148Z
 cmk26xi6e0002h10g835bdtj4 | 18712425590517920354542306734510523399880577119526949113387... | iAm   | 2026-01-05T23:10:30.086Z  | 2026-01-05T23:10:56.310Z
 cmk29lsla0000qb0gqsrdy54p | 13375761036262685922334882354442561603957609274167850327536... | MelAm | 2026-01-06T00:25:22.557Z  | 2026-01-06T03:24:07.054Z
 cmk3hhnqx0000rp0gdkgg41bk | 17521970379075944069981168887327936307280396119960104090322... | me    | 2026-01-06T20:53:52.761Z  | 2026-01-06T21:07:56.116Z
(7 rows)
```

**Select specific columns:**
```sql
SELECT id, name, "createdAt" FROM "users";
```

**Filter results:**
```sql
SELECT * FROM "transactions" WHERE status = 'PENDING';
```

**Order results:**
```sql
SELECT * FROM "transactions" ORDER BY "createdAt" DESC;
```

**Limit results:**
```sql
SELECT * FROM "users" LIMIT 10;
```

**Count rows:**
```sql
SELECT COUNT(*) FROM "accounts";
```

---

## Additional Resources

- [Prisma Documentation](https://www.prisma.io/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/16/)
- [Prisma Schema Reference](../packages/backend/prisma/schema.prisma)
- [API Documentation](./api-documentation.md)

---

