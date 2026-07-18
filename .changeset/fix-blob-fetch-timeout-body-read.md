---
"@atblob/core": patch
---

Fix blobFetchTimeout not being enforced while streaming the blob response body, which allowed a malicious PDS to hold connections open indefinitely.
