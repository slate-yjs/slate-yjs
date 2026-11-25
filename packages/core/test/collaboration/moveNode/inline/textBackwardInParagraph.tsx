/** @jsx jsx */
import { Editor, Transforms } from 'slate';
import { jsx } from '../../../../../../support/jsx';

export const input = (
  <editor>
    <unstyled>
      abc
      <note-link noteId="note1">here</note-link>
      <text bold>def</text>
      ghi
    </unstyled>
  </editor>
);

export const expected = (
  <editor>
    <unstyled>
      <text bold>def</text>
      abc
      <note-link noteId="note1">here</note-link>
      ghi
    </unstyled>
  </editor>
);

export function run(editor: Editor) {
  Transforms.moveNodes(editor, { at: [0, 2], to: [0, 0] });
}

// Every element is void in voids mode, so moveNodes skips the paragraph.
export const skipVoidsMode = true;
