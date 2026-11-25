---
'@slate-yjs/core': patch
---

Restore the previous origin when the callback passed to `YjsEditor.withOrigin` throws. If applying a remote update threw, the editor kept the remote origin, so local edits were no longer recorded or written to Yjs, even after reconnecting.
