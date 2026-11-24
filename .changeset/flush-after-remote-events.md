---
'@slate-yjs/core': patch
---

Write the changes produced by normalizing a remote update to Yjs straight away. They were queued until `onChange`, so a second remote update applied first left them pointing at the wrong nodes, which corrupted the document or threw errors such as "Cannot merge y text with y element" and "yOffset out of bounds".
