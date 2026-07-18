---
"@atblob/core": patch
---

Fix SSRF protection to stop mutating the process-wide global fetch dispatcher, scoping it to atblob's own outbound requests instead.
