# ===== STAGE 1: DEPS =====
# Install all dependencies and generate Prisma client
FROM node:24-alpine AS deps
WORKDIR /app

RUN corepack enable

# Copy yarn config
COPY .yarnrc.yml ./
COPY .yarn ./.yarn

# Copy package files
COPY package.json yarn.lock ./
COPY packages/shared ./packages/shared
COPY packages/backend ./packages/backend

# Copy package.json of other workspaces (yarn needs to resolve all)
COPY packages/nextjs/package.json ./packages/nextjs/
COPY packages/hardhat/package.json ./packages/hardhat/

# Clean up local artifacts and install
RUN rm -rf packages/shared/node_modules \
    packages/backend/node_modules \
    packages/shared/dist \
    packages/backend/dist && \
    yarn install --immutable

# Generate Prisma client
RUN DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" \
    yarn workspace @polypay/backend prisma generate


# ===== STAGE 2: BUILDER =====
# Build shared and backend packages
FROM node:24-alpine AS builder
WORKDIR /app

RUN corepack enable

# Copy yarn config and package files
COPY .yarnrc.yml ./
COPY .yarn ./.yarn
COPY --from=deps /app/package.json ./
COPY --from=deps /app/yarn.lock ./

# Copy node_modules from deps
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/packages/backend/node_modules ./packages/backend/node_modules

# Copy source code
COPY packages/shared ./packages/shared
COPY packages/backend ./packages/backend

# Copy generated prisma client from deps stage
COPY --from=deps /app/packages/backend/src/generated ./packages/backend/src/generated

# Build shared first, then backend
RUN yarn workspace @polypay/shared build && \
    yarn workspace @polypay/backend build


# ===== STAGE 3: RUNNER =====
# Production image
FROM node:24-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

# Copy node_modules with correct ownership
COPY --chown=nestjs:nodejs --from=deps /app/node_modules ./node_modules
COPY --chown=nestjs:nodejs --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --chown=nestjs:nodejs --from=deps /app/packages/backend/node_modules ./packages/backend/node_modules

# Copy package.json
COPY --chown=nestjs:nodejs --from=builder /app/packages/shared/package.json ./packages/shared/
COPY --chown=nestjs:nodejs --from=builder /app/packages/backend/package.json ./packages/backend/

# Copy built output
COPY --chown=nestjs:nodejs --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --chown=nestjs:nodejs --from=builder /app/packages/backend/dist ./packages/backend/dist

# Copy prisma files
COPY --chown=nestjs:nodejs --from=builder /app/packages/backend/prisma ./packages/backend/prisma
COPY --chown=nestjs:nodejs --from=builder /app/packages/backend/prisma.config.ts ./packages/backend/

# Copy assets folder
COPY --chown=nestjs:nodejs --from=builder /app/packages/backend/assets ./packages/backend/assets

USER nestjs

WORKDIR /app/packages/backend

EXPOSE 4000

CMD ["sh", "-c", "npx prisma migrate deploy && yarn start:prod"]
