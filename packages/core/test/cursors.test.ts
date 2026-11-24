/* eslint-disable import/no-extraneous-dependencies */
import { createEditor, Transforms } from 'slate';
import { describe, expect, it, vi } from 'vitest';
import { Awareness } from 'y-protocols/awareness';
import * as Y from 'yjs';
import {
  CursorEditor,
  slateNodesToInsertDelta,
  withCursors,
  withYjs,
  YjsEditor,
} from '../src';

function setup() {
  const seed = new Y.Doc();
  (seed.get('content', Y.XmlText) as Y.XmlText).applyDelta(
    slateNodesToInsertDelta([
      { type: 'paragraph', children: [{ text: 'alpha bravo' }] },
    ] as never)
  );
  const doc = new Y.Doc();
  Y.applyUpdate(doc, Y.encodeStateAsUpdate(seed));
  const remoteDoc = new Y.Doc();
  Y.applyUpdate(remoteDoc, Y.encodeStateAsUpdate(seed));

  const awareness = new Awareness(doc);
  const editor = withCursors(
    withYjs(createEditor(), doc.get('content', Y.XmlText) as Y.XmlText),
    awareness
  );
  YjsEditor.connect(editor);

  const remoteRoot = remoteDoc.get('content', Y.XmlText) as Y.XmlText;
  const remoteEdit = () => {
    const before = Y.encodeStateVector(doc);
    (remoteRoot.toDelta()[0].insert as Y.XmlText).insert(0, 'x');
    Y.applyUpdate(doc, Y.encodeStateAsUpdate(remoteDoc, before));
    editor.onChange();
  };

  const sentSelection = () =>
    awareness.getLocalState()?.[editor.selectionStateField];

  return { editor, awareness, remoteEdit, sentSelection };
}

describe('withCursors', () => {
  it('keeps the cursor hidden after an explicit unset until the selection moves', () => {
    const { editor, remoteEdit, sentSelection } = setup();
    Transforms.select(editor, { path: [0, 0], offset: 3 });
    editor.onChange();
    expect(sentSelection()).toBeTruthy();

    CursorEditor.sendCursorPosition(editor, null);
    expect(sentSelection()).toBeNull();

    // A remote edit moves the Slate selection but not the user's cursor.
    remoteEdit();
    expect(sentSelection()).toBeNull();

    Transforms.select(editor, { path: [0, 0], offset: 6 });
    editor.onChange();
    expect(sentSelection()).toBeTruthy();
  });

  it("doesn't resend an unchanged selection", () => {
    const { editor, awareness } = setup();
    Transforms.select(editor, { path: [0, 0], offset: 3 });
    editor.onChange();

    const setField = vi.spyOn(awareness, 'setLocalStateField');
    editor.onChange();
    editor.onChange();
    expect(setField).not.toHaveBeenCalled();
  });
});
