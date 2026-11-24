---
'@slate-yjs/core': patch
---

With `autoSend`, a cursor hidden with `CursorEditor.sendCursorPosition(editor, null)` (as `useUnsetCursorPositionOnBlur` does) now stays hidden until the local selection moves. It was sent again on the next change, including changes from other users. An unchanged selection is also no longer re-sent on every change.
