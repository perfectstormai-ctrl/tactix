FROM node:20-alpine
WORKDIR /app
COPY .npmrc .npmrc
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages ./packages
COPY services/bootstrap-svc ./services/bootstrap-svc
RUN pnpm install --frozen-lockfile --filter ./services/bootstrap-svc...
RUN pnpm --filter ./services/bootstrap-svc build
WORKDIR /app/services/bootstrap-svc
EXPOSE ${PORT}
CMD ["node", "dist/index.js"]
