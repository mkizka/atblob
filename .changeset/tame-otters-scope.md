---
"@atblob/core": patch
---

Fix SSRF protection mutating the process-wide global fetch dispatcher; it's now scoped to only the outbound requests made while resolving a render.
