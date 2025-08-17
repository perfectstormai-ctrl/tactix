FROM node:20-alpine
WORKDIR /app
COPY .npmrc .npmrc
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages ./packages
COPY orders-templates ./orders-templates
COPY services/orders-svc ./services/orders-svc
RUN pnpm install --frozen-lockfile --filter ./services/orders-svc...
RUN pnpm --filter ./services/orders-svc build
WORKDIR /app/services/orders-svc
EXPOSE ${PORT}
CMD ["node", "dist/index.js"]
