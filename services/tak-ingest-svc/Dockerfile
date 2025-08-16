FROM node:20-alpine
WORKDIR /app
COPY .npmrc .npmrc
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages ./packages
COPY services/tak-ingest-svc ./services/tak-ingest-svc
RUN pnpm install --frozen-lockfile --filter ./services/tak-ingest-svc...
RUN pnpm --filter ./services/tak-ingest-svc build
WORKDIR /app/services/tak-ingest-svc
EXPOSE ${PORT}
CMD ["node", "index.js"]
