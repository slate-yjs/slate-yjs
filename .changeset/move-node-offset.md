---
'@slate-yjs/core': patch
---

Fix moving a node forward within its parent. The target position in Yjs was computed before the node was removed, so text and inline nodes landed at the wrong offset, for example inside the next text node, and other clients saw a different document.
