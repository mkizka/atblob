# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

atblob is an OSS implementation that replaces Bluesky's image CDN (cdn.bsky.app). The goal is to accept the same URL paths and work with only a hostname swap.

## Implementation rules

After making changes, always run the following command to verify them.

```sh
$ pnpm all # runs build, typecheck, format, and test
```

## Commit messages

Write commit messages in English.
