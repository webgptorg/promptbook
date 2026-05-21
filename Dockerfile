# [🐋] Dockerfile

FROM node:22-slim

WORKDIR /usr/app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# DockerHub should publish the production Agents Server by default.
ENV NEXT_PUBLIC_SITE_URL=http://localhost:4440
RUN npm run build --prefix apps/agents-server

ENV NODE_ENV=production

EXPOSE 4440

CMD ["npx", "ts-node", "./src/cli/test/ptbk.ts", "agents-server", "start"]

# TODO: [🚑] This file should be meybe in `/packages/docker/...`
# TODO:
