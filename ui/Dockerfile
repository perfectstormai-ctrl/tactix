FROM node:20-alpine
WORKDIR /app
COPY .npmrc .npmrc
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages ./packages
COPY ui ./ui
RUN pnpm install --frozen-lockfile --filter ./ui...
RUN pnpm --filter ./ui build
WORKDIR /app/ui
EXPOSE ${PORT}
CMD ["node", "server.js"]
