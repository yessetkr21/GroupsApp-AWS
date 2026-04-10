FROM node:20-alpine

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

WORKDIR /app

# Copy package files and install production dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy source code and proto definitions
COPY src/ ./src/
COPY migrations/ ./migrations/
COPY proto/ ./proto/

# Create logs directory
RUN mkdir -p /app/logs && chown node:node /app/logs

# Run as non-root user
USER node

EXPOSE 3000

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "src/index.js"]
