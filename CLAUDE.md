# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

atblob is an OSS implementation that replaces Bluesky's image CDN (cdn.bsky.app). The goal is to accept the same URL paths and work with only a hostname swap.

## Implementation rules

After making changes, always run the following command to verify them.

```sh
$ pnpm all # runs build, typecheck, format, and test
```

## Commit messages and PR titles

Write commit messages and PR titles in English.

## Changesets

When creating a PR, add a changeset that matches the change (`pnpm changeset`), unless the change has no user-facing effect (e.g. docs-only or internal tooling changes).

Write the changeset text to match the message part of the PR title.
