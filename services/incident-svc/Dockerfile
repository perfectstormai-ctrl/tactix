FROM node:20-alpine
WORKDIR /app
COPY .npmrc .npmrc
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages ./packages
COPY services/incident-svc ./services/incident-svc
RUN pnpm install --frozen-lockfile --filter ./services/incident-svc...
RUN pnpm --filter ./services/incident-svc build
WORKDIR /app/services/incident-svc
EXPOSE ${PORT}
CMD ["node", "dist/index.js"]
