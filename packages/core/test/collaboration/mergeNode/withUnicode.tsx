/** @jsx jsx */
import { Editor } from 'slate';
import { jsx } from '../../support/jsx';

export const skipVoidsMode = true;

export const input = (
  <editor>
    <unstyled id="block1">{'Iñtërnâtiônàlizætiøn☃💩\uFEFF'}</unstyled>
    <unstyled id="block2">
      <cursor />H{'Iñtërnâtiônàlizætiøn☃💩\uFEFF'}
    </unstyled>
  </editor>
);

export const expected = (
  <editor>
    <unstyled id="block1">
      {'Iñtërnâtiônàlizætiøn☃💩\uFEFF'}
      <cursor />H{'Iñtërnâtiônàlizætiøn☃💩\uFEFF'}
    </unstyled>
  </editor>
);

export function run(editor: Editor) {
  editor.deleteBackward('character');
}
