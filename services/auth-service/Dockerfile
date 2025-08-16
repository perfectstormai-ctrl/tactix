FROM node:20-alpine
WORKDIR /app
COPY .npmrc .npmrc
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages ./packages
COPY services/auth-service ./services/auth-service
RUN pnpm install --frozen-lockfile --filter ./services/auth-service...
RUN pnpm --filter ./services/auth-service build
WORKDIR /app/services/auth-service
EXPOSE ${PORT}
CMD ["node", "index.js"]
