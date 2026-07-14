---
"@atblob/core": minor
"@atblob/cli": minor
---

Add a `maxConcurrentPerHost` option that caps concurrent blob fetches to the same PDS host, preventing atblob from being used to relay a denial-of-service flood against an arbitrary PDS.
