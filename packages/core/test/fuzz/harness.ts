/* eslint-disable import/no-extraneous-dependencies */
import {
  createEditor,
  Descendant,
  Editor,
  Element,
  Node,
  Path,
  Point,
  Range,
  Text,
  Transforms,
} from 'slate';
import * as Y from 'yjs';
import {
  slateNodesToInsertDelta,
  withYjs,
  YjsEditor,
  yTextToSlateElement,
} from '../../src';

// A fuzz run is a list of abstract actions. Each action carries raw numbers
// that are resolved against the current document when the action runs, so
// fast-check can shrink the list without producing out-of-range targets.
export type Action = {
  kind: number;
  client: number;
  a: number;
  b: number;
  c: number;
  text: string;
};

export type Variant = {
  name: string;
  clients: number;
  marks: boolean;
  edgeMarkValues: boolean;
  inlines: boolean;
  nested: boolean;
  voids: boolean;
  // When true, every edit and every delivered update is followed by a flush,
  // as in a browser where onChange runs before the next network message. When
  // false, some flushes are skipped so remote updates land in the flush window.
  eagerFlush: boolean;
};

export type FuzzFailure = {
  kind:
    | 'local-throw'
    | 'local-mismatch'
    | 'flush-throw'
    | 'remote-throw'
    | 'diverged-from-yjs'
    | 'clients-diverged';
  client: number;
  step: number;
  message: string;
};

export class FuzzError extends Error {
  failure: FuzzFailure;

  constructor(failure: FuzzFailure) {
    super(
      `[${failure.kind}] client ${failure.client} step ${failure.step}: ${failure.message}`
    );
    this.failure = failure;
  }
}

