# Hub Next – Dockerfile para Dokploy (Next.js standalone)
# Build: docker build -t hub-next .
# Run: docker run -p 3000:3000 -e DATABASE_URL=... -e NEXTAUTH_SECRET=... hub-next
# Migrations: docker run --rm -e DATABASE_URL=... hub-next npx prisma migrate deploy

FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache libc6-compat ca-certificates openssl
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# prisma generate exige DATABASE_URL (prisma.config.ts); no build usamos dummy; em runtime o Dokploy injeta o real.
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy?schema=public"
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN apk add --no-cache ca-certificates openssl
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]
