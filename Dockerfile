# ---------- deps ----------
  FROM node:20-alpine AS deps
  WORKDIR /app
  
  RUN apk add --no-cache libc6-compat openssl
  
  COPY package.json package-lock.json* ./
  RUN npm ci
  
  # ---------- builder ----------
  FROM node:20-alpine AS builder
  WORKDIR /app
  
  RUN apk add --no-cache libc6-compat openssl
  
  COPY --from=deps /app/node_modules ./node_modules
  COPY . .
  
  ENV NEXT_TELEMETRY_DISABLED=1
  
  # prisma precisa que DATABASE_URL exista (não precisa conectar)
  ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy?schema=public"
  
  # gera prisma client
  RUN npx prisma generate
  
  # build next (precisa estar com output: "standalone")
  RUN npm run build
  
  # ---------- runner ----------
  FROM node:20-alpine AS runner
  WORKDIR /app
  
  ENV NODE_ENV=production
  ENV NEXT_TELEMETRY_DISABLED=1
  ENV PORT=3000
  ENV HOSTNAME=0.0.0.0
  
  RUN apk add --no-cache openssl
  
  # cria user não-root
  RUN addgroup -S nodejs && adduser -S nextjs -G nodejs
  USER nextjs
  
  # Next.js standalone: primeiro o output, depois static e public (conforme documentação)
  COPY --from=builder /app/.next/standalone ./
  COPY --from=builder /app/.next/static ./.next/static
  COPY --from=builder /app/public ./public
  
  EXPOSE 3000
  
  CMD ["node", "server.js"]
  