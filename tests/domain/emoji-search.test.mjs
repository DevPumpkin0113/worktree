import { test } from 'node:test';
import assert from 'node:assert/strict';
import { searchEmojis } from 'emoji-picker-react/data';
import english from 'emoji-picker-react/data/emojis-en';
import korean from 'emoji-picker-react/data/emojis-ko';
import { emojiSearchData } from '../../apps/desktop/src/views/emoji-search-data.ts';

test('emoji search accepts Korean and English in either UI language while retaining localized names', () => {
  const before = JSON.stringify([english, korean]);
  for (const language of ['ko', 'en']) {
    const data = emojiSearchData(language);
    for (const query of ['로켓', 'rocket', 'ROCKET']) {
      assert.ok(searchEmojis(query, { emojiData: data }).some(emoji => emoji.unified === '1f680'), language + ': ' + query);
    }
    const original = language === 'ko' ? korean : english;
    assert.equal(data.categories, original.categories);
    for (const [category, emojis] of Object.entries(original.emojis)) {
      assert.equal(data.emojis[category].length, emojis.length);
      emojis.forEach((emoji, index) => {
        assert.equal(data.emojis[category][index].u, emoji.u);
        assert.equal(data.emojis[category][index].n.at(-1), emoji.n.at(-1));
      });
    }
  }
  assert.equal(JSON.stringify([english, korean]), before);
});
