---
'@slate-yjs/core': patch
---

Write the changes produced by normalizing a remote update to Yjs straight away. They were queued until `onChange`, so a second remote update applied first left them pointing at the wrong nodes, which corrupted the document or threw errors such as "Cannot merge y text with y element" and "yOffset out of bounds".

Also warns once per editor when a remote update is applied while local edits are still queued, which can still corrupt the document. Call `YjsEditor.flushLocalChanges(editor)` before applying remote updates in the same task as local edits.
