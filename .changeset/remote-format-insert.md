---
'@slate-yjs/core': patch
---

Apply remote text inserts with the right marks when the same update also changes the formatting of the text right after the insert. The insert was added to the neighbouring text node and took on its new formatting, so for example typed text became italic on other clients when the text after it was made italic in the same update.
