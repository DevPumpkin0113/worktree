import type { EmojiData } from 'emoji-picker-react';
import english from 'emoji-picker-react/data/emojis-en';
import korean from 'emoji-picker-react/data/emojis-ko';

function withSearchAliases(base: EmojiData, alternate: EmojiData): EmojiData {
  const aliases = new Map(
    Object.values(alternate.emojis)
      .flat()
      .map((emoji) => [emoji.u, emoji.n]),
  );
  return {
    categories: base.categories,
    emojis: Object.fromEntries(
      Object.entries(base.emojis).map(([category, emojis]) => [
        category,
        emojis.map((emoji) => {
          // The library uses the last keyword as the display name; keep it localized.
          const name = emoji.n.at(-1);
          const keywords = [...new Set([...emoji.n, ...(aliases.get(emoji.u) ?? [])])];
          return {
            ...emoji,
            n: name ? [...keywords.filter((keyword) => keyword !== name), name] : keywords,
          };
        }),
      ]),
    ),
  };
}

const datasets = {
  ko: withSearchAliases(korean, english),
  en: withSearchAliases(english, korean),
};

export function emojiSearchData(language: 'ko' | 'en'): EmojiData {
  return datasets[language];
}
