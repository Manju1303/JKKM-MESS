# ─── Stage 1: Build ───────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install openssl & libc6-compat & ca-certificates for compatibility and TLS/SSL connections on Alpine
RUN apk add --no-cache openssl libc6-compat ca-certificates

# Copy dependency files first (layer cache optimisation)
COPY package*.json ./
COPY prisma ./prisma/

# Install ALL deps (including devDeps like @nestjs/cli, ts-node, prisma)
RUN npm ci

# Generate Prisma client
RUN npx prisma generate

# Copy source and compile TypeScript → dist/
COPY . .
RUN npm run build

# Compile the seed script to JS for production (avoids ts-node dependency)
RUN npx tsc prisma/seed.ts --outDir dist/prisma --module commonjs --target es2021 --skipLibCheck

# ─── Stage 2: Production ──────────────────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

# Install openssl & libc6-compat & ca-certificates for compatibility and TLS/SSL connections on Alpine
RUN apk add --no-cache openssl libc6-compat ca-certificates

# Copy dependency files
COPY package*.json ./
COPY prisma ./prisma/

# Install production deps only
RUN npm ci --omit=dev

# Generate Prisma client in production stage
RUN npx prisma generate

# Copy compiled output from builder
COPY --from=builder /app/dist ./dist

EXPOSE 3001

# Run migrations, then start the app
CMD npx prisma migrate deploy && node dist/src/main
