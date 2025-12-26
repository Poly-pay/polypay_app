# ===== STAGE 1: DEPS =====
# Install all dependencies for yarn workspace
FROM node:24-alpine AS deps
WORKDIR /app

# Enable corepack for yarn 3.x
RUN corepack enable

# Copy yarn config and releases from local
COPY .yarnrc.yml ./
COPY .yarn ./.yarn

# Copy root package files
COPY package.json yarn.lock ./

# Copy packages needed for frontend
COPY packages/shared ./packages/shared
COPY packages/nextjs ./packages/nextjs

# Copy package.json of other workspaces (yarn needs to resolve all)
COPY packages/backend/package.json ./packages/backend/
COPY packages/hardhat/package.json ./packages/hardhat/

# Clean up any local artifacts
RUN rm -rf packages/shared/node_modules \
    packages/nextjs/node_modules \
    packages/nextjs/.next \
    packages/shared/dist

RUN yarn install --immutable


# ===== STAGE 2: BUILDER =====
# Build shared and frontend packages
FROM node:24-alpine AS builder
WORKDIR /app

RUN corepack enable

# Copy yarn config
COPY .yarnrc.yml ./
COPY .yarn ./.yarn
COPY --from=deps /app/package.json ./
COPY --from=deps /app/yarn.lock ./

# Copy node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/packages/nextjs/node_modules ./packages/nextjs/node_modules

# Copy source code
COPY packages/shared ./packages/shared
COPY packages/nextjs ./packages/nextjs

# Build arguments
ARG NEXT_PUBLIC_API_URL
ARG STANDALONE=true

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV STANDALONE=$STANDALONE

# Build shared first (frontend depends on it)
RUN yarn workspace @polypay/shared build

# Build frontend with standalone output
RUN yarn workspace @polypay/frontend build


# ===== STAGE 3: RUNNER =====
# Minimal production image
FROM node:24-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone output (includes minimal node_modules)
COPY --from=builder --chown=nextjs:nodejs /app/packages/nextjs/.next/standalone ./

# Copy static files (not included in standalone)
COPY --from=builder --chown=nextjs:nodejs /app/packages/nextjs/.next/static ./packages/nextjs/.next/static

# Copy public folder and remove unnecessary files
COPY --from=builder --chown=nextjs:nodejs /app/packages/nextjs/public ./packages/nextjs/public
RUN rm -rf ./packages/nextjs/public/circuit

USER nextjs

EXPOSE 3000

ENV HOSTNAME="0.0.0.0"
ENV PORT=3000

CMD ["node", "packages/nextjs/server.js"]
