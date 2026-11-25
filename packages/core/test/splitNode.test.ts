/* eslint-disable import/no-extraneous-dependencies */
import { createEditor, Descendant, Transforms } from 'slate';
import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import {
  relativePositionToSlatePoint,
  slateNodesToInsertDelta,
  slatePointToRelativePosition,
  withYjs,
  YjsEditor,
  yTextToSlateElement,
} from '../src';

function setup(children: Descendant[]) {
  const seed = new Y.Doc();
  const seedRoot = seed.get('content', Y.XmlText) as Y.XmlText;
  seedRoot.applyDelta(slateNodesToInsertDelta(children), { sanitize: true });
  const state = Y.encodeStateAsUpdate(seed);

  const [a, b] = [0, 1].map(() => {
    const doc = new Y.Doc();
    Y.applyUpdate(doc, state);
    const root = doc.get('content', Y.XmlText) as Y.XmlText;
    const editor = withYjs(createEditor(), root);
    YjsEditor.connect(editor);
    return { doc, root, editor };
  });

  const sync = () => {
    a.editor.onChange();
    b.editor.onChange();
    Y.applyUpdate(
      b.doc,
      Y.encodeStateAsUpdate(a.doc, Y.encodeStateVector(b.doc))
    );
    Y.applyUpdate(
      a.doc,
      Y.encodeStateAsUpdate(b.doc, Y.encodeStateVector(a.doc))
    );
  };

  return { a, b, sync };
}

const paragraph = (text: string, extra = {}) => ({
  type: 'paragraph',
  ...extra,
  children: [{ text }],
});

describe('split node', () => {
  it('keeps a remote cursor in place when splitting at the start of a block', () => {
    const { a, b, sync } = setup([paragraph('hello world')]);
    const cursor = slatePointToRelativePosition(b.root, b.editor, {
      path: [0, 0],
      offset: 6,
    });

    Transforms.splitNodes(a.editor, {
      at: { path: [0, 0], offset: 0 },
      always: true,
    });
    sync();

    expect(a.editor.children).toEqual([
      paragraph(''),
      paragraph('hello world'),
    ]);
    expect(relativePositionToSlatePoint(a.root, a.editor, cursor)).toEqual({
      path: [1, 0],
      offset: 6,
    });
  });

  it('keeps concurrent typing in the longer side', () => {
    const { a, b, sync } = setup([paragraph('hello world')]);

    Transforms.splitNodes(a.editor, { at: { path: [0, 0], offset: 2 } });
    Transforms.insertText(b.editor, '!', { at: { path: [0, 0], offset: 11 } });
    sync();

    expect(a.editor.children).toEqual([
      paragraph('he'),
      paragraph('llo world!'),
    ]);
    expect(b.editor.children).toEqual(a.editor.children);
  });

  it('keeps the first node properties and gives the second op.properties', () => {
    const { a, b, sync } = setup([
      paragraph('hello world', { align: 'center' }),
    ]);

    Transforms.splitNodes(a.editor, { at: { path: [0, 0], offset: 1 } });
    Transforms.setNodes(
      a.editor,
      { type: 'heading', align: undefined },
      { at: [1] }
    );
    sync();

    const expected = [
      paragraph('h', { align: 'center' }),
      { type: 'heading', children: [{ text: 'ello world' }] },
    ];
    expect(a.editor.children).toEqual(expected);
    expect(b.editor.children).toEqual(expected);
    expect(yTextToSlateElement(b.root).children).toEqual(expected);
  });

  it('keeps a stored position at the end of a block when the start is copied', () => {
    const { a } = setup([paragraph('hello world')]);
    YjsEditor.storePosition(a.editor, 'end', { path: [0, 0], offset: 11 });

    Transforms.splitNodes(a.editor, { at: { path: [0, 0], offset: 2 } });
    a.editor.onChange();

    expect(YjsEditor.position(a.editor, 'end')).toEqual({
      path: [1, 0],
      offset: 9,
    });
  });
});
