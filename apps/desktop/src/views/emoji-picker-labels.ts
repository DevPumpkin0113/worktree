import type { PickerLabels } from 'emoji-picker-react';
import { messages } from '../i18n/messages';

export function emojiPickerLabels(): Partial<PickerLabels> {
  return {
    searchPlaceholder: messages.emojiLabelSearchPlaceholder,
    searchLabel: messages.emojiLabelSearchLabel,
    searchClear: messages.emojiLabelSearchClear,
    searchResultsNone: messages.emojiLabelSearchResultsNone,
    searchResultsOne: messages.emojiLabelSearchResultsOne,
    searchResultsMany: messages.emojiLabelSearchResultsMany,
    categoryNavigation: messages.emojiLabelCategoryNavigation,
    loading: messages.emojiLabelLoading,
    loadingError: messages.emojiLabelLoadingError,
    retryLoading: messages.emojiLabelRetryLoading,
    reactions: messages.emojiLabelReactions,
    expandReactions: messages.emojiLabelExpandReactions,
    skinToneNeutral: messages.emojiLabelSkinToneNeutral,
    skinToneLight: messages.emojiLabelSkinToneLight,
    skinToneMediumLight: messages.emojiLabelSkinToneMediumLight,
    skinToneMedium: messages.emojiLabelSkinToneMedium,
    skinToneMediumDark: messages.emojiLabelSkinToneMediumDark,
    skinToneDark: messages.emojiLabelSkinToneDark,
  };
}
