/** @jsx jsx */
import { Editor, Transforms } from 'slate';
import { jsx } from '../../../../../../support/jsx';

export const input = (
  <editor>
    <unstyled>
      abc
      <note-link noteId="note1">here</note-link>
      <text bold>def</text>
    </unstyled>
  </editor>
);

export const expected = (
  <editor>
    <unstyled>
      <text />
      <note-link noteId="note1">here</note-link>
      <text bold>def</text>
      abc
    </unstyled>
  </editor>
);

export function run(editor: Editor) {
  Transforms.moveNodes(editor, { at: [0, 0], to: [0, 2] });
}
