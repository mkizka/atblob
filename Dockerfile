FROM node:26-slim AS base
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
ENV MALLOC_ARENA_MAX=2
ENV MALLOC_TRIM_THRESHOLD_=131072
ENV MALLOC_MMAP_THRESHOLD_=131072
ENV BLOB_CACHE_MAX_BYTES=0
COPY --from=builder /app/deploy .

EXPOSE 3000
CMD ["dist/bin.js"]
