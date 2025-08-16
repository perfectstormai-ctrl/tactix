FROM node:20-alpine
WORKDIR /app
COPY .npmrc .npmrc
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
COPY services/warlog-svc/package.json services/warlog-svc/
RUN pnpm install --filter ./services/warlog-svc --frozen-lockfile --prod
COPY services/warlog-svc/ services/warlog-svc/
WORKDIR /app/services/warlog-svc
CMD ["node", "index.js"]