// Groups failures that are most likely the same bug: the failure kind plus
// the error message with paths, numbers and node dumps stripped.
export function failureSignature(failure: FuzzFailure) {
  const firstLine = failure.message
    .split('\n')[0]
    .replace(/\{.*$/, '{...}')
    .replace(/\[[\d,\s]*\]/g, '[path]')
    .replace(/\d+/g, 'N')
    .slice(0, 120);
  return `${failure.kind}: ${firstLine}`;
}

type Client = {
  id: number;
  doc: Y.Doc;
  editor: Editor & YjsEditor;
  inbox: Uint8Array[];
};

const REMOTE = 'fuzz-remote';
const BLOCK_TYPES = ['paragraph', 'heading'];
const MARKS = ['bold', 'italic', 'color'];
const EDGE_VALUES: unknown[] = [false, 0, '', null, { nested: true }, [1]];
const PLAIN_VALUES: unknown[] = [true, 'red', 'blue'];

function applySchema<T extends Editor>(editor: T, variant: Variant): T {
  const { isInline, isVoid } = editor;
  editor.isInline = (element) =>
    (variant.inlines && element.type === 'link') || isInline(element);
  editor.isVoid = (element) =>
    (variant.voids && element.type === 'image') || isVoid(element);
  return editor;
}

function plainEditor(variant: Variant, children: Descendant[]) {
  const editor = applySchema(createEditor(), variant);
  editor.children = JSON.parse(JSON.stringify(children));
  return editor;
}

function normalized(variant: Variant, children: Descendant[]) {
  const editor = plainEditor(variant, children);
  Editor.normalize(editor, { force: true });
  return editor.children;
}

function initialValue(variant: Variant): Descendant[] {
  const p = (text: string, marks: Record<string, unknown> = {}) => ({
    type: 'paragraph',
    children: [{ text, ...marks }],
  });

  const value: Descendant[] = [
    p('alpha'),
    variant.marks ? p('bravo', { bold: true }) : p('bravo'),
    p('charlie'),
  ];

  if (variant.inlines) {
    value.push({
      type: 'paragraph',
      children: [
        { text: 'go ' },
        { type: 'link', url: 'x', children: [{ text: 'here' }] },
        { text: ' now' },
      ],
    } as Descendant);
  }

  if (variant.nested) {
    value.push({
      type: 'quote',
      children: [p('quoted one'), p('quoted two')],
    } as Descendant);
  }

  return value;
}

// Key order differs between Slate nodes and nodes rebuilt from Yjs
// attributes, so compare with sorted keys.
function canonical(value: unknown): string {
  return JSON.stringify(value, (_key, v) =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? Object.fromEntries(
          Object.keys(v)
            .sort()
            .map((k) => [k, (v as Record<string, unknown>)[k]])
        )
      : v
  );
}

function sameJson(a: unknown, b: unknown) {
  return canonical(a) === canonical(b);
}

function pick<T>(items: T[], n: number): T | undefined {
  if (items.length === 0) {
    return undefined;
  }
  return items[Math.abs(n) % items.length];
}

function textEntries(editor: Editor) {
  return Array.from(Node.texts(editor));
}

function pointAt(editor: Editor, n: number, m: number): Point | undefined {
  const entry = pick(textEntries(editor), n);
  if (!entry) {
    return undefined;
  }
  const [node, path] = entry;
  let offset = Math.abs(m) % (node.text.length + 1);
  // Never point inside a surrogate pair. Real editing doesn't, and Yjs can't
  // store half a character.
  const before = node.text.charCodeAt(offset - 1);
  if (offset > 0 && before >= 0xd800 && before <= 0xdbff) {
    offset -= 1;
  }
  return { path, offset };
}

function rangeAt(editor: Editor, n: number, m: number, k: number) {
  const anchor = pointAt(editor, n, m);
  const focus = pointAt(editor, n + (Math.abs(k) % 3), m + k);
  if (!anchor || !focus) {
    return undefined;
  }
  return { anchor, focus } as Range;
}

function blockPaths(editor: Editor, leafOnly: boolean): Path[] {
  return Array.from(
    Editor.nodes(editor, {
      at: [],
      match: (n, p) =>
        p.length > 0 &&
        Element.isElement(n) &&
        Editor.isBlock(editor, n) &&
        (!leafOnly || !Editor.hasBlocks(editor, n)),
    })
  ).map(([, p]) => p);
}

function markValue(variant: Variant, n: number) {
  const values = variant.edgeMarkValues
    ? [...PLAIN_VALUES, ...EDGE_VALUES]
    : PLAIN_VALUES;
  return pick(values, n);
}

// Applies one local edit. Returns false when the action has no valid target
// in the current document, so it is skipped.
function applyLocalEdit(
  editor: Editor,
  variant: Variant,
  action: Action
): boolean {
  const { a, b, c, text } = action;
  const kinds = [
    'insertText',
    'delete',
    'splitBlock',
    'mergeBlock',
    'moveBlock',
    'setBlockType',
    'insertBlock',
    'removeBlock',
    ...(variant.marks ? ['setMark', 'unsetMark'] : []),
    ...(variant.inlines ? ['wrapLink', 'unwrapLink', 'insertLink'] : []),
    ...(variant.nested ? ['wrapQuote', 'unwrapQuote'] : []),
    ...(variant.voids ? ['insertVoid'] : []),
  ];
  const kind = pick(kinds, action.kind);

  switch (kind) {
    case 'insertText': {
      const at = pointAt(editor, a, b);
      if (!at) return false;
      Transforms.insertText(editor, text || 'x', { at });
      return true;
    }
    case 'delete': {
      const at = rangeAt(editor, a, b, c);
      if (!at) return false;
      Transforms.delete(editor, { at });
      return true;
    }
    case 'splitBlock': {
      const at = pointAt(editor, a, b);
      if (!at) return false;
      Transforms.splitNodes(editor, {
        at,
        always: true,
        match: (n) => Element.isElement(n) && Editor.isBlock(editor, n),
      });
      return true;
    }
    case 'mergeBlock': {
      const at = pick(
        blockPaths(editor, false).filter((p) => p[p.length - 1] > 0),
        a
      );
      if (!at) return false;
      Transforms.mergeNodes(editor, { at });
      return true;
    }
    case 'moveBlock': {
      const at = pick(blockPaths(editor, false), a);
      if (!at) return false;
      const to = [Math.abs(b) % editor.children.length];
      if (Path.isAncestor(at, to) || Path.equals(at, to)) return false;
      Transforms.moveNodes(editor, { at, to });
      return true;
    }
    case 'setBlockType': {
      const at = pick(blockPaths(editor, true), a);
      if (!at) return false;
      Transforms.setNodes(editor, { type: pick(BLOCK_TYPES, b) }, { at });
      return true;
    }
    case 'insertBlock': {
      const at = [Math.abs(a) % (editor.children.length + 1)];
      Transforms.insertNodes(
        editor,
        { type: 'paragraph', children: [{ text: text || 'new' }] },
        { at }
      );
      return true;
    }
    case 'removeBlock': {
      if (editor.children.length <= 1) return false;
      const at = pick(blockPaths(editor, false), a);
      if (!at) return false;
      Transforms.removeNodes(editor, { at });
      return true;
    }
    case 'setMark': {
      const at = rangeAt(editor, a, b, c);
      if (!at) return false;
      Transforms.setNodes(
        editor,
        { [pick(MARKS, c) as string]: markValue(variant, b) },
        { at, match: Text.isText, split: true }
      );
      return true;
    }
    case 'unsetMark': {
      const at = rangeAt(editor, a, b, c);
      if (!at) return false;
      Transforms.unsetNodes(editor, pick(MARKS, c) as string, {
        at,
        match: Text.isText,
        split: true,
      });
      return true;
    }
    case 'wrapLink': {
      const at = rangeAt(editor, a, b, c);
      if (!at || Range.isCollapsed(at)) return false;
      Transforms.wrapNodes(
        editor,
        { type: 'link', url: text || 'u', children: [] },
        { at, split: true }
      );
      return true;
    }
    case 'unwrapLink': {
      Transforms.unwrapNodes(editor, {
        at: [],
        match: (n) => Element.isElement(n) && n.type === 'link',
        mode: 'all',
      });
      return true;
    }
    case 'insertLink': {
      const at = pointAt(editor, a, b);
      if (!at) return false;
      Transforms.insertNodes(
        editor,
        { type: 'link', url: 'i', children: [{ text: text || 'link' }] },
        { at }
      );
      return true;
    }
    case 'wrapQuote': {
      const at = pick(blockPaths(editor, true), a);
      if (!at) return false;
      Transforms.wrapNodes(editor, { type: 'quote', children: [] }, { at });
      return true;
    }
    case 'unwrapQuote': {
      const quotes = Array.from(
        Editor.nodes(editor, {
          at: [],
          match: (n) => Element.isElement(n) && n.type === 'quote',
        })
      );
      const entry = pick(quotes, a);
      if (!entry) return false;
      Transforms.unwrapNodes(editor, { at: entry[1] });
      return true;
    }
    case 'insertVoid': {
      const at = [Math.abs(a) % (editor.children.length + 1)];
      Transforms.insertNodes(
        editor,
        { type: 'image', src: 's', children: [{ text: '' }] },
        { at }
      );
      return true;
    }
    default:
      return false;
  }
}

function message(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export function runFuzz(
  variant: Variant,
  actions: Action[],
  drainSeed = 0,
  trace?: (line: string) => void
) {
  const clients: Client[] = [];

  const seedDoc = new Y.Doc();
  const seedRoot = seedDoc.get('content', Y.XmlText) as Y.XmlText;
  seedRoot.applyDelta(slateNodesToInsertDelta(initialValue(variant)));
  const seedState = Y.encodeStateAsUpdate(seedDoc);

  for (let id = 0; id < variant.clients; id += 1) {
    const doc = new Y.Doc();
    Y.applyUpdate(doc, seedState, REMOTE);
    const sharedRoot = doc.get('content', Y.XmlText) as Y.XmlText;
    const editor = withYjs(applySchema(createEditor(), variant), sharedRoot);
    const client: Client = { id, doc, editor, inbox: [] };

    doc.on('update', (update: Uint8Array, origin: unknown) => {
      if (origin === REMOTE) {
        return;
      }
      clients.forEach((other) => {
        if (other !== client) {
          other.inbox.push(update);
        }
      });
    });

    clients.push(client);
  }

  let step = -1;
  const fail = (
    kind: FuzzFailure['kind'],
    client: Client,
    msg: string
  ): never => {
    throw new FuzzError({ kind, client: client.id, step, message: msg });
  };

  const flush = (client: Client) => {
    try {
      client.editor.onChange();
      trace?.(
        `  flush ${client.id} yjs=${JSON.stringify(
          yTextToSlateElement(client.editor.sharedRoot).children
        )}`
      );
    } catch (error) {
      fail('flush-throw', client, message(error));
    }
  };

  const checkAgainstYjs = (client: Client) => {
    if (YjsEditor.localChanges(client.editor).length > 0) {
      return;
    }
    const fromYjs = normalized(
      variant,
      yTextToSlateElement(client.editor.sharedRoot).children
    );
    if (!sameJson(client.editor.children, fromYjs)) {
      fail(
        'diverged-from-yjs',
        client,
        `editor ${JSON.stringify(
          client.editor.children
        )}\nyjs    ${JSON.stringify(fromYjs)}`
      );
    }
  };

  const deliver = (client: Client, index: number) => {
    if (client.inbox.length === 0) {
      return;
    }
    const i = Math.abs(index) % client.inbox.length;
    const [update] = client.inbox.splice(i, 1);
    trace?.(`  deliver to ${client.id} (${update.length} bytes)`);
    try {
      Y.applyUpdate(client.doc, update, REMOTE);
    } catch (error) {
      fail('remote-throw', client, message(error));
    }
  };

  clients.forEach((client) => {
    try {
      client.editor.connect();
    } catch (error) {
      fail('remote-throw', client, `connect: ${message(error)}`);
    }
    flush(client);
    checkAgainstYjs(client);
  });

  actions.forEach((action, index) => {
    step = index;
    const client = clients[Math.abs(action.client) % clients.length];
    trace?.(`step ${index} client ${client.id} ${JSON.stringify(action)}`);
    const { editor } = client;

    // Two in ten actions deliver a pending remote update instead of editing.
    if (Math.abs(action.kind) % 10 >= 8) {
      deliver(client, action.a);
      if (variant.eagerFlush || Math.abs(action.c) % 4 !== 0) {
        flush(client);
      }
      checkAgainstYjs(client);
      return;
    }

    // Plain Slate is the reference. If it rejects the edit, skip it.
    const reference = plainEditor(variant, editor.children);
    try {
      if (!applyLocalEdit(reference, variant, action)) {
        return;
      }
    } catch {
      return;
    }

    try {
      applyLocalEdit(editor, variant, action);
      trace?.(`  local -> ${JSON.stringify(editor.children)}`);
    } catch (error) {
      fail('local-throw', client, message(error));
    }

    if (!sameJson(editor.children, reference.children)) {
      fail(
        'local-mismatch',
        client,
        `bound     ${JSON.stringify(
          editor.children
        )}\nreference ${JSON.stringify(reference.children)}`
      );
    }

    // One in four edits stays unflushed, so a later remote update lands in
    // the flush window.
    if (variant.eagerFlush || Math.abs(action.c) % 4 !== 0) {
      flush(client);
      checkAgainstYjs(client);
    }
  });

  // Drain the network in a seeded order until nothing is pending. Flushing can
  // produce new updates (normalization), so loop a few rounds.
  step = actions.length;
  let cursor = drainSeed;
  const nextIndex = () => {
    cursor = (cursor * 1103515245 + 12345) % 2147483648;
    return cursor;
  };
  const drainRound = () => {
    clients.forEach(flush);
    if (clients.every((c) => c.inbox.length === 0)) {
      return false;
    }
    clients.forEach((client) => {
      while (client.inbox.length > 0) {
        deliver(client, nextIndex());
        if (variant.eagerFlush) {
          flush(client);
        }
      }
    });
    return true;
  };
  for (let round = 0; round < 20 && drainRound(); round += 1) {
    // drainRound does the work
  }

  clients.forEach(checkAgainstYjs);

  const [first, ...rest] = clients;
  const firstState = yTextToSlateElement(first.editor.sharedRoot).children;
  rest.forEach((client) => {
    const state = yTextToSlateElement(client.editor.sharedRoot).children;
    if (!sameJson(state, firstState)) {
      fail(
        'clients-diverged',
        client,
        `client ${client.id} ${JSON.stringify(
          state
        )}\nclient 0 ${JSON.stringify(firstState)}`
      );
    }
    if (!sameJson(client.editor.children, first.editor.children)) {
      fail(
        'clients-diverged',
        client,
        `editor ${client.id} ${JSON.stringify(
          client.editor.children
        )}\neditor 0 ${JSON.stringify(first.editor.children)}`
      );
    }
  });
}
