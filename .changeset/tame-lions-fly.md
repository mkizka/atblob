---
"@atblob/core": minor
"@atblob/express": minor
"@atblob/hono": minor
---

`Renderer.render()` now returns the transformed image bytes and content type instead of pre-built response headers. Response headers (Cache-Control, X-Content-Type-Options, Content-Security-Policy, Content-Type) are now set by each framework's middleware.
