# @slate-yjs/core

## 1.1.1

### Patch Changes

- [#490](https://github.com/slate-yjs/slate-yjs/pull/490) [`453140b`](https://github.com/slate-yjs/slate-yjs/commit/453140b1208639876dc6c86c09f2a9f12bbb79ff) Thanks [@juliankrispel](https://github.com/juliankrispel)! - Fix the formatting of remote text inserted next to text that the same remote change both reformatted and inserted into. The text could take the formatting of its neighbour, after which the editor no longer matched Yjs and later edits could throw.

## 1.1.0

### Minor Changes

- [#488](https://github.com/slate-yjs/slate-yjs/pull/488) [`d5c46f4`](https://github.com/slate-yjs/slate-yjs/commit/d5c46f40ee256b93bdf3faa2039b87a983ebf206) Thanks [@juliankrispel](https://github.com/juliankrispel)! - Export `translateYjsEvent` and `applySlateOp`, the low-level functions `withYjs` uses to turn a Yjs event into Slate operations and a Slate operation into Yjs changes. Both assume Slate and Yjs held the same document before the change.

## 1.0.9

### Patch Changes

- [#484](https://github.com/slate-yjs/slate-yjs/pull/484) [`8b86c1b`](https://github.com/slate-yjs/slate-yjs/commit/8b86c1b197cfb34a71b561557069ae6a5c4380de) Thanks [@juliankrispel](https://github.com/juliankrispel)! - Stop reversing a remote Yjs event's delta in place. Yjs gives the same delta to every observer, so a second editor bound to the same shared root, or any other observer that ran afterwards, got the changes in reverse order. `withYHistory` no longer maps the selection while the editor is disconnected, which threw "Path doesn't match yText" when Slate set a selection, for example on autofocus, before the first sync.

- [#487](https://github.com/slate-yjs/slate-yjs/pull/487) [`8e9ed3e`](https://github.com/slate-yjs/slate-yjs/commit/8e9ed3e830ef6adbaa4ccd1c11da413268795a78) Thanks [@juliankrispel](https://github.com/juliankrispel)! - Apply remote text inserts with the right marks when the same update also changes the formatting of the text right after the insert. The insert was added to the neighbouring text node and took on its new formatting, so for example typed text became italic on other clients when the text after it was made italic in the same update.

## 1.0.8

### Patch Changes

- [#480](https://github.com/slate-yjs/slate-yjs/pull/480) [`9287f17`](https://github.com/slate-yjs/slate-yjs/commit/9287f172487db3dd677304089570a1aa80385cdd) Thanks [@juliankrispel](https://github.com/juliankrispel)! - Restore the previous origin when the callback passed to `YjsEditor.withOrigin` throws. If applying a remote update threw, the editor kept the remote origin, so local edits were no longer recorded or written to Yjs, even after reconnecting.

## 1.0.7

### Patch Changes

- [#466](https://github.com/slate-yjs/slate-yjs/pull/466) [`cf2de60`](https://github.com/slate-yjs/slate-yjs/commit/cf2de604dc39de90c5fbc89a5a55783737a0e8fe) Thanks [@juliankrispel](https://github.com/juliankrispel)! - Copy the shorter side when splitting a node. A split copied everything after the split point into a new Yjs node, so pressing Enter at the start of a block moved all of it, and remote cursors and concurrent typing in it jumped to the split point. Stored positions at the end of a text are also kept on the right side of a split. Fixes [#299](https://github.com/slate-yjs/slate-yjs/issues/299) for splits near the start or end of a block.

## 1.0.6

### Patch Changes

- [#459](https://github.com/slate-yjs/slate-yjs/pull/459) [`fc0675d`](https://github.com/slate-yjs/slate-yjs/commit/fc0675d14087df4cd2e419a2110bcc25973c4357) Thanks [@juliankrispel](https://github.com/juliankrispel)! - Convert a position next to an inline back to a Slate point. A point in the empty text before or after an inline, for example a caret after a link at the end of a paragraph, converted back to `null`, so remote cursors there weren't shown.

## 1.0.5

### Patch Changes

- [#455](https://github.com/slate-yjs/slate-yjs/pull/455) [`8e65a09`](https://github.com/slate-yjs/slate-yjs/commit/8e65a0939c62f4c1fb5c866b0b7dc6ab7aeb4134) Thanks [@juliankrispel](https://github.com/juliankrispel)! - With `autoSend`, a cursor hidden with `CursorEditor.sendCursorPosition(editor, null)` (as `useUnsetCursorPositionOnBlur` does) now stays hidden until the local selection moves. It was sent again on the next change, including changes from other users. An unchanged selection is also no longer re-sent on every change.

- [#454](https://github.com/slate-yjs/slate-yjs/pull/454) [`58a9c0f`](https://github.com/slate-yjs/slate-yjs/commit/58a9c0f6912e2d825c058aad47e4b23fe478e14a) Thanks [@juliankrispel](https://github.com/juliankrispel)! - Fix moving a node forward within its parent. The target position in Yjs was computed before the node was removed, so text and inline nodes landed at the wrong offset, for example inside the next text node, and other clients saw a different document.

## 1.0.4

### Patch Changes

- [#452](https://github.com/slate-yjs/slate-yjs/pull/452) [`968a580`](https://github.com/slate-yjs/slate-yjs/commit/968a5806b3a46977a6a559c0808032a2a2f6a6f3) Thanks [@juliankrispel](https://github.com/juliankrispel)! - Write the changes produced by normalizing a remote update to Yjs straight away. They were queued until `onChange`, so a second remote update applied first left them pointing at the wrong nodes, which corrupted the document or threw errors such as "Cannot merge y text with y element" and "yOffset out of bounds".

  Also warns once per editor when a remote update is applied while local edits are still queued, which can still corrupt the document. Call `YjsEditor.flushLocalChanges(editor)` before applying remote updates in the same task as local edits.

- [#453](https://github.com/slate-yjs/slate-yjs/pull/453) [`6e012de`](https://github.com/slate-yjs/slate-yjs/commit/6e012deb8f547a82a51ff291a0c04c1e7f11429d) Thanks [@juliankrispel](https://github.com/juliankrispel)! - Keep a trailing soft line break (`\n`) when merging nodes. Yjs drops a trailing newline from `applyDelta` when `sanitize` is false.

- [#443](https://github.com/slate-yjs/slate-yjs/pull/443) [`82077b5`](https://github.com/slate-yjs/slate-yjs/commit/82077b592708c38277b1a7a1f3781e3f4fa83be6) Thanks [@juliankrispel](https://github.com/juliankrispel)! - Publish only `dist`, `src`, the changelog and the license, leaving tests and build config out of the package.

## 1.0.3

### Patch Changes

- [#421](https://github.com/slate-yjs/slate-yjs/pull/421) [`ea9b642`](https://github.com/slate-yjs/slate-yjs/commit/ea9b642b3ae1781833de57c16c146bb6cad848be) Thanks [@jul13579](https://github.com/jul13579)! - Fix `getStoredPositions` decoding

## 1.0.2

### Patch Changes

- [#411](https://github.com/BitPhinix/slate-yjs/pull/411) [`117c9e5`](https://github.com/BitPhinix/slate-yjs/commit/117c9e504d826ea3ea4e69437f671ada8a44855f) Thanks [@BrentFarese](https://github.com/BrentFarese)! - Patch bug in mergeNode that causes getYTarget to error.

## 1.0.1

### Patch Changes

- [#402](https://github.com/BitPhinix/slate-yjs/pull/402) [`c453baf`](https://github.com/BitPhinix/slate-yjs/commit/c453baf5c7a720436ee434eda3e93fe16e1482fc) Thanks [@juliankrispel](https://github.com/juliankrispel)! - Fix applyDelta to produce correct slate operations for adjacent text operations

## 1.0.0

### Minor Changes

- [#395](https://github.com/BitPhinix/slate-yjs/pull/395) [`a6a27c8`](https://github.com/BitPhinix/slate-yjs/commit/a6a27c86678656e55ecbf0ba76852545605a0955) Thanks [@BitPhinix](https://github.com/BitPhinix)! - ignore formatting attributes for non-text

- [#398](https://github.com/BitPhinix/slate-yjs/pull/398) [`72bbbf3`](https://github.com/BitPhinix/slate-yjs/commit/72bbbf3bb8a3f57762153cbd9a7f689d2b282f0c) Thanks [@gblaketx](https://github.com/gblaketx)! - Fix assoc calculation when creating relative position from a Slate point

### Patch Changes

- [#395](https://github.com/BitPhinix/slate-yjs/pull/395) [`a6a27c8`](https://github.com/BitPhinix/slate-yjs/commit/a6a27c86678656e55ecbf0ba76852545605a0955) Thanks [@BitPhinix](https://github.com/BitPhinix)! - chore: remove unnecessary assertion

## 0.3.1

### Patch Changes

- [#369](https://github.com/BitPhinix/slate-yjs/pull/369) [`aa10864`](https://github.com/BitPhinix/slate-yjs/commit/aa108641f44ca00559124cca8277a7c1e4354c00) Thanks [@BitPhinix](https://github.com/BitPhinix)! - Normalize editor on connect to avoid rendering denormalized state

## 0.3.0

### Patch Changes

- [#363](https://github.com/BitPhinix/slate-yjs/pull/363) [`3710c48`](https://github.com/BitPhinix/slate-yjs/commit/3710c4887ee89946ace787ba24436d82d95bc856) Thanks [@BitPhinix](https://github.com/BitPhinix)! - Loosen `CursorEditor.isCursorEditor` to not check awareness instance.

## 0.2.8

### Patch Changes

- [#360](https://github.com/BitPhinix/slate-yjs/pull/360) [`c3c7a44`](https://github.com/BitPhinix/slate-yjs/commit/c3c7a4428fd500a94796747537b87512d9ed3ca6) Thanks [@zarv1k](https://github.com/zarv1k)! - fix: use editor properties in plugin methods

## 0.2.7

### Patch Changes

- [#358](https://github.com/BitPhinix/slate-yjs/pull/358) [`27d39dd`](https://github.com/BitPhinix/slate-yjs/commit/27d39ddc3cf79797a878d0540f8b2605fcf38988) Thanks [@zarv1k](https://github.com/zarv1k)! - use editor.sharedRoot in connect/disconnect

## 0.2.6

### Patch Changes

- [#352](https://github.com/BitPhinix/slate-yjs/pull/352) [`3e172a6`](https://github.com/BitPhinix/slate-yjs/commit/3e172a63f6d0a298da26975cb2b6831a02f81f2b) Thanks [@BitPhinix](https://github.com/BitPhinix)! - Throw error in non-static connect call if editor is already connected

## 0.2.5

### Patch Changes

- [#350](https://github.com/BitPhinix/slate-yjs/pull/350) [`bc90d51`](https://github.com/BitPhinix/slate-yjs/commit/bc90d51b191ae2e13aac40ff986d2fe3c626eac3) Thanks [@AntonNiklasson](https://github.com/AntonNiklasson)! - Decode positions as binary in getStoredPositionsInDeltaAbsolute

## 0.2.3

### Patch Changes

- [#334](https://github.com/BitPhinix/slate-yjs/pull/334) [`5172e4a`](https://github.com/BitPhinix/slate-yjs/commit/5172e4a0033db41bc3530f227c5371e9ddb22269) Thanks [@BitPhinix](https://github.com/BitPhinix)! - don't autoConnect by default
