# @slate-yjs/react

## 1.1.2

### Patch Changes

- [#438](https://github.com/slate-yjs/slate-yjs/pull/438) [`61692ca`](https://github.com/slate-yjs/slate-yjs/commit/61692cac38ddd9064b93dce291658c5d76873ae5) Thanks [@juliankrispel](https://github.com/juliankrispel)! - Accept `RefObject<T | null>` for `containerRef` in `useRemoteCursorOverlayPositions`, which is what `useRef(null)` returns under React 19 types.

- [#442](https://github.com/slate-yjs/slate-yjs/pull/442) [`a8ff798`](https://github.com/slate-yjs/slate-yjs/commit/a8ff798c80abec0620fe8d396e6725612dcfbd16) Thanks [@juliankrispel](https://github.com/juliankrispel)! - Remove the unused `y-protocols` dependency.

- [#443](https://github.com/slate-yjs/slate-yjs/pull/443) [`82077b5`](https://github.com/slate-yjs/slate-yjs/commit/82077b592708c38277b1a7a1f3781e3f4fa83be6) Thanks [@juliankrispel](https://github.com/juliankrispel)! - Publish only `dist`, `src`, the changelog and the license, leaving tests and build config out of the package.

## 1.1.1

### Patch Changes

- [#437](https://github.com/slate-yjs/slate-yjs/pull/437) [`3765822`](https://github.com/slate-yjs/slate-yjs/commit/3765822645b877564d6fcd1c2075bdf4a1828a15) Thanks [@juliankrispel](https://github.com/juliankrispel)! - Point package links at slate-yjs/slate-yjs.

## 1.1.0

### Minor Changes

- [#412](https://github.com/BitPhinix/slate-yjs/pull/412) [`8ab46c0`](https://github.com/BitPhinix/slate-yjs/commit/8ab46c0bcdacdd18133b60b5fc885c915580c5f5) Thanks [@ilya2204](https://github.com/ilya2204)! - Add error handling to cursor overlay

## 1.0.0

### Patch Changes

- Updated dependencies [[`a6a27c8`](https://github.com/BitPhinix/slate-yjs/commit/a6a27c86678656e55ecbf0ba76852545605a0955), [`a6a27c8`](https://github.com/BitPhinix/slate-yjs/commit/a6a27c86678656e55ecbf0ba76852545605a0955), [`72bbbf3`](https://github.com/BitPhinix/slate-yjs/commit/72bbbf3bb8a3f57762153cbd9a7f689d2b282f0c)]:
  - @slate-yjs/core@1.0.0

## 0.3.0

### Minor Changes

- [#363](https://github.com/BitPhinix/slate-yjs/pull/363) [`3710c48`](https://github.com/BitPhinix/slate-yjs/commit/3710c4887ee89946ace787ba24436d82d95bc856) Thanks [@BitPhinix](https://github.com/BitPhinix)! - Changed:

  - Rewrite of `useRemoteCursorOverlayPositions` to provide stricter typings, make it react 18 safe and add new `shouldGenerateOverlay` option.

  Added:

  - Remote cursor decorations using the new `useDecorateRemoteCursors` hook
  - Remote cursor data hooks `useRemoteCursorStatesSelector` and `useRemoteCursorStates`
  - Utility hooks to un-send the current cursor position on window/editor blur: `useUnsetCursorPositionOnBlur`
  - `getCursorRange` helper

### Patch Changes

- Updated dependencies [[`3710c48`](https://github.com/BitPhinix/slate-yjs/commit/3710c4887ee89946ace787ba24436d82d95bc856)]:
  - @slate-yjs/core@0.3.0

## 0.2.4

### Patch Changes

- [#339](https://github.com/BitPhinix/slate-yjs/pull/339) [`042a0a2`](https://github.com/BitPhinix/slate-yjs/commit/042a0a22f57ed7542a4e05840532f16d37629e33) Thanks [@BitPhinix](https://github.com/BitPhinix)! - Replace workspace:^ dependencies with concrete version range

## 0.2.3

### Patch Changes

- Updated dependencies [[`5172e4a`](https://github.com/BitPhinix/slate-yjs/commit/5172e4a0033db41bc3530f227c5371e9ddb22269)]:
  - @slate-yjs/core@0.2.3
