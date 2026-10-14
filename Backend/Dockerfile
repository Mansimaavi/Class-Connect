# syntax=docker/dockerfile:1

# ---- dependencies (production only) ----
FROM node:26-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

# ---- runtime ----
FROM node:26-alpine
ENV NODE_ENV=production \
    PORT=5000
WORKDIR /app

# tini forwards SIGTERM so the server can shut down gracefully
RUN apk add --no-cache tini

COPY --from=deps /app/node_modules ./node_modules
COPY --chown=node:node . .

USER node
EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:5000/api/health > /dev/null || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "index.js"]
