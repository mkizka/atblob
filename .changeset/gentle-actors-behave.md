---
"@atblob/core": patch
"@atblob/cli": patch
---

Prioritize Redis for the DID cache whenever a Redis URL is configured, ignoring the `didCache`/`--did-cache` setting
