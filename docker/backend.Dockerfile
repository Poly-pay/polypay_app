FROM node:24-alpine

WORKDIR /app

# Enable corepack for yarn 3.x
RUN corepack enable

# Copy package files first (better cache)
COPY package.json yarn.lock ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/backend/package.json ./packages/backend/

# Configure yarn to use node-modules instead of PnP
RUN echo 'nodeLinker: node-modules' > .yarnrc.yml

# Install dependencies
RUN yarn install

# Copy shared source and build first
COPY packages/shared ./packages/shared
RUN yarn workspace @polypay/shared build

# Copy backend source
COPY packages/backend ./packages/backend

# Generate Prisma client and build backend
RUN yarn workspace @polypay/backend prisma generate
RUN yarn workspace @polypay/backend build

# Set working directory
WORKDIR /app/packages/backend

EXPOSE 4000

CMD ["sh", "-c", "npx prisma migrate deploy && yarn start:prod"]
