# Multi-stage Dockerfile optimized for Google Cloud Run
# Stage 1: Build Vite frontend and compile backend
FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install all dependencies for building
RUN npm install

# Copy source code and configuration files
COPY . .

# Build the client SPA into dist/ and bundle server.ts into dist/server.cjs
RUN npm run build

# Stage 2: Production runtime image
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

# Copy package manifests and install production dependencies only
COPY package*.json ./
RUN npm install --omit=dev && npm cache clean --force

# Copy compiled frontend and bundled server from the builder stage
COPY --from=builder /app/dist ./dist

# Copy optional firebase config if present
COPY --from=builder /app/firebase-applet-config.json* ./

# Cloud Run communicates over the container port exposed here
EXPOSE 8080

# Start production server
CMD ["node", "dist/server.cjs"]
