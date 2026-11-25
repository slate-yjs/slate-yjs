import { createEditor, Descendant, Transforms } from 'slate';
import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import {
  relativePositionToSlatePoint,
  slateNodesToInsertDelta,
  withYjs,
  YjsEditor,
  yTextToSlateElement,
} from '../src';

type Client = {
  doc: Y.Doc;
  root: Y.XmlText;
  editor: YjsEditor;
  inbox: Uint8Array[];
};

function setup(children: Descendant[], clientCount = 2) {
  const seed = new Y.Doc();
  const seedRoot = seed.get('content', Y.XmlText) as Y.XmlText;
  seedRoot.applyDelta(slateNodesToInsertDelta(children), { sanitize: true });
  const state = Y.encodeStateAsUpdate(seed);

  const clients: Client[] = [];
  for (let i = 0; i < clientCount; i++) {
    const doc = new Y.Doc();
    Y.applyUpdate(doc, state, 'remote');
    const root = doc.get('content', Y.XmlText) as Y.XmlText;
    const base = createEditor();
    base.isInline = (element) => element.type === 'link';
    const client: Client = {
      doc,
      root,
      editor: withYjs(base, root),
      inbox: [],
    };
    doc.on('update', (update: Uint8Array, origin: unknown) => {
      if (origin === 'remote') return;
      clients.forEach((other) => {
        if (other !== client) other.inbox.push(update);
      });
    });
    clients.push(client);
  }

  clients.forEach(({ editor }) => {
    YjsEditor.connect(editor);
    editor.onChange();
  });

  const sync = () => {
    clients.forEach(({ editor }) => editor.onChange());
    clients.forEach(({ doc, editor, inbox }) => {
      while (inbox.length) {
        Y.applyUpdate(doc, inbox.shift() as Uint8Array, 'remote');
        editor.onChange();
      }
    });
  };

  const fromYjs = ({ root }: Client) => yTextToSlateElement(root).children;

  return { clients, sync, fromYjs };
}

describe('empty text', () => {
  it('does not put a remote mark on an inline element', () => {
    const {
      clients: [a, b],
      sync,
      fromYjs,
    } = setup([{ type: 'paragraph', children: [{ text: 'abcdef' }] }]);

    Transforms.setNodes(a.editor, { bold: true }, { at: [0, 0] });
    a.editor.onChange();
    Transforms.insertNodes(
      b.editor,
      { type: 'link', url: 'x', children: [{ text: 'L' }] },
      { at: { path: [0, 0], offset: 3 } }
    );
    b.editor.onChange();
    sync();

    expect(b.editor.children).toEqual(fromYjs(b));
    expect(b.editor.children).toEqual(a.editor.children);
  });

  it('applies a remote delete while a concurrent merge empties the last block', () => {
    const {
      clients: [a, b],
      sync,
    } = setup([
      {
        type: 'block-quote',
        children: [{ type: 'paragraph', children: [{ text: 'alpha' }] }],
      },
      {
        type: 'block-quote',
        children: [
          { type: 'paragraph', children: [{ text: 'one' }] },
          { type: 'paragraph', children: [{ text: 'two' }] },
        ],
      },
    ]);

    Transforms.mergeNodes(b.editor, { at: [1, 1] });
    b.editor.onChange();
    Transforms.delete(a.editor, {
      at: {
        anchor: { path: [0, 0, 0], offset: 2 },
        focus: { path: [1, 0, 0], offset: 1 },
      },
    });
    a.editor.onChange();

    expect(() => sync()).not.toThrow();
    expect(b.editor.children).toEqual(a.editor.children);
  });

  it('resolves a position stored after an inline before empty texts had a char', () => {
    const {
      clients: [a],
    } = setup(
      [
        {
          type: 'paragraph',
          children: [
            { text: 'go ' },
            { type: 'link', url: 'x', children: [{ text: 'here' }] },
            { text: '' },
          ],
        },
      ],
      1
    );

    // Older versions stored a caret in the trailing empty text as index 4
    // (after the link) with assoc -1.
    const paragraph = a.root.toDelta()[0].insert as Y.XmlText;
    const position = Y.createRelativePositionFromTypeIndex(paragraph, 4, -1);

    expect(relativePositionToSlatePoint(a.root, a.editor, position)).toEqual({
      path: [0, 2],
      offset: 0,
    });
  });

  it('keeps text an older client typed into the empty text char', () => {
    const {
      clients: [a],
    } = setup([{ type: 'paragraph', children: [{ text: '', bold: true }] }], 1);

    // An older client sees the empty text char as text and types after it,
    // so the typed text keeps the marker attribute.
    const paragraph = a.root.toDelta()[0].insert as Y.XmlText;
    const [{ attributes }] = paragraph.toDelta();
    paragraph.insert(1, 'hello', attributes);

    expect(yTextToSlateElement(a.root).children).toEqual([
      { type: 'paragraph', children: [{ text: '​hello', bold: true }] },
    ]);
  });
});
