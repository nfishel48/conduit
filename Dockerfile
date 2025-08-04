FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY vite.config.ts ./
COPY tsconfig.json ./
RUN yarn install
COPY . .
RUN yarn build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/package.json ./package.json
RUN yarn install --production
COPY --from=builder /app/dist ./dist

CMD [ "node", "dist/index.js" ]

