/* eslint-disable import/no-extraneous-dependencies */
import { createEditor, Descendant, Editor, Operation, Transforms } from 'slate';
import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import {
  applySlateOp,
  slateNodesToInsertDelta,
  translateYjsEvent,
  yTextToSlateElement,
} from '../src';

const value: Descendant[] = [
  { type: 'paragraph', children: [{ text: 'hello' }] },
  { type: 'paragraph', children: [{ text: 'world' }] },
];

function setup() {
  const doc = new Y.Doc();
  const sharedRoot = doc.get('content', Y.XmlText) as Y.XmlText;
  sharedRoot.applyDelta(slateNodesToInsertDelta(value));
  const editor = createEditor();
  editor.children = structuredClone(value);
  return { doc, sharedRoot, editor };
}

describe('low-level translation', () => {
  it('writes Slate operations to Yjs with applySlateOp', () => {
    const { sharedRoot, editor } = setup();
    const ops: { op: Operation; before: Descendant[] }[] = [];
    const { apply } = editor;
    editor.apply = (op) => {
      ops.push({ op, before: editor.children });
      apply(op);
    };

    Transforms.insertText(editor, '!', { at: { path: [0, 0], offset: 5 } });
    Transforms.splitNodes(editor, { at: { path: [1, 0], offset: 2 } });
    ops.forEach(({ op, before }) =>
      applySlateOp(sharedRoot, { children: before }, op)
    );

    expect(yTextToSlateElement(sharedRoot).children).toEqual(editor.children);
  });

  it('translates Yjs events into Slate operations', () => {
    const { doc, sharedRoot, editor } = setup();
    const translated: Operation[] = [];
    sharedRoot.observeDeep((events) => {
      Editor.withoutNormalizing(editor, () => {
        events.forEach((event) => {
          translateYjsEvent(sharedRoot, editor, event).forEach((op) => {
            translated.push(op);
            editor.apply(op);
          });
        });
      });
    });

    doc.transact(() => {
      (sharedRoot.toDelta()[0].insert as Y.XmlText).insert(5, '!');
      sharedRoot.delete(1, 1);
    });

    expect(translated.length).toBeGreaterThan(0);
    expect(editor.children).toEqual([
      { type: 'paragraph', children: [{ text: 'hello!' }] },
    ]);
  });
});
