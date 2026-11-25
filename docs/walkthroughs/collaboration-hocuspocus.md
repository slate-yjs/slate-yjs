# Collaboration (Hocuspocus)

> Slate-yjs is connection provider agnostic, so even though other transport providers aren't covered in this guide, they might be better suited for your specific needs. You can find a full list of connection providers here: [https://docs.yjs.dev/ecosystem/connection-provider](https://docs.yjs.dev/ecosystem/connection-provider)

## Server-side setup

```javascript
import { Logger } from '@hocuspocus/extension-logger';
import { Server } from '@hocuspocus/server';
import { slateNodesToInsertDelta } from '@slate-yjs/core';
import * as Y from 'yjs';

const initialValue = [{ type: 'paragraph', children: [{ text: '' }] }];

// Setup the server
const server = new Server({
  port: 1234,

  // Add logging
  extensions: [new Logger()],

  async onLoadDocument(data) {
    // Load the initial value in case the document is empty
    if (data.document.isEmpty('content')) {
      const insertDelta = slateNodesToInsertDelta(initialValue);
      const sharedRoot = data.document.get('content', Y.XmlText);
      sharedRoot.applyDelta(insertDelta);
    }

    return data.document;
  },
});

// Start the server
server.listen();
```

## Client side setup

```javascript
import { HocuspocusProvider } from '@hocuspocus/provider';
import { withYjs, YjsEditor, withYHistory } from '@slate-yjs/core';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createEditor, Descendant, Editor, Transforms } from 'slate';
import { Editable, Slate, withReact } from 'slate-react';
import * as Y from 'yjs';

export function Editor() {
  const [value, setValue] = useState([]);
  const [synced, setSynced] = useState(false);

  const provider = useMemo(
    () =>
      new HocuspocusProvider({
        url: 'ws://127.0.0.1:1234',
        name: 'slate-yjs-demo',
        onSynced: ({ state }) => {
          if (state) {
            setSynced(true);
          }
        },
      }),
    []
  );

  const editor = useMemo(() => {
    const sharedType = provider.document.get('content', Y.XmlText);
    const e = withReact(withYHistory(withYjs(createEditor(), sharedType)));

    // Ensure editor always has at least 1 valid child
    const { normalizeNode } = e;
    e.normalizeNode = (entry) => {
      const [node] = entry;
      if (!Editor.isEditor(node) || node.children.length > 0) {
        return normalizeNode(entry);
      }

      Transforms.insertNodes(
        e,
        {
          type: 'paragraph',
          children: [{ text: '' }],
        },
        { at: [0] }
      );
    };

    return e;
  }, [provider.document]);

  // Connect editor and provider in useEffect to comply with concurrent mode
  // requirements.
  useEffect(() => {
    provider.connect();
    return () => provider.disconnect();
  }, [provider]);
  // Connect the editor only after the first sync. Before that the document
  // is empty, so the normalizer above would insert a paragraph, and every
  // client that loads would add one more to the shared document.
  useEffect(() => {
    if (!synced) {
      return undefined;
    }

    YjsEditor.connect(editor);
    return () => YjsEditor.disconnect(editor);
  }, [editor, synced]);

  return (
    <Slate value={value} onChange={setValue} editor={editor}>
      <Editable
        ...
      />
    </Slate>
  );
}

```

Create the initial content once, on the server in `onLoadDocument` as above. Don't load an initial value on each client: every copy inserted by a different client is kept when the documents merge, so the content shows up several times.
