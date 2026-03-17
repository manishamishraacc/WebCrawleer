# Use Apify's official Node + Playwright + Chrome base image
FROM apify/actor-node-playwright-chrome:20 AS builder

USER root
WORKDIR /app

# Ensure package files are copied
COPY package*.json ./

# Install all dependencies (including devDependencies for building)
RUN npm install

# Copy source code and config
COPY . .

# Build the TypeScript project
RUN npm run build || npx tsc

# Production stage
FROM apify/actor-node-playwright-chrome:20

USER root
WORKDIR /app

ENV NODE_ENV=production
# In standalone mode, Crawlee dumps to a local dir, we map it
ENV CRAWLEE_STORAGE_DIR=/app/storage
ENV CRAWLEE_PURGE_ON_START=true

# Copy package config and install only production dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy compiled code from builder
COPY --from=builder /app/dist ./dist

# Fix ownership
RUN mkdir -p /app/storage && chown -R myuser:myuser /app

USER myuser

# Expose port
EXPOSE 3000

# Start server
CMD ["node", "dist/index.js"]
