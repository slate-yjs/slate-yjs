---
'@slate-yjs/core': patch
---

Copy the shorter side when splitting a node. A split copied everything after the split point into a new Yjs node, so pressing Enter at the start of a block moved all of it, and remote cursors and concurrent typing in it jumped to the split point. Stored positions at the end of a text are also kept on the right side of a split. Fixes #299 for splits near the start or end of a block.
