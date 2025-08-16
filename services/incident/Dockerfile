FROM node:20-alpine
WORKDIR /app
COPY .npmrc .npmrc
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
COPY services/incident/package.json services/incident/
RUN pnpm install --filter ./services/incident --frozen-lockfile
COPY services/incident/tsconfig.json services/incident/
COPY services/incident/src services/incident/src
RUN pnpm --filter ./services/incident build
EXPOSE 3000
CMD ["node", "services/incident/dist/index.js"]
