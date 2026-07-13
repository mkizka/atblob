# atblob

<img src="./icon.png" width="120" alt="atblob icon" />

atblob is a [cdn.bsky.app](https://cdn.bsky.app)-compatible image proxy server for atproto.

It accepts the same URL paths as Bluesky's image CDN (`/img/{preset}/plain/{did}/{cid}@{format}`), so clients can switch to it just by swapping the hostname.

## Use cases

- Building atproto applications that don't depend on Bluesky
- Displaying images for accounts banned from Bluesky
- Testing in a local development environment

## Installation

```sh
npm install -g @atblob/cli
```

You can also run it directly without installing.

```sh
npx @atblob/cli
```

A Docker image is also published to GHCR.

```sh
docker run -p 3000:3000 ghcr.io/mkizka/atblob:latest
```

Tags matching the `@atblob/cli` package version (e.g. `1.2.3`) are published alongside `latest`.

## Usage

```sh
atblob --port 3000 --did-cache redis --redis-url redis://localhost:6379
```

Once started, the server shuts down gracefully on `SIGINT` / `SIGTERM`.

## Endpoints

### `GET /img/{preset}/plain/{did}/{cid}@{format}`

| Preset             | Size      | Fit    |
| ------------------ | --------- | ------ |
| `avatar`           | 1000x1000 | cover  |
| `avatar_thumbnail` | 128x128   | cover  |
| `banner`           | 3000x1000 | cover  |
| `feed_thumbnail`   | 2000x2000 | inside |
| `feed_fullsize`    | 1000x1000 | inside |

`{format}` is optional (`jpeg`, `jpg`, `png`, or `webp`; defaults to `webp`).

### `GET /health`

Returns `{ "version": "...", "status": "ok" | "error" }` with a `200` or `503` status.

## Options

| Option                  | Environment variable  | Description                                                                | Default                 |
| ----------------------- | --------------------- | -------------------------------------------------------------------------- | ----------------------- |
| `-p, --port`            | `PORT`                | Port number the server listens on                                          | `3000`                  |
| `--did-cache`           | `DID_CACHE`           | Where to cache DID resolution results. `memory` or `redis`                 | `memory`                |
| `--redis-url`           | `REDIS_URL`           | Redis URL used for the DID cache (required when `--did-cache` is `redis`)  | -                       |
| `--max-blob-size`       | `MAX_BLOB_SIZE`       | Maximum allowed blob size (bytes)                                          | `10485760` (10 MiB)     |
| `--did-resolve-timeout` | `DID_RESOLVE_TIMEOUT` | DID resolution timeout (milliseconds)                                      | `5000`                  |
| `--blob-fetch-timeout`  | `BLOB_FETCH_TIMEOUT`  | Blob fetch timeout (milliseconds)                                          | `15000`                 |
| `--plc-directory-url`   | `PLC_DIRECTORY_URL`   | PLC Directory URL                                                          | `https://plc.directory` |
| `--log-level`           | `LOG_LEVEL`           | Minimum log level to output. `debug`, `info`, `warn`, `error`, or `silent` | `info`                  |
| `--log-format`          | `LOG_FORMAT`          | Log output format. `json` or `pretty`                                      | `pretty`                |

Command-line arguments take precedence over the corresponding environment variables.

## License

AGPL-3.0-only
