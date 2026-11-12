import { describe, expect, test } from 'vitest';
import { parseQuickEntry } from '../quickEntry';

describe('snabbköp från röst eller text', () => {
  test.each([
    ['Ica 143', { name: 'Ica', amount: 143 }],
    ['ICA 143 kronor', { name: 'ICA', amount: 143 }],
    ['143 kr på Ica', { name: 'Ica', amount: 143 }],
    ['Ica för 1 250 kr', { name: 'Ica', amount: 1250 }],
    ['Max 129,50', { name: 'Max', amount: 130 }],
    ['köpte biobiljetter 260 kr', { name: 'Biobiljetter', amount: 260 }],
  ])('%s', (text, expected) => {
    expect(parseQuickEntry(text)).toEqual(expected);
  });

  test.each(['89 kr', '143 kronor', '50 SEK', 'Ica', '', '0 kr Ica'])(
    'bara belopp, bara namn eller 0 kr ger inget köp: "%s"',
    (text) => {
      expect(parseQuickEntry(text)).toBeNull();
    },
  );
});
