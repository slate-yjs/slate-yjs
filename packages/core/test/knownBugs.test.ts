/* eslint-disable import/no-extraneous-dependencies */
import { createEditor, Editor, Transforms } from 'slate';
import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import {
  slateNodesToInsertDelta,
  withYjs,
  YjsEditor,
  yTextToSlateElement,
} from '../src';

// Bugs found by the fuzzer (test/fuzz). Each test describes the correct
// behaviour and is skipped until the bug is fixed.

function connectedEditor(doc: Y.Doc) {
  const editor = withYjs(
    createEditor(),
    doc.get('content', Y.XmlText) as Y.XmlText
  );
  YjsEditor.connect(editor);
  return editor;
}

function seededDoc(children: unknown[]) {
  const seed = new Y.Doc();
  (seed.get('content', Y.XmlText) as Y.XmlText).applyDelta(
    slateNodesToInsertDelta(children as Editor['children'])
  );
  const doc = new Y.Doc();
  Y.applyUpdate(doc, Y.encodeStateAsUpdate(seed));
  return doc;
}

const yjsChildren = (editor: YjsEditor) =>
  yTextToSlateElement(editor.sharedRoot).children;

describe('known bugs', () => {
  // Fixed: local changes queued before a remote update (here, Slate
  // normalizing the previous remote update) used to be flushed after Yjs had
  // integrated the next update, at paths that no longer matched.
  it('applies two remote updates in one tick without corrupting the document', () => {
    const initial = [{ type: 'paragraph', children: [{ text: 'alpha' }] }];
    const docA = seededDoc(initial);
    const docB = new Y.Doc();
    Y.applyUpdate(docB, Y.encodeStateAsUpdate(docA));

    const a = connectedEditor(docA);
    const updates: Uint8Array[] = [];
    docA.on('update', (update: Uint8Array) => updates.push(update));
    Transforms.insertText(a, 'x', { at: { path: [0, 0], offset: 0 } });
    a.onChange();
    Transforms.insertNodes(
      a,
      { type: 'paragraph', children: [{ text: 'ab' }] } as never,
      { at: [0] }
    );
    a.onChange();

    const b = connectedEditor(docB);
    updates.forEach((update) => Y.applyUpdate(docB, update));
    b.onChange();

    expect(yjsChildren(b)).toEqual(yjsChildren(a));
    expect(b.children).toEqual(a.children);
  });

  // Merging a paragraph whose only text is a soft line break drops the "\n"
  // from Yjs, while the editor keeps it.
  it.skip('keeps a lone newline when merging it into the previous paragraph', () => {
    const doc = seededDoc([
      { type: 'paragraph', children: [{ text: 'bravo' }] },
      { type: 'paragraph', children: [{ text: '\n' }] },
    ]);
    const editor = connectedEditor(doc);
    Transforms.mergeNodes(editor, { at: [1] });
    editor.onChange();

    expect(yjsChildren(editor)).toEqual(editor.children);
  });

  // Yjs can't hold an empty string, so an empty text node's marks are lost.
  // Other clients, and this one after a reload, see a plain empty text.
  it.skip('keeps marks on an empty text node', () => {
    const doc = seededDoc([
      { type: 'paragraph', children: [{ text: 'bravo', bold: true }] },
    ]);
    const editor = connectedEditor(doc);
    Transforms.delete(editor, {
      at: { path: [0, 0], offset: 0 },
      distance: 5,
    });
    editor.onChange();

    expect(yjsChildren(editor)).toEqual(editor.children);
  });
});
