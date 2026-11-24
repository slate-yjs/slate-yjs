---
'@slate-yjs/core': patch
---

Keep a trailing soft line break (`\n`) when merging nodes. Yjs drops a trailing newline from `applyDelta` when `sanitize` is false.
