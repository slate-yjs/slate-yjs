---
'@slate-yjs/core': patch
---

Fix the formatting of remote text inserted next to text that the same remote change both reformatted and inserted into. The text could take the formatting of its neighbour, after which the editor no longer matched Yjs and later edits could throw.
