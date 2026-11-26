/* eslint-disable import/no-extraneous-dependencies */
import { createEditor, Transforms } from 'slate';
import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import { withYHistory, withYjs } from '../src';

describe('withYHistory', () => {
  it("doesn't map the selection while disconnected", () => {
    // The shared root stays empty until the provider's first sync, while
    // Slate already renders a placeholder value that can get a selection,
    // for example from autofocus.
    const doc = new Y.Doc();
    const root = doc.get('content', Y.XmlText) as Y.XmlText;
    const editor = withYHistory(
      withYjs(createEditor(), root, { autoConnect: false })
    );
    editor.children = [{ type: 'paragraph', children: [{ text: '' }] }];
    Transforms.select(editor, { path: [0, 0], offset: 0 });

    expect(() => editor.onChange()).not.toThrow();
  });
});
