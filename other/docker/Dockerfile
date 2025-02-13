# [🐋] Dockerfile

# Build stage
FROM node:20-slim AS builder
WORKDIR /usr/app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM node:20-slim
WORKDIR /usr/app
COPY --from=builder /usr/app/dist ./dist
COPY --from=builder /usr/app/package*.json ./
COPY --from=builder /usr/app/books ./books
RUN npm ci --only=production

ENV NODE_ENV=production
ENV PATH="/usr/app/node_modules/.bin:${PATH}"

EXPOSE 4460
CMD ["ptbk", "start-server", "--port", "4460"]
