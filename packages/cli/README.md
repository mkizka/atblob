# atblob

[cdn.bsky.app](https://cdn.bsky.app) 互換の画像CDNサーバーを起動するCLI。

Blueskyの画像CDNと同じURLパス(`/img/{preset}/plain/{did}/{cid}@{format}`)を受け付けるため、クライアント側はホスト名を差し替えるだけで動作します。仕様の詳細は [docs/spec.md](../../docs/spec.md) を参照してください。

## インストール

```sh
npm install -g atblob
```

インストールせずに直接実行することもできます。

```sh
npx atblob
```

## 使い方

```sh
atblob --port 3000 --did-cache redis --redis-url redis://localhost:6379
```

起動後、`SIGINT` / `SIGTERM` を受け取るとサーバーを閉じて終了します。

## オプション

| オプション              | 環境変数              | 説明                                                                                 | デフォルト |
| ----------------------- | --------------------- | ------------------------------------------------------------------------------------ | ---------- |
| `-p, --port`            | `PORT`                | サーバーがリッスンするポート番号                                                     | `3000`     |
| `--did-cache`           | `DID_CACHE`           | DID解決結果のキャッシュ先。`memory` または `redis`                                   | -          |
| `--redis-url`           | `REDIS_URL`           | DIDキャッシュに使用するRedisのURL(`--did-cache` が未指定または `redis` の場合は必須) | -          |
| `--max-blob-size`       | `MAX_BLOB_SIZE`       | 許可する最大blobサイズ(バイト)                                                       | -          |
| `--did-resolve-timeout` | `DID_RESOLVE_TIMEOUT` | DID解決のタイムアウト(ミリ秒)                                                        | -          |
| `--blob-fetch-timeout`  | `BLOB_FETCH_TIMEOUT`  | blob取得のタイムアウト(ミリ秒)                                                       | -          |
| `--plc-directory-url`   | `PLC_DIRECTORY_URL`   | PLC DirectoryのURL                                                                   | -          |

コマンドライン引数は対応する環境変数より優先されます。

## ライセンス

AGPL-3.0
