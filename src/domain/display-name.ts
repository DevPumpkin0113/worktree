export const MAX_DISPLAY_NAME_LENGTH = 40;

export function validDisplayName(value: unknown, allowEmpty = false): value is string {
  return (
    typeof value === 'string' &&
    (allowEmpty || value.length > 0) &&
    value === value.trim() &&
    value.length <= MAX_DISPLAY_NAME_LENGTH &&
    !/[\r\n\0]/.test(value)
  );
}
