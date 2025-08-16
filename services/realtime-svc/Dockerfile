FROM node:20-alpine
WORKDIR /app
COPY .npmrc .npmrc
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages ./packages
COPY services/realtime-svc ./services/realtime-svc
RUN pnpm install --frozen-lockfile --filter ./services/realtime-svc...
RUN pnpm --filter ./services/realtime-svc build
WORKDIR /app/services/realtime-svc
EXPOSE ${PORT}
CMD ["node", "index.js"]
