---
'@slate-yjs/core': patch
---

Convert a position next to an inline back to a Slate point. A point in the empty text before or after an inline, for example a caret after a link at the end of a paragraph, converted back to `null`, so remote cursors there weren't shown.
