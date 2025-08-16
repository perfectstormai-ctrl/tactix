FROM node:20-alpine
WORKDIR /app
COPY .npmrc .npmrc
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
COPY ui/package.json ui/
RUN pnpm install --filter ./ui --frozen-lockfile --prod
COPY ui/ ui/
WORKDIR /app/ui
CMD ["node", "server.js"]
