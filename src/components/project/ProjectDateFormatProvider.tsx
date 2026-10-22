import { createContext, useContext, type ReactNode } from 'react';
import { getLanguage } from '../../i18n/messages';
import {
  formatProjectDate,
  formatProjectTimestamp,
  type DateFormat,
  type TimeFormat,
} from '../../views/date-format';

const DateSettings = createContext<{ dateFormat: DateFormat; timeFormat: TimeFormat }>({
  dateFormat: 'yyyy-MM-dd',
  timeFormat: '24h',
});
export function ProjectDateFormatProvider({
  children,
  dateFormat = 'yyyy-MM-dd',
  timeFormat = '24h',
}: {
  children: ReactNode;
  dateFormat?: DateFormat;
  timeFormat?: TimeFormat;
}) {
  return (
    <DateSettings.Provider value={{ dateFormat, timeFormat }}>{children}</DateSettings.Provider>
  );
}
export function useProjectDates() {
  const { dateFormat, timeFormat } = useContext(DateSettings);
  return {
    date: (value: string) => formatProjectDate(value, dateFormat),
    timestamp: (value?: string) =>
      formatProjectTimestamp(value, dateFormat, timeFormat, getLanguage()),
  };
}
