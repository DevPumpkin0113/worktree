import fs from 'node:fs';
import path from 'node:path';
import { DEFAULT_TASK_TYPES } from '@worktree/core/default-task-types';
import { defaultPriorities } from '@worktree/core/project-priorities';
import {
  validProjectRuleValues,
  validTaskPrefix,
  validInitializationDirectory,
  projectRuleValues,
} from '@worktree/core/project-initialization';
import {
  composeDateFormat,
  type DateOrder,
  type DateSeparator,
} from '@worktree/core/project-display';
import { projectFolder, hasProjectMarker } from './project-location';
import { initializeProject } from './init-command';
import { CliError } from './errors';
import { errorMessage } from './i18n/error-messages';
import type { Options } from './arguments';
import type { Ask } from './init-prompts';

export function wantsInitWizard(options: Options, terminal: boolean) {
  return (
    options.command === 'init' &&
    terminal &&
    !options.json &&
    !options.yes &&
    !options.noInteractive &&
    !options.values.input
  );
}
export async function initWizard(
  options: Options,
  ask: Ask,
  write: (text: string) => void,
): Promise<boolean> {
  const t = (ko: string, en: string) => (options.language === 'ko' ? ko : en);
  const root = projectFolder(options.project);
  if (hasProjectMarker(root))
    throw new CliError(
      'ALREADY_INITIALIZED',
      errorMessage('aProjectMarkerAlreadyExistsInitializationNeverOverwritesIt'),
    );
  const reset = path.join(root, '.worktree-reset.json');
  if (fs.lstatSync(reset, { throwIfNoEntry: false }))
    throw new CliError('RECOVERY_REQUIRED', errorMessage('pendingReset', [reset]));
  const cancelled = Symbol('cancelled');
  async function text(
    label: string,
    initial: string,
    valid: (value: string) => boolean,
    hint: string,
  ) {
    for (;;) {
      const value = await ask(label, initial);
      if (value === undefined) throw cancelled;
      if (valid(value)) return value;
      write(hint);
    }
  }
  async function select(label: string, choices: string[], initial: number) {
    write(label + '\n' + choices.map((choice, i) => `  ${i + 1}. ${choice}`).join('\n'));
    const value = await text(
      t('번호 선택 / Enter로 기본값', 'Select a number / Enter for default'),
      String(initial + 1),
      (v) => /^\d+$/.test(v) && Number(v) >= 1 && Number(v) <= choices.length,
      t('목록에 있는 번호를 입력하세요.', 'Enter a number from the list.'),
    );
    return Number(value) - 1;
  }
  try {
    write(
      t(
        '프로젝트 초기화 · Enter: 기본값 · Ctrl+C: 취소',
        'Project setup · Enter: default · Ctrl+C: cancel',
      ),
    );
    write(root);
    options.values.name = await text(
      t('프로젝트 이름', 'Project name'),
      options.values.name ?? path.basename(root),
      (v) => !!v && v.length <= 200 && !/[\r\n\0]/.test(v),
      t('이름은 1~200자로 입력하세요.', 'Enter a name of 1–200 characters.'),
    );
    options.values.directory = await text(
      t('데이터 저장 위치 (루트 상대 경로)', 'Data directory (relative to root)'),
      options.values.directory ?? 'docs/worktree',
      (v) => validInitializationDirectory(v),
      t(
        '루트 내부 상대 경로를 입력하세요. 예: docs/worktree',
        'Enter a relative path inside the root, e.g. docs/worktree.',
      ),
    );
    options.values.prefix = (
      await text(
        t('작업 ID 접두어', 'Task ID prefix'),
        options.values.prefix ?? 'W',
        (v) => validTaskPrefix(v.replace(/[a-z]/g, (c) => c.toUpperCase())),
        t('MS를 제외한 영문 1~20자를 입력하세요.', 'Enter 1–20 ASCII letters, excluding MS.'),
      )
    ).toUpperCase();
    const customize = await select(
      t('작업 규칙', 'Task rules'),
      [t('기본 규칙 사용', 'Use default rules'), t('직접 설정', 'Customize')],
      0,
    );
    if (customize) {
      options.values['id-separator'] = ['none', 'hyphen'][
        await select(
          t('ID 표시 구분자', 'ID display separator'),
          ['W001 / MS001', 'W-001 / MS-001'],
          options.values['id-separator'] === 'hyphen' ? 1 : 0,
        )
      ];
      const orders: DateOrder[] = ['ymd', 'dmy', 'mdy'];
      const order =
        orders[
          await select(t('날짜 순서', 'Date order'), ['yyyy MM dd', 'dd MM yyyy', 'MM dd yyyy'], 0)
        ];
      const separators: DateSeparator[] = ['-', '.', '/'];
      const separator =
        separators[await select(t('날짜 구분 기호', 'Date separator'), separators, 0)];
      options.values['date-format'] = composeDateFormat(order, separator);
      options.values['time-format'] = ['24h', '12h'][
        await select(
          t('시간 형식', 'Time format'),
          ['24h', '12h'],
          options.values['time-format'] === '12h' ? 1 : 0,
        )
      ];
      options.values['use-effort'] = ['false', 'true'][
        await select(
          t('예상 작업 시간 사용', 'Use estimated work hours'),
          [t('사용 안 함', 'Disabled'), t('사용', 'Enabled')],
          options.values['use-effort'] === 'true' ? 1 : 0,
        )
      ];
      const list = async (ko: string, en: string, initial = '') =>
        projectRuleValues(
          await text(
            t(ko, en),
            initial,
            (v) => validProjectRuleValues(v),
            t(
              '쉼표로 구분하고 중복 항목은 제거하세요.',
              'Use commas and remove duplicate entries.',
            ),
          ),
        );
      const assignees = await list(
        '담당자 (쉼표 구분, 선택)',
        'Assignees (comma-separated, optional)',
      );
      const labels = await list(
        '공통 라벨 (쉼표 구분, 선택)',
        'Common labels (comma-separated, optional)',
      );
      const taskTypes = projectRuleValues(
        await text(
          t('작업 유형 (쉼표 구분)', 'Task types (comma-separated)'),
          DEFAULT_TASK_TYPES.join(', '),
          (v) => validProjectRuleValues(v, true),
          t('중복 없이 유형을 하나 이상 입력하세요.', 'Enter at least one unique task type.'),
        ),
      );
      const defaults = defaultPriorities();
      const names = await list(
        '우선순위 (높은 순서대로, 쉼표 구분)',
        'Priorities (highest first, comma-separated)',
        defaults.map((p) => p.name).join(', '),
      );
      options.initialization = {
        assignees,
        labels,
        taskTypes,
        priorities: names.map((name, i) => ({ id: defaults[i]?.id ?? `priority-${i + 1}`, name })),
      };
    }
    const preview = initializeProject({ ...options, dryRun: true });
    write(t('최종 확인', 'Review'));
    write(
      `${preview.project}\n${path.join(root, preview.dataDirectory)}\n${preview.prefix}001 · ${options.values['id-separator'] ?? 'none'} · ${options.values['date-format'] ?? 'yyyy-MM-dd'} · ${options.values['time-format'] ?? '24h'}`,
    );
    const rules = preview.settings;
    write(
      `${t('작업 유형', 'Task types')}: ${rules.taskTypes.join(', ')}\n${t('라벨', 'Labels')}: ${rules.labels.join(', ') || '-'}\n${t('담당자', 'Assignees')}: ${(rules.assignees ?? []).join(', ') || '-'}\n${t('우선순위 (높은 순)', 'Priorities (highest first)')}: ${(rules.priorities ?? []).map((p) => p.name).join(' > ') || '-'}\n${t('예상 작업 시간', 'Estimated hours')}: ${rules.useEffort ? t('사용', 'Enabled') : t('사용 안 함', 'Disabled')}`,
    );
    const decision = await select(
      options.dryRun
        ? t('미리보기 결과를 표시할까요?', 'Show the preview result?')
        : t('이 설정으로 생성할까요?', 'Create with these settings?'),
      [t('생성 / 계속', 'Create / continue'), t('취소', 'Cancel')],
      0,
    );
    if (decision) throw cancelled;
    return true;
  } catch (error) {
    if (error !== cancelled) throw error;
    write(
      t(
        '초기화를 취소했습니다. 파일은 생성하지 않았습니다.',
        'Setup cancelled. No files were created.',
      ),
    );
    return false;
  }
}
