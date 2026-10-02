# Multi-stage build for Node.js server
#
# NOTE: this must be a glibc (Debian) image, not Alpine. Pronunciation scoring
# decodes audio with the ffmpeg-static package, which ships a single
# glibc-linked ffmpeg-linux-x64 binary. On musl/Alpine its install script still
# "succeeds" (it only downloads and chmods, it never runs the binary), so the
# breakage would not show up until an m4a/AAC upload failed at runtime.
#
# Stage 1: Build
FROM node:18-slim AS builder

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
FROM node:18-slim AS production

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apt-get update && \
    apt-get install -y --no-install-recommends dumb-init && \
    rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd --system --gid 1001 appgroup && \
    useradd --system --uid 1001 --gid 1001 --no-create-home appuser

# Copy package files
COPY server/package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev && \
    npm cache clean --force

# Fail the build now rather than on the first real recording if the ffmpeg
# binary is missing, wrong, or unrunnable in this image.
RUN node -e "const p=require('ffmpeg-static');const{execFileSync}=require('child_process');execFileSync(p,['-version'],{stdio:'ignore'});console.log('ffmpeg-static OK:',p)"

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
