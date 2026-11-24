import * as Y from 'yjs';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function assertDocumentAttachment<T extends Y.AbstractType<any>>(
  sharedType: T
): asserts sharedType is T & { doc: NonNullable<T['doc']> } {
  if (!sharedType.doc) {
    throw new Error("shared type isn't attached to a document");
  }
}

// Options for Y.Text#applyDelta that keep the content exactly as given. Yjs
// strips a trailing "\n" from the last insert at the end of the text when
// `sanitize` is false (the reverse of what the name suggests), which drops
// soft line breaks. See https://github.com/yjs/yjs/issues/848.
export const PRESERVE_CONTENT = { sanitize: true };
