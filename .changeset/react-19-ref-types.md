---
'@slate-yjs/react': patch
---

Accept `RefObject<T | null>` for `containerRef` in `useRemoteCursorOverlayPositions`, which is what `useRef(null)` returns under React 19 types.
