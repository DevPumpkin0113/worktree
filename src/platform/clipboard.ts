export async function copyText(
  text: string,
  environment: {
    navigator?: { clipboard?: Pick<Clipboard, 'writeText'> };
    document?: Document;
  } = globalThis,
) {
  try {
    if (environment.navigator?.clipboard?.writeText) {
      await environment.navigator.clipboard.writeText(text);
      return;
    }
  } catch {}
  const doc = environment.document;
  if (!doc?.body || !doc.execCommand) throw Error('클립보드에 접근할 수 없습니다.');
  const previous = doc.activeElement;
  const input = doc.createElement('textarea');
  input.value = text;
  input.readOnly = true;
  input.style.cssText = 'position:fixed;left:-10000px;top:0;';
  doc.body.append(input);
  try {
    input.focus({ preventScroll: true });
    input.select();
    if (!doc.execCommand('copy')) throw Error('클립보드 복사에 실패했습니다.');
  } finally {
    input.remove();
    (previous as HTMLElement | null)?.focus?.({ preventScroll: true });
  }
}
