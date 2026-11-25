import { createEditor, Descendant, Transforms } from 'slate';
import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import { slateNodesToInsertDelta, withYjs, YjsEditor } from '../src';

function setup() {
  const doc = new Y.Doc();
  const root = doc.get('content', Y.XmlText) as Y.XmlText;
  const value: Descendant[] = [
    { type: 'paragraph', children: [{ text: 'hello' }] },
  ];
  root.applyDelta(slateNodesToInsertDelta(value));
  const editor = withYjs(createEditor(), root, { autoConnect: false });
  YjsEditor.connect(editor);
  const yText = () => (root.toDelta()[0].insert as Y.XmlText).toString();
  return { doc, editor, yText };
}

describe('withOrigin', () => {
  it('restores the previous origin when the callback throws', () => {
    const { editor, yText } = setup();

    expect(() =>
      YjsEditor.withOrigin(editor, 'remote', () => {
        throw new Error('boom');
      })
    ).toThrow('boom');
    expect(YjsEditor.isLocal(editor)).toBe(true);

    Transforms.insertText(editor, '!', { at: { path: [0, 0], offset: 5 } });
    editor.onChange();
    expect(yText()).toBe('hello!');
  });

  it('keeps syncing local edits after a remote update fails to apply', () => {
    const { doc, editor, yText } = setup();

    // Put Slate out of step with Yjs so the next remote update throws.
    editor.children = [];
    const other = new Y.Doc();
    Y.applyUpdate(other, Y.encodeStateAsUpdate(doc));
    const otherRoot = other.get('content', Y.XmlText) as Y.XmlText;
    (otherRoot.toDelta()[0].insert as Y.XmlText).insert(0, 'X');
    expect(() =>
      Y.applyUpdate(
        doc,
        Y.encodeStateAsUpdate(other, Y.encodeStateVector(doc)),
        'remote'
      )
    ).toThrow();

    // Recover by reloading from Yjs, then edit locally.
    YjsEditor.disconnect(editor);
    YjsEditor.connect(editor);
    Transforms.insertText(editor, '!', { at: { path: [0, 0], offset: 0 } });
    editor.onChange();

    expect(yText()).toBe('!Xhello');
  });
});
