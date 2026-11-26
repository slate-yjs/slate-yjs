---
'@slate-yjs/core': patch
---

Stop reversing a remote Yjs event's delta in place. Yjs gives the same delta to every observer, so a second editor bound to the same shared root, or any other observer that ran afterwards, got the changes in reverse order. `withYHistory` no longer maps the selection while the editor is disconnected, which threw "Path doesn't match yText" when Slate set a selection, for example on autofocus, before the first sync.
