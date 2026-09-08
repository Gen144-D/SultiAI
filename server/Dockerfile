# Multi-stage build for Node.js server
# Stage 1: Build
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY server/package*.json ./server/

# Install dependencies
RUN npm ci --workspace=server
RUN cd server && npm ci

# Copy source code
COPY server/ ./server/

# Build TypeScript
RUN cd server && npm run build

# Stage 2: Production
FROM node:18-alpine AS production

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup

# Copy package files
COPY server/package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev && \
    npm cache clean --force

# Copy built application
COPY --from=builder /app/server/dist ./dist

# Copy necessary files
COPY server/drizzle.config.ts ./
COPY server/migrations ./migrations

# Change ownership
RUN chown -R appuser:appgroup /app

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
