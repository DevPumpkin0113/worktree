import { commandGroups, singleCommands } from './help-topics';
type Language = 'ko' | 'en';
type Text = [string, string];
const descriptions: Record<string, Text> = {
  batch: [
    'JSON의 작업·마일스톤·댓글 명령을 모두 검증한 뒤 한 번에 저장합니다.',
    'Validate task, milestone and comment commands, then save once.',
  ],
  recover: [
    '중단된 저장·초기화 기록을 검사하거나 복구합니다.',
    'Inspect or recover interrupted saves and resets.',
  ],
  init: [
    '새 폴더에 프로젝트 문서 집합을 생성합니다. 기존 데이터는 덮어쓰지 않습니다.',
    'Create a project document collection without overwriting existing data.',
  ],
  status: [
    '프로젝트 진행률·작업·마일스톤·댓글 수를 조회합니다.',
    'Show project progress and task, milestone and comment counts.',
  ],
  validate: [
    '프로젝트 전체의 문서·연결·일정을 검사합니다. 파일을 수정하지 않습니다.',
    'Validate all documents, dependencies and schedules without changing files.',
  ],
  schema: [
    '현재 프로젝트의 필드 형식·허용값·선택지를 조회합니다.',
    'Show field formats and allowed values for the current project.',
  ],
  shell: [
    '프로젝트·언어·작성자를 유지하는 대화형 콘솔을 엽니다.',
    'Open an interactive console that retains project, language and author.',
  ],
  version: [
    '앱과 독립적인 CLI 버전을 표시합니다.',
    'Show the CLI version, independent of the desktop app.',
  ],
  task: ['작업 조회·생성·수정·삭제', 'List, inspect, create, edit and delete tasks'],
  milestone: ['마일스톤 조회·생성·수정·삭제', 'List, inspect, create, edit and delete milestones'],
  comment: [
    '댓글·한 단계 답글 조회·작성·수정·삭제',
    'List, create, edit and delete comments and one-level replies',
  ],
  project: ['프로젝트 설정 조회·수정', 'Inspect and edit project settings'],
};
const verbs: Record<string, Text> = {
  list: ['목록을 조회합니다.', 'List matching items.'],
  show: ['상세 정보를 조회합니다.', 'Inspect one item.'],
  add: [
    '새 항목을 생성합니다. ID는 저장 시 배정합니다.',
    'Create an item; its ID is allocated when saved.',
  ],
  edit: [
    '지정한 항목만 수정하고 나머지는 유지합니다.',
    'Update supplied fields and preserve the others.',
  ],
  delete: [
    '삭제 영향을 확인한 후 명시적으로 삭제합니다.',
    'Review deletion impact and explicitly confirm deletion.',
  ],
};
export function help(language: Language, topic?: string, session = false) {
  const t = (ko: string, en: string) => (language === 'ko' ? ko : en);
  const pick = (text: Text) => t(...text);
  const lines: string[] = [];
  const section = (ko: string, en: string, rows: string[]) => {
    lines.push('', t(ko, en), ...rows.map((r) => '  ' + r));
  };
  const [group, verb] = (topic ?? '').split(' ');
  const common = [
    '--project PATH  ' +
      t(
        '프로젝트 폴더 또는 worktree.json. 기본: 현재 폴더. 상위 폴더 자동 탐색 없음.',
        'Project folder or worktree.json. Default: current folder; no parent search.',
      ),
    '--lang ko|en    ' +
      t('도움말·표시 언어. 기본: en.', 'Help and display language. Default: en.'),
    '--json          ' +
      t(
        '성공은 stdout, 오류는 stderr에 JSON으로 출력.',
        'Write success JSON to stdout and error JSON to stderr.',
      ),
    '--help, -h      ' +
      t(
        '현재 명령의 도움말. 프로젝트가 없어도 사용 가능.',
        'Help for this command; no project required.',
      ),
    '--version, -v   ' + t('CLI 버전.', 'CLI version.'),
  ];
  if (!topic) {
    lines.push(
      'Worktree CLI',
      t(
        '프로젝트의 작업·마일스톤·댓글을 터미널에서 관리합니다.',
        'Manage project tasks, milestones and comments in your terminal.',
      ),
    );
    section('사용법', 'Usage', [
      'worktree <command> [options]',
      'worktree <command> --help',
      'worktree help <command>',
    ]);
    section(
      '<command> 명령',
      '<command> Commands',
      [...singleCommands, ...Object.keys(commandGroups)].map(
        (c) => c.padEnd(12) + pick(descriptions[c]),
      ),
    );
    section('시작 예시', 'Quick start', [
      'worktree init --name "My project" --prefix W',
      'worktree task add --title "First task"',
      'worktree task list',
      'worktree shell',
    ]);
  } else if (commandGroups[group] && !verb) {
    lines.push('worktree ' + group, pick(descriptions[group]));
    section(
      '하위 명령',
      'Subcommands',
      commandGroups[group].map((v) => `worktree ${group} ${v} --help  ${pick(verbs[v])}`),
    );
  } else {
    lines.push('worktree ' + topic, pick(verb ? verbs[verb] : descriptions[group]));
    const comment = group === 'comment',
      milestone = group === 'milestone';
    const editing = verb === 'edit',
      adding = verb === 'add',
      deleting = verb === 'delete';
    let usage = 'worktree ' + topic;
    if (comment) usage += ' TASK_ID' + (editing || deleting ? " '#001'" : '');
    else if (verb && group !== 'project' && ['show', 'edit', 'delete'].includes(verb))
      usage += ' ID';
    if (group === 'project' && editing) usage += ' --input settings.json';
    else if (comment && (adding || editing)) usage += ' (--text TEXT | --text-file PATH)';
    else if (adding) usage += ' --title TITLE';
    if (group === 'batch') usage += ' --input FILE.json';
    if (group === 'recover') usage += ' (--dry-run | --yes)';
    if (deleting) usage += ' --yes';
    section('사용법', 'Usage', [usage + ' [options]']);
    if (verb && group !== 'project' && (comment || ['show', 'edit', 'delete'].includes(verb)))
      section('위치 인수', 'Positional arguments', [
        (comment ? 'TASK_ID' : 'ID') +
          '  ' +
          t(
            '해당 명령에 ID가 필요하면 표시용 하이픈 없는 원본 ID 사용: W001 / MS001.',
            'When an ID is required, use the original ID without display hyphens: W001 / MS001.',
          ),
        ...(comment && (editing || deleting)
          ? [
              t(
                "댓글: '#001' 번호 또는 UUID. #은 따옴표로 감싸세요.",
                "Comment: '#001' or UUID. Quote # to avoid shell comments.",
              ),
            ]
          : []),
      ]);
    if (group === 'init') {
      section('대화형 초기화', 'Interactive setup', [
        t(
          '일반 터미널과 shell에서 init은 이름·저장 위치·접두어를 질문하고 기본/직접 설정을 선택합니다. 번호로 선택하며 Enter는 기본값, Ctrl+C는 취소입니다. 최종 확인 전에는 파일을 생성하지 않습니다.',
          'In a terminal or shell, init asks for name, directory and prefix, then default or custom rules. Select by number; Enter accepts defaults and Ctrl+C cancels. No files are created before final confirmation.',
        ),
        '--yes / --no-interactive  ' +
          t(
            '질문 없이 옵션·기본값으로 실행. --json, --input, 파이프 환경도 질문하지 않습니다.',
            'Use flags/defaults without questions. --json, --input and piped execution also skip prompts.',
          ),
      ]);
      section('선택 옵션과 기본값', 'Optional options and defaults', [
        '--name NAME       ' +
          t('프로젝트 이름. 기본: 폴더명.', 'Project name. Default: folder name.'),
        '--prefix W        ' +
          t(
            '작업 접두어. 기본: W. 영문 1~20자, MS 제외. 소문자는 대문자로 변환.',
            'Task prefix. Default: W. 1–20 ASCII letters, except MS; lowercase is uppercased.',
          ),
        '--directory PATH  ' +
          t(
            '루트 내부 상대 경로. 기본: docs/worktree.',
            'Relative data folder inside the root. Default: docs/worktree.',
          ),
        '--id-separator none|hyphen  ' +
          t(
            '표시용 구분자. 기본: none. 원본 ID는 유지.',
            'Display separator. Default: none; stored IDs stay unchanged.',
          ),
        '--date-format FORMAT  ' +
          t(
            '기본: yyyy-MM-dd. yyyy-MM-dd/dd-MM-yyyy/MM-dd-yyyy 순서와 - . / 구분자 조합.',
            'Default: yyyy-MM-dd. Orders yyyy-MM-dd/dd-MM-yyyy/MM-dd-yyyy with separators - . /.',
          ),
        '--time-format 24h|12h  ' + t('기본: 24h.', 'Default: 24h.'),
        '--use-effort true|false  ' +
          t('예상 작업 시간 표시. 기본: false.', 'Show estimated hours. Default: false.'),
        '--input FILE.json  ' +
          t(
            '설정 객체. 옵션이 JSON보다 우선. 유형·색상·라벨·담당자·우선순위도 지정 가능.',
            'Settings object; flags override JSON. Also accepts types, colors, labels, assignees and priorities.',
          ),
      ]);
    }
    if (verb === 'list' && !comment)
      section('선택 필터', 'Optional filters', [
        '--search TEXT   ' +
          t(
            'ID·제목 부분 검색. 대소문자 구분 없음.',
            'Case-insensitive substring search of ID and title.',
          ),
        '--status todo|doing|blocked|done  ' + t('상태 정확히 일치.', 'Exact status match.'),
        '--owner NAME    ' + t('담당자 정확히 일치.', 'Exact owner match.'),
        '--milestone ID  ' +
          t('소속 원본 ID. 미지정은 -.', 'Milestone original ID; - means unassigned.'),
        '--type TYPE     ' + t('작업 유형 정확히 일치.', 'Exact task type match.'),
        '--priority ID   ' +
          t('우선순위 원본 ID. 미지정은 -.', 'Priority original ID; - means unspecified.'),
        '--label LABEL   ' +
          t(
            '라벨 포함 여부. 필터는 AND로 결합하며 기본은 전체 조회.',
            'Require this label. Filters combine with AND; default: all items.',
          ),
      ]);
    if ((adding || editing) && !comment && group !== 'project') {
      section(adding ? '필수 입력' : '수정 입력', adding ? 'Required input' : 'Edit input', [
        t(
          adding
            ? '제목 필수: --title 또는 --input의 title. 나머지는 선택.'
            : '하나 이상의 필드 필요. 생략한 값은 유지합니다.',
          adding
            ? 'Title required via --title or input.title; other fields are optional.'
            : 'At least one field required. Omitted values are preserved.',
        ),
      ]);
      section('필드 옵션', 'Field options', [
        '--title TEXT       ' + t('제목.', 'Title.'),
        '--start YYYY-MM-DD  ' + t('시작일. 미지정: -.', 'Start date; unset: -.'),
        '--end YYYY-MM-DD    ' + t('종료일. 미지정: -.', 'End date; unset: -.'),
        '--input FILE.json  ' +
          t(
            '필드 객체. 명령 옵션이 우선. 배열은 전체 교체.',
            'Field object; flags override it. Arrays replace existing values.',
          ),
        ...(!milestone
          ? [
              '--description TEXT  ' + t('선택 Markdown 설명.', 'Optional Markdown description.'),
              '--owner NAME        ' + t('담당자.', 'Owner.'),
              '--status todo|doing|blocked|done  ' + t('기본: todo.', 'Default: todo.'),
              '--milestone ID      ' +
                t(
                  '소속 원본 ID. 기본: - (미지정).',
                  'Milestone original ID. Default: - (unassigned).',
                ),
              '--effort HOURS      ' +
                t('예상 작업 시간(h). 미지정: -.', 'Estimated work hours; unset: -.'),
              '--priority ID       ' +
                t('프로젝트 우선순위 ID. 기본: -.', 'Project priority ID. Default: -.'),
              '--type TYPE         ' +
                t(
                  '프로젝트 유형. 기본: 프로젝트 유형 목록의 첫 항목.',
                  'Project type. Default: the first project type.',
                ),
              '--labels CSV        ' +
                t(
                  '쉼표로 구분. 빈 문자열로 비움. JSON은 문자열 배열도 허용.',
                  'Comma-separated; empty string clears. JSON also accepts a string array.',
                ),
              '--deps CSV          ' +
                t(
                  '선행 원본 ID 목록. 빈 문자열로 비움. JSON은 배열도 허용.',
                  'Predecessor original IDs; empty string clears. JSON also accepts an array.',
                ),
              '--blocked-reason TEXT  ' + t('막힘 사유.', 'Blocked reason.'),
              '--references JSON   ' +
                t(
                  '배열 [{"type":"text|file","value":"..."}]. []로 비움. file은 루트 상대 경로.',
                  'Array [{"type":"text|file","value":"..."}]. [] clears; file paths are root-relative.',
                ),
            ]
          : []),
      ]);
      section('추가 안내', 'Notes', [
        t(
          '현재 프로젝트의 유형·우선순위 등은 worktree schema --json으로 확인합니다. 날짜 두 개를 지정하면 시작일 ≤ 종료일이어야 합니다.',
          'Use worktree schema --json for current types and priorities. When both dates are set, start must not exceed end.',
        ),
      ]);
    }
    if (group === 'project' && editing)
      section('필수 입력', 'Required input', [
        '--input FILE.json  ' +
          t(
            '비어 있지 않은 부분 설정 객체. 배열은 전체 교체.',
            'Non-empty partial settings object; arrays replace existing values.',
          ),
        t(
          '수정 가능: name, useEffort, dateFormat, timeFormat, idSeparator, taskTypes, taskTypeColors, labels, priorities, assignees.',
          'Editable: name, useEffort, dateFormat, timeFormat, idSeparator, taskTypes, taskTypeColors, labels, priorities, assignees.',
        ),
        t(
          '루트·저장 위치·접두어·ID 시퀀스는 고정. 사용 중인 유형·우선순위는 제거 불가.',
          'Root, data folder, prefix and ID sequences are fixed. In-use types and priorities cannot be removed.',
        ),
        '  {"name":"My project","assignees":["Alice"],"useEffort":true}',
      ]);
    if (comment && (adding || editing))
      section('필수·선택 옵션', 'Required and optional options', [
        '--text TEXT  ' +
          t(
            '직접 입력 또는 --text-file 중 하나 필수.',
            'Required: either direct text or --text-file.',
          ),
        ...(adding
          ? [
              '--author NAME  ' +
                t(
                  '선택: 작성자. 기본: shell author 또는 앱 표시 이름. 둘 다 없으면 지정 필수. Git 이름 미사용.',
                  'Optional: author. Default: shell author or app display name; required if neither exists. Git names are not used.',
                ),
              "--reply-to '#001'  " +
                t(
                  '선택: 대상 번호 또는 UUID. 답글은 1뎁스이며 직접 대상을 보존.',
                  'Optional target number or UUID. Replies remain one level deep and retain the direct target.',
                ),
            ]
          : [
              t(
                '답글이 달린 댓글은 수정할 수 없습니다. 작성자·생성 시각은 유지합니다.',
                'Comments with replies cannot be edited. Author and creation time are preserved.',
              ),
            ]),
      ]);
    const writing = ['init', 'batch', 'recover'].includes(group) || adding || editing || deleting;
    if (writing)
      section('저장·미리보기', 'Writing and preview', [
        '--dry-run  ' +
          t(
            '파일을 변경하지 않고 검사·변경 파일을 미리 확인.',
            'Validate and preview changed files without writing.',
          ),
        ...(!['init', 'recover'].includes(group)
          ? [
              '--expect HASH  ' +
                t(
                  '조회한 revision과 다르면 CONFLICT로 중단.',
                  'Stop with CONFLICT if the previously read revision differs.',
                ),
            ]
          : []),
        ...(deleting
          ? [
              '--yes  ' +
                t(
                  '실제 삭제 시 필수. dry-run에서는 생략 가능.',
                  'Required for actual deletion; optional for dry-run.',
                ),
              ...(!comment
                ? [
                    '--detach  ' +
                      t(
                        '외부 선행 참조 해제 동의. 해당 참조가 있을 때 필수.',
                        'Consent to detach external predecessor references; required when present.',
                      ),
                  ]
                : []),
              ...(milestone
                ? [
                    '--children keep|delete  ' +
                      t(
                        '하위 작업이 있으면 필수. keep: 미지정으로 유지, delete: 함께 삭제. dry-run 기본: keep.',
                        'Required when children exist. keep: retain as unassigned; delete: remove children. Dry-run default: keep.',
                      ),
                  ]
                : []),
              t(
                comment
                  ? '삭제 표식을 남기며 답글은 유지합니다.'
                  : '삭제한 ID는 재사용하지 않으며 실행 취소를 제공하지 않습니다.',
                comment
                  ? 'Leaves a deletion marker and preserves replies.'
                  : 'Deleted IDs are not reused. Undo is not available.',
              ),
            ]
          : []),
      ]);
    if (group === 'shell')
      section('세션 명령', 'Session commands', [
        'use PATH  ' +
          t(
            '대상 프로젝트 변경. 빈 폴더도 열 수 있음.',
            'Switch project; empty folders are supported.',
          ),
        'language ko|en  ' + t('언어 변경.', 'Change language.'),
        'format table|json  ' +
          t(
            '출력 형식. 기본: table (--json이면 json).',
            'Output format. Default: table, or json with --json.',
          ),
        'author NAME  ' + t('새 댓글 작성자 지정.', 'Set the author for new comments.'),
        'exit / quit  ' +
          t('종료. Ctrl+C는 현재 입력 취소.', 'Exit. Ctrl+C cancels current input.'),
        t(
          '명령·프로젝트·작성자·이력은 현재 세션 메모리에만 유지합니다. help task add로 개별 도움말을 봅니다.',
          'State and history stay in session memory only. Use help task add for command help.',
        ),
        t(
          '경로의 역슬래시는 그대로 입력합니다. 따옴표 안에서 같은 따옴표는 두 번 입력합니다.',
          'Backslashes are literal. Double a matching quote inside quoted text.',
        ),
      ]);
    if (['batch', 'recover'].includes(group))
      section('입력과 실행', 'Input and execution', [
        ...(group === 'batch'
          ? [
              '--input FILE.json  ' +
                t(
                  '필수. {commands: [[명령, 인수...], ...]}, 최대 100개. -는 표준입력.',
                  'Required. {commands: [[command, args...], ...]}, up to 100 commands. - reads stdin.',
                ),
              t(
                '한 프로젝트에서 순서대로 검증합니다. 중간 실패 시 저장하지 않습니다. 내부 명령은 task/milestone/comment의 쓰기만 허용합니다.',
                'Validate sequentially within one project; save nothing on failure. Inner commands support task/milestone/comment writes only.',
              ),
              t(
                '내부 --project/--input/파일 입력/언어/미리보기/도움말은 사용 불가. 생성 결과 ID는 결과 목록으로 확인합니다.',
                'Inner project/input/file/language/preview/help overrides are not allowed. Created IDs are returned in results.',
              ),
            ]
          : [
              t(
                'dry-run은 기록 유무만 검사합니다. 실제 복구는 --yes 필수. 외부 변경 충돌은 보존하고 중단합니다. 이미 확정된 초기화 삭제는 잔여 삭제를 마무리합니다.',
                'dry-run inspects pending records only. Recovery requires --yes. External conflicts are preserved. A committed reset finishes deleting the remaining staged data.',
              ),
            ]),
        '--yes  ' +
          t(
            '복구 또는 일괄 삭제 동의. dry-run에서는 생략 가능.',
            'Consent to recovery or batch deletions; optional with dry-run.',
          ),
      ]);
    if (group === 'schema')
      section('출력 안내', 'Output', [
        t(
          '프로젝트가 필요합니다. 자체 규격 안내이며 JSON Schema 표준은 아닙니다. suggestions는 강제 목록이 아닙니다.',
          'Requires a project. This is a CLI contract guide, not standard JSON Schema. Suggestions are not exclusive allowed values.',
        ),
      ]);
    if ((adding || editing) && group === 'task')
      section('본문 파일·표준입력', 'Body files and stdin', [
        '--description-file PATH  ' +
          t(
            'UTF-8 설명 파일. -는 파이프 입력. --description과 동시 지정 불가. shell 안에서는 파일만 사용.',
            'UTF-8 description file; - reads a pipe. Cannot combine with --description. Use files inside shell.',
          ),
      ]);
    if ((adding || editing) && comment)
      section('본문 파일·표준입력', 'Body files and stdin', [
        '--text-file PATH  ' +
          t(
            'UTF-8 댓글 파일. -는 파이프 입력. --text 대신 사용. shell 안에서는 파일만 사용.',
            'UTF-8 comment file; - reads a pipe. Replaces --text. Use files inside shell.',
          ),
      ]);
    const example =
      group === 'init'
        ? 'worktree init --name "My project" --prefix W --dry-run'
        : group === 'shell'
          ? 'worktree shell --project "C:\\projects\\example"'
          : group === 'schema'
            ? 'worktree schema --json'
            : group === 'project' && editing
              ? 'worktree project edit --input settings.json --dry-run'
              : comment
                ? `worktree comment ${verb} W001${editing || deleting ? " '#001'" : ''}${adding || editing ? ' --text "Review note"' : ''}${adding ? ' --author Alice' : ''}${deleting ? ' --dry-run' : ''}`
                : verb === 'list'
                  ? `worktree ${group} list --status doing`
                  : adding
                    ? `worktree ${group} add --title "First item" --dry-run`
                    : editing
                      ? `worktree ${group} edit ${milestone ? 'MS001' : 'W001'} --title "Updated title" --dry-run`
                      : deleting
                        ? `worktree ${group} delete ${milestone ? 'MS001' : 'W001'} --dry-run`
                        : usage +
                          (group === 'project' || ['status', 'validate'].includes(group)
                            ? ' --json'
                            : '');
    section('예시', 'Example', [
      verb === 'show' && group !== 'project'
        ? `worktree ${group} show ${milestone ? 'MS001' : 'W001'} --json`
        : example,
    ]);
  }
  if (session && group !== 'shell')
    section('세션 명령', 'Session commands', [
      'exit / quit  ' + t('shell 종료.', 'Exit the shell.'),
      'use PATH / language ko|en / format table|json / author NAME',
      'help shell  ' + t('전체 세션 명령 안내.', 'Full session command help.'),
    ]);
  if (!topic || ['status', 'schema', 'task', 'milestone', 'comment', 'project'].includes(group))
    section('조회 결과와 충돌 방지', 'Read results and conflict protection', [
      t(
        '조회 결과의 revision은 프로젝트 전체 내용의 식별값입니다. --json으로 확인한 값을 쓰기의 --expect HASH에 전달하세요.',
        'The revision in read results identifies the entire project state. Read it with --json and pass it to a write as --expect HASH.',
      ),
      'worktree status --json',
      'worktree task edit W001 --status doing --expect "<revision>"',
      t(
        '이후 변경이 있으면 CONFLICT로 중단합니다. 다시 조회한 뒤 재시도하세요. 읽기 결과가 실행 취소나 백업을 의미하지는 않습니다.',
        'If the project changes, the write stops with CONFLICT. Read again before retrying. A revision is not an undo point or backup.',
      ),
    ]);
  if (group === 'batch')
    section('batch.json 실제 예제', 'Example batch.json', [
      '{',
      '  "commands": [',
      '    ["task", "add", "--title", "First task"],',
      '    ["task", "add", "--title", "Second task"]',
      '  ]',
      '}',
      'worktree batch --input batch.json --dry-run --json',
      'worktree batch --input batch.json --json',
      t(
        '항목 오류는 JSON의 batchIndex(0부터)·batchCommand(1부터), 일반 출력의 #번호로 확인합니다. 전체 입력/저장 오류에는 항목 번호가 없습니다.',
        'Item errors include batchIndex (zero-based) and batchCommand (one-based) in JSON, and a #number in text. Whole-input or save errors have no item number.',
      ),
    ]);
  section('[options] 공통 옵션', '[options] Common options', common);
  section('종료 코드', 'Exit codes', [
    t(
      '0 성공 · 1 읽기/검증/쓰기 실패 · 2 명령/옵션 오류',
      '0 success · 1 read/validation/write failure · 2 command/option error',
    ),
  ]);
  return lines.join('\n');
}
