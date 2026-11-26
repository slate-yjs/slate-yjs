/* eslint-disable import/no-extraneous-dependencies */
import { createEditor, Descendant } from 'slate';
import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import { slateNodesToInsertDelta, withYjs, YjsEditor } from '../src';

function setup(text: string) {
  const value: Descendant[] = [{ type: 'paragraph', children: [{ text }] }];
  const remote = new Y.Doc();
  const remoteRoot = remote.get('content', Y.XmlText) as Y.XmlText;
  remoteRoot.applyDelta(slateNodesToInsertDelta(value));

  const doc = new Y.Doc();
  Y.applyUpdate(doc, Y.encodeStateAsUpdate(remote));
  const editor = withYjs(
    createEditor(),
    doc.get('content', Y.XmlText) as Y.XmlText,
    { autoConnect: false }
  );
  YjsEditor.connect(editor);

  // Applies a remote change made in one transaction, so the editor gets a
  // single delta.
  const applyRemote = (change: (paragraph: Y.XmlText) => void) => {
    const stateVector = Y.encodeStateVector(doc);
    remote.transact(() => change(remoteRoot.toDelta()[0].insert as Y.XmlText));
    Y.applyUpdate(doc, Y.encodeStateAsUpdate(remote, stateVector));
  };

  return { editor, applyRemote };
}

describe('remote formatting', () => {
  it('keeps an insert unformatted when the text after it is formatted', () => {
    const { editor, applyRemote } = setup('new');

    applyRemote((paragraph) => {
      paragraph.insert(0, 'x');
      paragraph.format(1, 3, { italic: true });
    });

    expect(editor.children).toEqual([
      {
        type: 'paragraph',
        children: [{ text: 'x' }, { text: 'new', italic: true }],
      },
    ]);
  });

  it('keeps an insert formatted when the formatting after it is removed', () => {
    const { editor, applyRemote } = setup('new');
    applyRemote((paragraph) => paragraph.format(0, 3, { italic: true }));

    applyRemote((paragraph) => {
      paragraph.insert(0, 'x', { italic: true });
      paragraph.format(1, 3, { italic: null });
    });

    expect(editor.children).toEqual([
      {
        type: 'paragraph',
        children: [{ text: 'x', italic: true }, { text: 'new' }],
      },
    ]);
  });

  it('keeps an insert unformatted before formatted inserts into reformatted text', () => {
    const { editor, applyRemote } = setup('x');

    applyRemote((paragraph) => {
      paragraph.format(0, 1, { italic: true });
      paragraph.insert(0, 'h', { italic: true });
      paragraph.insert(0, 'c');
    });

    expect(editor.children).toEqual([
      {
        type: 'paragraph',
        children: [{ text: 'c' }, { text: 'hx', italic: true }],
      },
    ]);
  });
});
