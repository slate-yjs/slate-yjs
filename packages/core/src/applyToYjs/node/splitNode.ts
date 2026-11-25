import { Node, SplitNodeOperation, Text } from 'slate';
import * as Y from 'yjs';
import { cloneInsertDeltaDeep } from '../../utils/clone';
import { sliceInsertDelta, yTextToInsertDelta } from '../../utils/delta';
import { getSlateNodeYLength, getYTarget } from '../../utils/location';
import {
  getStoredPositionsInDeltaAbsolute,
  restoreStoredPositionsWithDeltaAbsolute,
} from '../../utils/position';
import { PRESERVE_CONTENT } from '../../utils/yjs';

export function splitNode(
  sharedRoot: Y.XmlText,
  slateRoot: Node,
  op: SplitNodeOperation
): void {
  const target = getYTarget(sharedRoot, slateRoot, op.path);

  if (!target.slateTarget) {
    throw new Error('Y target without corresponding slate node');
  }

  if (!target.yTarget) {
    if (!Text.isText(target.slateTarget)) {
      throw new Error('Mismatch node type between y target and slate node');
    }

    const unset: Record<string, null> = {};
    target.targetDelta.forEach((element) => {
      if (element.attributes) {
        Object.keys(element.attributes).forEach((key) => {
          unset[key] = null;
        });
      }
    });

    return target.yParent.format(
      target.textRange.start,
      target.textRange.end - target.textRange.start,
      { ...unset, ...op.properties }
    );
  }

  if (Text.isText(target.slateTarget)) {
    throw new Error('Mismatch node type between y target and slate node');
  }

  const splitTarget = getYTarget(target.yTarget, target.slateTarget, [
    op.position,
  ]);

  const ySplitOffset = target.slateTarget.children
    .slice(0, op.position)
    .reduce((length, child) => length + getSlateNodeYLength(child), 0);

  const length = target.slateTarget.children.reduce(
    (current, child) => current + getSlateNodeYLength(child),
    0
  );

  // Copy the shorter side into a new Yjs type and keep the longer side in
  // place, so fewer remote cursors and concurrent edits are moved.
  const copyHead = ySplitOffset < length - ySplitOffset;
  const copyStart = copyHead ? 0 : ySplitOffset;
  const copyLength = copyHead ? ySplitOffset : length - ySplitOffset;

  const splitDelta = sliceInsertDelta(
    yTextToInsertDelta(target.yTarget),
    copyStart,
    copyLength
  );
  const clonedDelta = cloneInsertDeltaDeep(splitDelta);

  const storedPositions = getStoredPositionsInDeltaAbsolute(
    sharedRoot,
    target.yTarget,
    splitDelta,
    copyStart
  );

  const toInsert = new Y.XmlText();
  toInsert.applyDelta(clonedDelta, PRESERVE_CONTENT);

  if (copyHead) {
    // The copy becomes the first node and keeps the current properties. The
    // original becomes the second node and gets op.properties.
    const { yTarget } = target;
    const attributes = yTarget.getAttributes();
    Object.entries(attributes).forEach(([key, value]) => {
      toInsert.setAttribute(key, value);
    });
    Object.keys(attributes).forEach((key) => {
      if (!(key in op.properties)) {
        yTarget.removeAttribute(key);
      }
    });
    Object.entries(op.properties).forEach(([key, value]) => {
      if (attributes[key] !== value) {
        yTarget.setAttribute(key, value);
      }
    });

    yTarget.delete(0, splitTarget.textRange.start);
    target.yParent.insertEmbed(target.textRange.start, toInsert);
  } else {
    Object.entries(op.properties).forEach(([key, value]) => {
      toInsert.setAttribute(key, value);
    });

    target.yTarget.delete(
      splitTarget.textRange.start,
      target.yTarget.length - splitTarget.textRange.start
    );
    target.yParent.insertEmbed(target.textRange.end, toInsert);
  }

  restoreStoredPositionsWithDeltaAbsolute(
    sharedRoot,
    toInsert,
    storedPositions,
    clonedDelta,
    0,
    copyStart
  );
}
