/* eslint-disable import/no-extraneous-dependencies */
import { createEditor, Descendant, Editor, Node } from 'slate';
import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import { slateNodesToInsertDelta, withYjs, YjsEditor } from '../src';

const value: Descendant[] = [
  { type: 'paragraph', children: [{ text: 'test' }] },
];

function setup() {
  const remote = new Y.Doc();
  const remoteRoot = remote.get('content', Y.XmlText) as Y.XmlText;
  remoteRoot.applyDelta(slateNodesToInsertDelta(value));

  const doc = new Y.Doc();
  Y.applyUpdate(doc, Y.encodeStateAsUpdate(remote));
  const root = doc.get('content', Y.XmlText) as Y.XmlText;

  // Inserts "9" at offset 2 of "test" on the remote doc and syncs it.
  const applyRemoteInsert = () => {
    const stateVector = Y.encodeStateVector(doc);
    (remoteRoot.toDelta()[0].insert as Y.XmlText).insert(2, '9');
    Y.applyUpdate(doc, Y.encodeStateAsUpdate(remote, stateVector));
  };

  return { root, applyRemoteInsert };
}

function connectedEditor(root: Y.XmlText): Editor {
  const editor = withYjs(createEditor(), root, { autoConnect: false });
  YjsEditor.connect(editor);
  return editor;
}

describe('remote text events', () => {
  it('applies the change correctly in every editor bound to the root', () => {
    const { root, applyRemoteInsert } = setup();
    const a = connectedEditor(root);
    const b = connectedEditor(root);

    applyRemoteInsert();

    expect(Node.string(a)).toBe('te9st');
    expect(Node.string(b)).toBe('te9st');
  });

  it("doesn't change the event delta other observers read", () => {
    const { root, applyRemoteInsert } = setup();
    connectedEditor(root);
    const deltas: unknown[] = [];
    root.observeDeep((events) => {
      events.forEach((event) => deltas.push(event.delta));
    });

    applyRemoteInsert();

    expect(deltas).toEqual([[{ retain: 2 }, { insert: '9' }]]);
  });
});
