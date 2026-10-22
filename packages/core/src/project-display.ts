export const DATE_ORDERS = ['ymd', 'dmy', 'mdy'] as const;
export const DATE_SEPARATORS = ['-', '.', '/'] as const;
export const TIME_FORMATS = ['24h', '12h'] as const;
export type DateOrder = (typeof DATE_ORDERS)[number];
export type DateSeparator = (typeof DATE_SEPARATORS)[number];
export type DateFormat = {
  [S in DateSeparator]: `yyyy${S}MM${S}dd` | `dd${S}MM${S}yyyy` | `MM${S}dd${S}yyyy`;
}[DateSeparator];
export type TimeFormat = (typeof TIME_FORMATS)[number];
export function composeDateFormat(order: DateOrder, separator: DateSeparator): DateFormat {
  const parts = { ymd: ['yyyy', 'MM', 'dd'], dmy: ['dd', 'MM', 'yyyy'], mdy: ['MM', 'dd', 'yyyy'] };
  return parts[order].join(separator) as DateFormat;
}
export function dateFormatParts(format: DateFormat): {
  order: DateOrder;
  separator: DateSeparator;
} {
  return {
    order: format.startsWith('yyyy') ? 'ymd' : format.startsWith('dd') ? 'dmy' : 'mdy',
    separator: format.includes('-') ? '-' : format.includes('.') ? '.' : '/',
  };
}
export const DATE_FORMATS = DATE_ORDERS.flatMap((order) =>
  DATE_SEPARATORS.map((separator) => composeDateFormat(order, separator)),
);
