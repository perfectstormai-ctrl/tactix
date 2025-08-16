FROM node:20-alpine
WORKDIR /app
COPY .npmrc .npmrc
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
COPY services/auth-svc/package.json services/auth-svc/
RUN pnpm install --filter ./services/auth-svc --frozen-lockfile --prod
COPY services/auth-svc/ services/auth-svc/
WORKDIR /app/services/auth-svc
CMD ["node", "index.js"]
