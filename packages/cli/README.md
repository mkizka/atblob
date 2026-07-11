# atblob

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
docker run -p 3000:3000 -e DID_CACHE=memory ghcr.io/mkizka/atblob:latest
```

Tags matching the `@atblob/cli` package version (e.g. `1.2.3`) are published alongside `latest`.

## Usage

```sh
atblob --port 3000 --did-cache redis --redis-url redis://localhost:6379
```

Once started, the server shuts down gracefully on `SIGINT` / `SIGTERM`.

## Options

| Option                  | Environment variable  | Description                                                                  | Default                 |
| ----------------------- | --------------------- | ---------------------------------------------------------------------------- | ----------------------- |
| `-p, --port`            | `PORT`                | Port number the server listens on                                            | `3000`                  |
| `--did-cache`           | `DID_CACHE`           | Where to cache DID resolution results. `memory` or `redis`                   | `redis`                 |
| `--redis-url`           | `REDIS_URL`           | Redis URL used for the DID cache (required unless `--did-cache` is `memory`) | -                       |
| `--max-blob-size`       | `MAX_BLOB_SIZE`       | Maximum allowed blob size (bytes)                                            | `10485760` (10 MiB)     |
| `--did-resolve-timeout` | `DID_RESOLVE_TIMEOUT` | DID resolution timeout (milliseconds)                                        | `5000`                  |
| `--blob-fetch-timeout`  | `BLOB_FETCH_TIMEOUT`  | Blob fetch timeout (milliseconds)                                            | `15000`                 |
| `--plc-directory-url`   | `PLC_DIRECTORY_URL`   | PLC Directory URL                                                            | `https://plc.directory` |

Command-line arguments take precedence over the corresponding environment variables.

## License

AGPL-3.0-only
