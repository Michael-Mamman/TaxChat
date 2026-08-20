# Stage 1: Builder
FROM node:20-slim AS builder

# Install system dependencies required for native modules (canvas, sharp)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci && npm cache clean --force

# Copy source code and configuration
COPY tsconfig.json ./
COPY src ./src
COPY public ./public

# Build TypeScript to JavaScript
RUN npm run build

# Stage 2: Production
FROM node:20-slim

# Install runtime dependencies for native modules
RUN apt-get update && apt-get install -y --no-install-recommends \
    libcairo2 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libjpeg62-turbo \
    libgif7 \
    librsvg2-2 \
    fonts-dejavu \
    fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user for security
RUN groupadd -r nodejs && useradd -r -g nodejs -m -d /home/nodejs nodejs

# Create app directory and set ownership
RUN mkdir -p /app/uploads && chown -R nodejs:nodejs /app

# Set working directory
WORKDIR /app

# Switch to non-root user
USER nodejs

# Copy package files
COPY --chown=nodejs:nodejs package*.json ./

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy built application from builder stage
COPY --chown=nodejs:nodejs --from=builder /app/dist ./dist
COPY --chown=nodejs:nodejs --from=builder /app/public ./public

# Copy necessary runtime files
COPY --chown=nodejs:nodejs eng.traineddata ./

# Expose application port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
CMD ["node", "dist/app.js"]
