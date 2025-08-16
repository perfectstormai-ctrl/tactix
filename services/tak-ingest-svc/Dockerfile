FROM node:20-alpine
WORKDIR /app
COPY .npmrc .npmrc
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
COPY services/tak-ingest-svc/package.json services/tak-ingest-svc/
RUN pnpm install --filter ./services/tak-ingest-svc --frozen-lockfile --prod
COPY services/tak-ingest-svc/ services/tak-ingest-svc/
WORKDIR /app/services/tak-ingest-svc
CMD ["node", "index.js"]
