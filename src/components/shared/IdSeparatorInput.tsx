import { messages } from '../../i18n/messages';
import { FilterDropdown } from './FilterDropdown';

export function IdSeparatorInput({
  id,
  value,
  prefix,
  disabled,
  showPreview = true,
  onChange,
}: {
  id: string;
  value: 'none' | 'hyphen';
  prefix: string;
  disabled?: boolean;
  showPreview?: boolean;
  onChange: (value: 'none' | 'hyphen') => void;
}) {
  return (
    <div className="id-separator-input">
      <FilterDropdown
        id={id}
        label={messages.idSeparator}
        value={value}
        disabled={disabled}
        options={[
          { value: 'none', label: messages.none },
          { value: 'hyphen', label: messages.hyphen },
        ]}
        onChange={(value) => {
          if (value === 'none' || value === 'hyphen') onChange(value);
        }}
      />
      {showPreview ? (
        <small>
          {messages.previewPrefix} {prefix}
          {value === 'hyphen' ? '-' : ''}001
        </small>
      ) : null}
    </div>
  );
}
