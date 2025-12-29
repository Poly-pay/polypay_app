# Getting Started

### Prerequisites

- Node.js v18+
- Yarn package manager
- Docker (recommended)

## Quick Start

### Option 1: Docker (Recommended)

```bash
# 1. Clone the repository
git clone git@github.com:Poly-pay/polypay_app.git
cd polypay_app

# 2. Setup environment
cp docker/.env.example docker/.env
# Edit docker/.env and fill in:
# - POSTGRES_PASSWORD
# - RELAYER_ZKVERIFY_API_KEY
# - RELAYER_WALLET_KEY

# 3. Run with Docker Compose
cd docker
docker compose up -d

# 4. Access the application
# Frontend: http://localhost:3000
# Backend: http://localhost:4000
```

### Option 2: Manual Setup

```bash
# 1. Clone the repository
git clone clone git@github.com:Poly-pay/polypay_app.git
cd polypay_app

# 2. Install dependencies
yarn install

# 3. Frontend Setup
cp packages/nextjs/.env.example packages/nextjs/.env

# 4. Backend Setup
cd packages/backend

# Start PostgreSQL with Docker
docker compose up -d postgres

# Setup environment
cp .env.example .env
# Edit .env and fill in your keys

# Run database migrations
npx prisma migrate dev
npx prisma generate

cd ../..

# 5. Build application
yarn build

# 6. Run the Application
# Terminal 1: Start backend
yarn start:backend

# Terminal 2: Start frontend
yarn start:frontend
```

### Environment Variables

| Variable                   | Description                    |
| -------------------------- | ------------------------------ |
| `DATABASE_URL`             | PostgreSQL connection string   |
| `RELAYER_WALLET_KEY`       | Private key for relayer wallet |
| `RELAYER_ZKVERIFY_API_KEY` | API key from zkVerify          |
| `NEXT_PUBLIC_API_URL`      | Backend API URL                |

### User Workflow

1. **Connect Wallet**: Connect your Ethereum wallet
2. **Generate Identity**: Sign a message to create your secret
3. **Create/Join Wallet**: Deploy new multisig or join existing one
4. **Propose Transaction**: Create transfer and generate ZK proof
5. **Sign**: Other signers approve with their ZK proofs
6. **Execute**: When threshold reached, execute the transaction
