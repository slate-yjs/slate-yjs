// @vitest-environment jsdom
/** @jsxRuntime automatic */
/* eslint-disable import/no-extraneous-dependencies, react/react-in-jsx-scope, react/jsx-fragments */
import {
  slateNodesToInsertDelta,
  withCursors,
  withYHistory,
  withYjs,
  YjsEditor,
} from '@slate-yjs/core';
import { act, cleanup, render, screen } from '@testing-library/react';
import { ReactNode, useEffect } from 'react';
import { createEditor, Descendant, Transforms } from 'slate';
import { Editable, ReactEditor, Slate, withReact } from 'slate-react';
import { afterEach, describe, expect, it } from 'vitest';
import {
  applyAwarenessUpdate,
  Awareness,
  encodeAwarenessUpdate,
} from 'y-protocols/awareness';
import * as Y from 'yjs';
import {
  getRemoteCaretsOnLeaf,
  TextWithRemoteCursors,
  useDecorateRemoteCursors,
  useRemoteCursorStates,
} from '../src';

// What Slate renders before the shared root is synced.
const placeholder: Descendant[] = [
  { type: 'paragraph', children: [{ text: '' }] },
];

type Client = {
  doc: Y.Doc;
  awareness: Awareness;
  editor: ReactEditor & YjsEditor;
};

function createClient(name: string): Client {
  const doc = new Y.Doc();
  const awareness = new Awareness(doc);
  const editor = withReact(
    withCursors(
      withYHistory(
        withYjs(createEditor(), doc.get('content', Y.XmlText) as Y.XmlText, {
          autoConnect: false,
        })
      ),
      awareness,
      { data: { name } }
    )
  );
  return { doc, awareness, editor };
}

// Relays document and awareness updates between clients, like a provider.
function link(a: Client, b: Client) {
  [
    [a, b],
    [b, a],
  ].forEach(([from, to]) => {
    from.doc.on('update', (update: Uint8Array) =>
      Y.applyUpdate(to.doc, update, 'relay')
    );
    from.awareness.on(
      'update',
      ({ added, updated, removed }: Record<string, number[]>) => {
        const changed = [...added, ...updated, ...removed];
        applyAwarenessUpdate(
          to.awareness,
          encodeAwarenessUpdate(from.awareness, changed),
          'relay'
        );
      }
    );
  });
  Y.applyUpdate(b.doc, Y.encodeStateAsUpdate(a.doc));
  Y.applyUpdate(a.doc, Y.encodeStateAsUpdate(b.doc));
}

function seed(client: Client, text: string) {
  (client.doc.get('content', Y.XmlText) as Y.XmlText).applyDelta(
    slateNodesToInsertDelta([{ type: 'paragraph', children: [{ text }] }])
  );
}

function Leaf({
  attributes,
  children,
  leaf,
}: {
  attributes: object;
  children: ReactNode;
  leaf: TextWithRemoteCursors;
}) {
  const carets = getRemoteCaretsOnLeaf(leaf);
  return (
    <span {...attributes}>
      {children}
      {carets.map((caret) => (
        <span key={String(caret.clientId)} data-testid="remote-caret">
          {String(caret.data?.name)}
        </span>
      ))}
    </span>
  );
}

function RemoteCursorNames() {
  const cursors = useRemoteCursorStates();
  return (
    <ul data-testid="cursor-names">
      {Object.values(cursors).map((cursor) => (
        <li key={cursor.clientId}>{String(cursor.data?.name)}</li>
      ))}
    </ul>
  );
}

function DecoratedEditable({ testId }: { testId: string }) {
  const decorate = useDecorateRemoteCursors();
  return (
    <Editable
      data-testid={testId}
      decorate={decorate}
      renderLeaf={(props) => (
        <Leaf {...props} leaf={props.leaf as TextWithRemoteCursors} />
      )}
    />
  );
}

// Mirrors the examples and the Hocuspocus walkthrough: render with a
// placeholder value and connect in an effect once the provider has synced.
function ClientEditor({
  client,
  testId,
  autoFocus = false,
  synced = true,
}: {
  client: Client;
  testId: string;
  autoFocus?: boolean;
  synced?: boolean;
}) {
  const { editor } = client;
  useEffect(() => {
    if (!synced) {
      return undefined;
    }
    YjsEditor.connect(editor);
    return () => YjsEditor.disconnect(editor);
  }, [editor, synced]);

  return (
    <Slate editor={editor} initialValue={placeholder}>
      {autoFocus ? (
        <Editable data-testid={testId} autoFocus />
      ) : (
        <>
          <DecoratedEditable testId={testId} />
          <RemoteCursorNames />
        </>
      )}
    </Slate>
  );
}

afterEach(cleanup);

describe('slate-react integration', () => {
  it('mounts with autoFocus before the shared root has synced', async () => {
    const local = createClient('local');
    const remote = createClient('remote');
    seed(remote, 'hello');

    // Editable autofocuses and selects the start of the placeholder while
    // the editor is disconnected and the local root is still empty.
    let rerender: ReturnType<typeof render>['rerender'] = () => {};
    await act(async () => {
      ({ rerender } = render(
        <ClientEditor client={local} testId="editor" autoFocus synced={false} />
      ));
    });
    expect(local.editor.selection).not.toBeNull();

    await act(async () => {
      link(local, remote);
      rerender(<ClientEditor client={local} testId="editor" autoFocus />);
    });

    expect(screen.getByTestId('editor').textContent).toBe('hello');
  });

  it('renders remote edits', async () => {
    const a = createClient('a');
    const b = createClient('b');
    seed(a, 'hello');
    link(a, b);

    await act(async () => {
      render(
        <>
          <ClientEditor client={a} testId="a" />
          <ClientEditor client={b} testId="b" />
        </>
      );
    });

    await act(async () => {
      Transforms.insertText(a.editor, ' world', {
        at: { path: [0, 0], offset: 5 },
      });
    });

    expect(screen.getByTestId('a').textContent).toBe('hello world');
    expect(screen.getByTestId('b').textContent).toBe('hello world');
  });

  it('shows a remote cursor and its caret', async () => {
    const a = createClient('alice');
    const b = createClient('bob');
    seed(a, 'hello');
    link(a, b);

    await act(async () => {
      render(
        <>
          <ClientEditor client={a} testId="a" />
          <ClientEditor client={b} testId="b" />
        </>
      );
    });

    await act(async () => {
      Transforms.select(a.editor, { path: [0, 0], offset: 2 });
    });

    const editorB = screen.getByTestId('b');
    const caret = editorB.querySelector('[data-testid="remote-caret"]');
    expect(caret?.textContent).toBe('alice');
    expect(screen.getAllByTestId('cursor-names')[1].textContent).toBe('alice');
  });

  it('disconnects on unmount and stops applying remote edits', async () => {
    const a = createClient('a');
    const b = createClient('b');
    seed(a, 'hello');
    link(a, b);

    let unmount = () => {};
    await act(async () => {
      ({ unmount } = render(<ClientEditor client={b} testId="b" />));
    });
    expect(YjsEditor.connected(b.editor)).toBe(true);

    unmount();
    expect(YjsEditor.connected(b.editor)).toBe(false);

    (a.doc.get('content', Y.XmlText).toDelta()[0].insert as Y.XmlText).insert(
      5,
      '!'
    );
    expect(b.editor.children).toEqual([
      { type: 'paragraph', children: [{ text: 'hello' }] },
    ]);
  });
});
