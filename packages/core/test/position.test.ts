/* eslint-disable import/no-extraneous-dependencies */
import { BasePoint, Editor, Node, Text } from 'slate';
import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import {
  relativePositionToSlatePoint,
  slateNodesToInsertDelta,
  slatePointToRelativePosition,
} from '../src';

function sharedRootFor(children: unknown[]) {
  const doc = new Y.Doc();
  const sharedRoot = doc.get('content', Y.XmlText) as Y.XmlText;
  sharedRoot.applyDelta(
    slateNodesToInsertDelta(children as Editor['children'])
  );
  return sharedRoot;
}

// Every point in every text node of the document.
function allPoints(root: Node): BasePoint[] {
  return Array.from(Node.texts(root)).flatMap(([text, path]) =>
    Array.from({ length: (text as Text).text.length + 1 }, (_, offset) => ({
      path,
      offset,
    }))
  );
}

const link = (text: string) => ({ type: 'link', children: [{ text }] });

describe('slate point <-> relative position', () => {
  const documents: Record<string, unknown[]> = {
    'inline at the end of a block': [
      {
        type: 'paragraph',
        children: [{ text: 'abc' }, link('note'), { text: '' }],
      },
    ],
    'inline at the start of a block': [
      {
        type: 'paragraph',
        children: [{ text: '' }, link('note'), { text: 'abc' }],
      },
    ],
    'adjacent inlines': [
      {
        type: 'paragraph',
        children: [
          { text: '' },
          link('one'),
          { text: '' },
          link('two'),
          { text: '' },
        ],
      },
    ],
    'inline between text': [
      {
        type: 'paragraph',
        children: [{ text: 'ab' }, link('note'), { text: 'cd', bold: true }],
      },
    ],
  };

  Object.entries(documents).forEach(([name, children]) => {
    it(`maps every point back to itself: ${name}`, () => {
      const sharedRoot = sharedRootFor(children);
      const slateRoot = { children } as Node;

      allPoints(slateRoot).forEach((point) => {
        const relative = slatePointToRelativePosition(
          sharedRoot,
          slateRoot,
          point
        );
        expect(
          relativePositionToSlatePoint(sharedRoot, slateRoot, relative)
        ).toEqual(point);
      });
    });
  });
});
