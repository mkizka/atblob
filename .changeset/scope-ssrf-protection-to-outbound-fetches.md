---
"@atblob/core": patch
---

Scope SSRF protection to atblob's own outbound fetch calls instead of mutating undici's global dispatcher, so embedding @atblob/hono or @atblob/express in a host app no longer affects that app's other, unrelated fetch() calls. DID resolution (did:web/did:plc) now goes through @atproto-labs/did-resolver so it can receive the same scoped protection, instead of the unprotected fetch used internally by @atproto/identity.
