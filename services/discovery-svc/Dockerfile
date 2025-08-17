FROM node:20-alpine
WORKDIR /app
COPY .npmrc .npmrc
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages ./packages
COPY services/discovery-svc ./services/discovery-svc
RUN pnpm install --frozen-lockfile --filter ./services/discovery-svc...
RUN pnpm --filter ./services/discovery-svc build
WORKDIR /app/services/discovery-svc
EXPOSE ${PORT}
CMD ["node", "dist/index.js"]
