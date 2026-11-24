import { Descendant, MoveNodeOperation, Node, Path, Text } from 'slate';
import * as Y from 'yjs';
import { Delta } from '../../model/types';
import { cloneInsertDeltaDeep } from '../../utils/clone';
import { getInsertDeltaLength, yTextToInsertDelta } from '../../utils/delta';
import { getYTarget } from '../../utils/location';
import {
  getStoredPositionsInDeltaAbsolute,
  restoreStoredPositionsWithDeltaAbsolute,
} from '../../utils/position';
import { PRESERVE_CONTENT } from '../../utils/yjs';

// Returns a copy of root without the node at path. Only the ancestors of the
// removed node are copied.
function withoutNode(root: Node, path: Path): Node {
  if (Text.isText(root)) {
    throw new Error('Cannot descend into slate text');
  }

  const [index, ...rest] = path;
  const children = [...root.children];
  if (rest.length === 0) {
    children.splice(index, 1);
  } else {
    children[index] = withoutNode(children[index], rest) as Descendant;
  }

  return { ...root, children } as Node;
}

export function moveNode(
  sharedRoot: Y.XmlText,
  slateRoot: Node,
  op: MoveNodeOperation
): void {
  const origin = getYTarget(sharedRoot, slateRoot, op.path);
  const insertDelta = cloneInsertDeltaDeep(origin.targetDelta);

  const storedPositions = getStoredPositionsInDeltaAbsolute(
    sharedRoot,
    origin.yParent,
    origin.targetDelta
  );

  origin.yParent.delete(
    origin.textRange.start,
    origin.textRange.end - origin.textRange.start
  );

  // Slate removes the node first and inserts it at Path.transform(path, op)
  // in the remaining tree. Resolve the target the same way, so it matches
  // Yjs after the delete above.
  const rootWithoutNode = withoutNode(slateRoot, op.path);
  const newPath = Path.transform(op.path, op);
  if (!newPath) {
    throw new Error('Cannot resolve the target path of a move');
  }

  const newParentPath = Path.parent(newPath);
  const parent = Node.get(rootWithoutNode, newParentPath);
  if (Text.isText(parent)) {
    throw new Error('Cannot move slate node into text element');
  }

  const target = getYTarget(sharedRoot, rootWithoutNode, [
    ...newParentPath,
    Math.min(newPath[newPath.length - 1], parent.children.length),
  ]);

  const targetLength = getInsertDeltaLength(yTextToInsertDelta(target.yParent));
  const deltaApplyYOffset = Math.min(target.textRange.start, targetLength);
  const applyDelta: Delta = [{ retain: deltaApplyYOffset }, ...insertDelta];

  target.yParent.applyDelta(applyDelta, PRESERVE_CONTENT);

  restoreStoredPositionsWithDeltaAbsolute(
    sharedRoot,
    target.yParent,
    storedPositions,
    insertDelta,
    deltaApplyYOffset,
    origin.textRange.start
  );
}
