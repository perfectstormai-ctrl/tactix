FROM node:20-alpine
WORKDIR /app
COPY .npmrc .npmrc
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
COPY packages packages/
COPY services/realtime-svc/package.json services/realtime-svc/
RUN pnpm install --filter ./services/realtime-svc --frozen-lockfile --prod
COPY services/realtime-svc/ services/realtime-svc/
WORKDIR /app/services/realtime-svc
CMD ["node", "index.js"]
