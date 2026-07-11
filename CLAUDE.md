# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

atcdn は Blueskyの画像CDN(cdn.bsky.app)を代替するOSS実装。同じURLパスを受け付け、ホスト名の差し替えだけで動くことが目標。

## ドキュメント

- [docs/spec.md](docs/spec.md)
  - 仕様について不明点がある時に読む

## 実装ルール

変更後は以下のコマンドを実行して必ず検証を行うこと。

```sh
$ pnpm all # build typecheck format testを実行する
```

## CLI Development

When creating command-line interfaces, use the `use-gunshi-cli` skill.
