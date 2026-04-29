# syntax=docker/dockerfile:1.7

FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1

# Server Action stability across rebuilds — sem isso, todo deploy invalida
# tabs abertas com "Failed to find Server Action".
ARG NEXT_SERVER_ACTIONS_ENCRYPTION_KEY
ARG DEPLOYMENT_ID
ENV NEXT_SERVER_ACTIONS_ENCRYPTION_KEY=${NEXT_SERVER_ACTIONS_ENCRYPTION_KEY}
ENV DEPLOYMENT_ID=${DEPLOYMENT_ID:-build-placeholder}

# Se DEPLOYMENT_ID não veio via build arg, gera um timestamp único por build
RUN if [ "$DEPLOYMENT_ID" = "build-placeholder" ]; then \
      export DEPLOYMENT_ID="build-$(date +%s)"; \
    fi && \
    npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
