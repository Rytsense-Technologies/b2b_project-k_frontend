FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# INFRA-012: npm ci timed out (ETIMEDOUT) on slow links - longer fetch timeout and more retries.
RUN npm ci --fetch-timeout=600000 --fetch-retries=5 --fetch-retry-maxtimeout=120000

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.js ./next.config.js
COPY --from=builder /app/public ./public
# next start writes its image cache under .next/cache, so only .next belongs to the app user; the rest stays root-owned.
COPY --from=builder --chown=node:node /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:3000/auth/login
CMD ["npm", "run", "start"]