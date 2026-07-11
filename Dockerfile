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
RUN pnpm deploy --filter=@atblob/cli --prod /app/deploy \
  && rm -rf /app/deploy/node_modules/.pnpm/typescript@* /app/deploy/node_modules/.pnpm/@types+node@* \
  && find /app/deploy/node_modules -type f \( -name '*.d.ts' -o -name '*.d.mts' -o -name '*.d.cts' -o -name '*.map' \) -delete

FROM gcr.io/distroless/nodejs24-debian12:nonroot AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/deploy .

EXPOSE 3000
CMD ["dist/index.js"]
