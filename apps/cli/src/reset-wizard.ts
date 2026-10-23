import type { Options } from './arguments';
import type { Ask } from './init-prompts';
import { resetProject } from './project-reset';

export function wantsResetWizard(options: Options, terminal: boolean) {
  return (
    options.command === 'project-reset' &&
    terminal &&
    !options.json &&
    !options.yes &&
    !options.dryRun
  );
}
export async function resetWizard(options: Options, ask: Ask, write: (text: string) => void) {
  const preview = resetProject({ ...options, dryRun: true });
  const ko = options.language === 'ko';
  write(
    ko
      ? '프로젝트 초기화: 아래 폴더 전체와 설정 파일을 영구 삭제합니다. 되돌릴 수 없습니다.'
      : 'Project reset permanently deletes the entire data folder and marker below. There is no undo.',
  );
  write(preview.deletedPaths.join('\n'));
  write(
    ko
      ? `작업 ${preview.taskCount}개 · 마일스톤 ${preview.milestoneCount}개 · 댓글 ${preview.commentCount}개`
      : `${preview.taskCount} tasks · ${preview.milestoneCount} milestones · ${preview.commentCount} comments`,
  );
  const name = await ask(
    ko
      ? `프로젝트명을 정확히 입력하세요: ${preview.project}`
      : `Enter the exact project name: ${preview.project}`,
    '',
  );
  if (name === undefined || name !== preview.project) {
    write(
      ko ? '초기화를 취소했습니다. 삭제하지 않았습니다.' : 'Reset cancelled. Nothing was deleted.',
    );
    return false;
  }
  options.values['confirm-name'] = name;
  options.values.expect = preview.revision;
  options.yes = true;
  return true;
}
