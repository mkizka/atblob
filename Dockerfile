FROM node:24-slim AS base
RUN corepack enable

FROM base AS pruner
WORKDIR /app
COPY . .
RUN npx turbo@2.10.4 prune @atblob/cli --docker

FROM base AS builder
WORKDIR /app
COPY --from=pruner /app/out/json/ .
RUN pnpm install --frozen-lockfile
COPY --from=pruner /app/out/full/ .
COPY tsconfig.base.json ./tsconfig.base.json
RUN pnpm turbo run build --filter=@atblob/cli
RUN pnpm deploy --filter=@atblob/cli --prod /app/deploy

FROM gcr.io/distroless/nodejs24-debian12:nonroot AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV LOG_FORMAT=json
COPY --from=builder /app/deploy .

EXPOSE 3000
CMD ["dist/index.js"]
