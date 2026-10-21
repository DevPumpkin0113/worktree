import {
  DATE_ORDERS,
  DATE_SEPARATORS,
  composeDateFormat,
  dateFormatParts,
  type DateOrder,
  type DateSeparator,
} from '../../domain/project-display';
import {
  TIME_FORMATS,
  formatProjectTimestamp,
  type DateFormat,
  type TimeFormat,
} from '../../views/date-format';
import { getLanguage, messages } from '../../i18n/messages';
import { FilterDropdown } from './FilterDropdown';

export function DateTimeFormatInput({
  id,
  dateFormat,
  timeFormat,
  onChange,
  disabled,
}: {
  id: string;
  dateFormat: DateFormat;
  timeFormat: TimeFormat;
  onChange: (change: { dateFormat?: DateFormat; timeFormat?: TimeFormat }) => void;
  disabled?: boolean;
}) {
  const { order, separator } = dateFormatParts(dateFormat);
  const orderLabels = {
    ymd: messages.dateOrderYmd,
    dmy: messages.dateOrderDmy,
    mdy: messages.dateOrderMdy,
  };
  return (
    <div className="date-time-format-input">
      <div className="task-editor-field">
        <span>{messages.dateOrder}</span>
        <FilterDropdown
          id={id + '-date-order'}
          label={messages.dateOrder}
          value={order}
          disabled={disabled}
          options={DATE_ORDERS.map((value) => ({ value, label: orderLabels[value] }))}
          onChange={(value) => {
            if (DATE_ORDERS.includes(value as DateOrder))
              onChange({ dateFormat: composeDateFormat(value as DateOrder, separator) });
          }}
        />
      </div>
      <div className="task-editor-field">
        <span>{messages.dateSeparator}</span>
        <FilterDropdown
          id={id + '-date-separator'}
          label={messages.dateSeparator}
          value={separator}
          disabled={disabled}
          options={DATE_SEPARATORS.map((value) => ({ value, label: value }))}
          onChange={(value) => {
            if (DATE_SEPARATORS.includes(value as DateSeparator))
              onChange({ dateFormat: composeDateFormat(order, value as DateSeparator) });
          }}
        />
      </div>
      <div className="task-editor-field">
        <span>{messages.timeFormat}</span>
        <FilterDropdown
          id={id + '-time'}
          label={messages.timeFormat}
          value={timeFormat}
          disabled={disabled}
          options={TIME_FORMATS.map((value) => ({
            value,
            label: value === '24h' ? messages.time24Hour : messages.time12Hour,
          }))}
          onChange={(value) => {
            if (TIME_FORMATS.includes(value as TimeFormat))
              onChange({ timeFormat: value as TimeFormat });
          }}
        />
      </div>
      <small>
        {messages.previewPrefix}{' '}
        {formatProjectTimestamp(
          new Date(2026, 9, 21, 14, 30).toISOString(),
          dateFormat,
          timeFormat,
          getLanguage(),
        )}
      </small>
    </div>
  );
}
