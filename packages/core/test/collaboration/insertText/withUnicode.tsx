/** @jsx jsx */
import { Editor } from 'slate';
import { jsx } from '../../support/jsx';

export const input = (
  <editor>
    <unstyled>
      {'Iñtërnâtiônàlizætiøn☃💩\uFEFF'}
      <cursor />
      {'Iñtërnâtiônàlizætiøn☃💩\uFEFF'}
    </unstyled>
  </editor>
);

export const expected = (
  <editor>
    <unstyled>
      {'Iñtërnâtiônàlizætiøn☃💩\uFEFF'}
      {'Iñtërnâtiônàlizætiøn☃💩\uFEFF'}
      <cursor />
      {'Iñtërnâtiônàlizætiøn☃💩\uFEFF'}
    </unstyled>
  </editor>
);

export function run(editor: Editor) {
  editor.insertText('Iñtërnâtiônàlizætiøn☃💩\uFEFF', { voids: true });
}
