---
'@slate-yjs/core': patch
---

Write local changes to Yjs as each operation is applied, instead of on `onChange`. Changes queued until `onChange` could be flushed after a remote update had already been applied, at paths that no longer matched, which corrupted the document or threw errors such as "Cannot merge y text with y element", "yOffset out of bounds" and "Path doesn't match yText".
