FROM node:24-alpine

WORKDIR /app

# Copy package files first (better cache)
COPY package.json yarn.lock ./
COPY packages/backend/package.json ./packages/backend/

# Install dependencies
RUN yarn install --frozen-lockfile

# Copy source code
COPY packages/backend ./packages/backend

# Generate Prisma client and build
RUN yarn workspace backend prisma generate
RUN yarn workspace backend build

# Set working directory
WORKDIR /app/packages/backend

EXPOSE 4000

CMD ["sh", "-c", "npx prisma migrate deploy && yarn start:prod"]