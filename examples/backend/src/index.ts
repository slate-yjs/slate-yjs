import { Database } from '@hocuspocus/extension-database';
import { Logger } from '@hocuspocus/extension-logger';
import { Server } from '@hocuspocus/server';
import { slateNodesToInsertDelta } from '@slate-yjs/core';
import { DatabaseSync } from 'node:sqlite';
import * as Y from 'yjs';
import initialValue from './data/initialValue.json';

// Documents are kept in a local SQLite file through Node's built-in sqlite
// module, so the example needs no native dependencies.
const db = new DatabaseSync('db.sqlite');
db.exec(
  'CREATE TABLE IF NOT EXISTS documents (name TEXT PRIMARY KEY, data BLOB NOT NULL)'
);
const selectDocument = db.prepare('SELECT data FROM documents WHERE name = ?');
const upsertDocument = db.prepare(
  'INSERT INTO documents (name, data) VALUES (?, ?) ON CONFLICT(name) DO UPDATE SET data = excluded.data'
);

// Minimal hocuspocus server setup with logging. For more in-depth examples
// take a look at: https://github.com/ueberdosis/hocuspocus/tree/main/demos/backend
const server = new Server({
  port: parseInt(process.env.PORT ?? '', 10) || 1234,

  extensions: [
    new Logger(),
    new Database({
      fetch: async ({ documentName }) => {
        const row = selectDocument.get(documentName) as
          { data: Uint8Array } | undefined;
        return row ? new Uint8Array(row.data) : null;
      },
      store: async ({ documentName, state }) => {
        upsertDocument.run(documentName, state);
      },
    }),
  ],

  async onLoadDocument(data) {
    if (data.document.isEmpty('content')) {
      const insertDelta = slateNodesToInsertDelta(initialValue);
      const sharedRoot = data.document.get(
        'content',
        Y.XmlText
      ) as unknown as Y.XmlText;
      sharedRoot.applyDelta(insertDelta);
    }

    return data.document;
  },
});

server.listen();
