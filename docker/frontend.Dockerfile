FROM node:24-alpine

# Accept build arguments
ARG NEXT_PUBLIC_API_URL

# Set as environment variables
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

WORKDIR /app

# Enable corepack for yarn 3.x
RUN corepack enable

# Configure yarn to use node-modules instead of PnP
RUN echo 'nodeLinker: node-modules' > .yarnrc.yml

# Copy all package.json files
COPY package.json yarn.lock ./
COPY packages/shared ./packages/shared
COPY packages/nextjs ./packages/nextjs

# Remove any local node_modules that might have been copied
RUN rm -rf /app/packages/shared/node_modules \
    /app/packages/nextjs/node_modules \
    /app/packages/nextjs/.next

# Install dependencies (single hoisted node_modules)
RUN yarn install

# Build shared package first
RUN yarn workspace @polypay/shared build

# Build frontend
RUN yarn workspace @polypay/frontend build

# Set working directory
WORKDIR /app/packages/nextjs

EXPOSE 3000

CMD ["yarn", "start"]
