export function projectRuleValues(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}
export function validProjectRuleValues(value: string, required = false) {
  const values = projectRuleValues(value);
  return (
    (!required || values.length > 0) &&
    new Set(values).size === values.length &&
    values.every((item) => !/[\r\n\0]/.test(item))
  );
}
