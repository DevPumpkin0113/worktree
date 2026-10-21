import { messages } from '../../i18n/messages';
import { Icon } from '../shared/Icon';

export function TitlebarSearch({
  query,
  disabled,
  onChange,
}: {
  query: string;
  disabled: boolean;
  onChange: (query: string) => void;
}) {
  return (
    <label className="titlebar-search">
      <Icon name="search" />
      <input
        id="search"
        autoComplete="off"
        aria-label={messages.searchTasks}
        placeholder={messages.searchPlaceholder}
        value={query}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
