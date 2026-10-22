import { getLanguage, setLanguage } from '@worktree/core/i18n/messages';
export function selectLanguage(args: string[]) {
  const index = args.indexOf('--lang');
  const value = index < 0 ? 'en' : args[index + 1];
  setLanguage(value === 'ko' ? 'ko' : 'en');
}
export function systemError(code: string) {
  const english = getLanguage() === 'en';
  const messages: Record<string, [string, string]> = {
    ENOENT: ['파일 또는 폴더를 찾을 수 없습니다.', 'File or folder not found.'],
    EACCES: ['파일 접근 권한이 없습니다.', 'Access to the file was denied.'],
    EPERM: ['파일 작업이 허용되지 않았습니다.', 'The file operation was not permitted.'],
    STORAGE_ERROR: ['저장 처리에 실패했습니다.', 'Storage operation failed.'],
    STORAGE_LOCK_FAILED: [
      '저장 잠금을 얻지 못했습니다. 잠시 후 재시도하세요.',
      'Could not acquire the storage lock. Retry shortly.',
    ],
    RECOVERY_REQUIRED: [
      '복구가 필요합니다. recover --dry-run으로 확인하세요.',
      'Recovery required. Inspect with recover --dry-run.',
    ],
    COMMAND_FAILED: ['명령 처리에 실패했습니다.', 'Command processing failed.'],
    INPUT_JSON: ['JSON 입력을 확인하세요.', 'Check the JSON input.'],
    INPUT_ENCODING: ['입력은 올바른 UTF-8이어야 합니다.', 'Input must be valid UTF-8.'],
  };
  return messages[code]?.[english ? 1 : 0] ?? messages.COMMAND_FAILED[english ? 1 : 0];
}
