---
'@slate-yjs/core': minor
---

Keep marks and other properties on empty text nodes. Yjs can't store an empty string, so an empty text node is now stored as a zero-width space with a `__slateYjsEmptyText_<id>` attribute and converted back to an empty text node. Documents without these characters still load and edit as before. Clients on an older version show the character as a zero-width space with an unknown mark, so update every client that edits a shared document together. Fixes #343 and #415.
