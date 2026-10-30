import * as Picker from 'emoji-picker-react/primitives';
import { emojiSearchData } from '../../views/emoji-search-data';
import { getLanguage } from '../../i18n/messages';
import { emojiPickerLabels } from '../../views/emoji-picker-labels';

export default function EpicEmojiCatalog({ onSelect }: { onSelect: (emoji: string) => void }) {
  return (
    <Picker.Root
      appearance="default"
      columns={12}
      key={getLanguage()}
      emojiStyle="native"
      colorScheme="light"
      emojiData={emojiSearchData(getLanguage())}
      lang={getLanguage()}
      className="worktree-emoji-catalog"
      style={{ width: '100%', height: 350 }}
      autoFocusSearch={false}
      labels={emojiPickerLabels()}
      onEmojiClick={(data) => {
        if (!data.isCustom) onSelect(data.emoji);
      }}
    >
      <div className="epic-emoji-search">
        <Picker.SearchInput className="epic-icon-search" />
      </div>
      <Picker.Viewport>
        <Picker.List />
        <Picker.Empty />
        <Picker.Loading />
        <Picker.LoadError />
      </Picker.Viewport>
    </Picker.Root>
  );
}
