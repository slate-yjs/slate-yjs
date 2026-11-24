# @slate-yjs/core

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
