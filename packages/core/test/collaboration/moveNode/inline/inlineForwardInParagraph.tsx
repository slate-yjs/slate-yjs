/** @jsx jsx */
import { Editor, Transforms } from 'slate';
import { jsx } from '../../../../../../support/jsx';

// From #391: moving a node forward within its parent.
export const input = (
  <editor>
    <unstyled>
      <text />
      <note-link noteId="note1">here</note-link>
      abc
      <text bold>def</text>
    </unstyled>
  </editor>
);

export const expected = (
  <editor>
    <unstyled>
      abc
      <text bold>def</text>
      <note-link noteId="note1">here</note-link>
      <text />
    </unstyled>
  </editor>
);

export function run(editor: Editor) {
  Transforms.moveNodes(editor, { at: [0, 1], to: [0, 3] });
}
