import type { CSSProperties, ReactNode } from 'react';
const icons: Record<string, ReactNode> = {
  grip: (
    <path
      d="M9 5h.01M15 5h.01M9 12h.01M15 12h.01M9 19h.01M15 19h.01"
      strokeWidth="3"
      strokeLinecap="round"
    />
  ),
  home: (
    <>
      <path d="m3 10 9-7 9 7v11H3zM9 21v-8h6v8" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  filter: <path d="M4 4h16l-6 7v7l-4 2v-9z" />,
  status: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="m8 12 3 3 5-6" />
    </>
  ),
  priority: (
    <>
      <path d="M5 20v-5M12 20V9M19 20V4" />
    </>
  ),
  person: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21v-2a8 8 0 0 1 16 0v2" />
    </>
  ),
  'view-options': (
    <>
      <rect x="4" y="4" width="6" height="6" rx="1" />
      <rect x="14" y="4" width="6" height="6" rx="1" />
      <rect x="4" y="14" width="6" height="6" rx="1" />
      <rect x="14" y="14" width="6" height="6" rx="1" />
    </>
  ),
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m16 16 5 5" />
    </>
  ),
  folder: <path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />,
  'wbs-file': (
    <>
      <path d="M14 3H5v18h14V8zM14 3v5h5M8 12h8M8 16h8" />
    </>
  ),
  project: (
    <>
      <path d="M9 6V4h6v2" />
      <rect x="3" y="6" width="18" height="15" rx="2" />
      <path d="M3 12h18M10 12v3h4v-3" />
    </>
  ),
  'chevron-right': <path d="m6 4 4 4-4 4" />,
  workspace: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <path d="M3 9h18M10 9v12" />
    </>
  ),
  'task-list': (
    <>
      <path d="m3 6 1.5 1.5L7 5M10 6h11M3 12h4m3 0h11M3 18h4m3 0h11" />
    </>
  ),
  insights: (
    <>
      <path d="M3 3v18h18M7 15l4-5 4 2 5-7m-5 0h5v5" />
    </>
  ),
  reload: (
    <>
      <path d="M20 7v5h-5M4 17v-5h5" />
      <path d="M6.1 7a7 7 0 0 1 11.5-1L20 9M4 15l2.4 3A7 7 0 0 0 17.9 17" />
    </>
  ),
  close: (
    <>
      <path d="m4 4 8 8m0-8-8 8" />
    </>
  ),
  minimize: (
    <>
      <path d="M1 6.5h10" />
    </>
  ),
  maximize: (
    <>
      <rect x="1.5" y="1.5" width="9" height="9" />
    </>
  ),
  collapse: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M9 4v16m7-12-4 4 4 4" />
    </>
  ),
  settings: (
    <>
      <path d="m9.5 3-.5 2-2 .9-1.8-.5-2 3.4 1.5 1.4v2.4l-1.5 1.5 2 3.4 1.8-.5 2 .9.5 2h4l.5-2 2-.9 1.8.5 2-3.4-1.5-1.5v-2.4l1.5-1.4-2-3.4-1.8.5-2-.9-.5-2z" />
      <circle cx="11.5" cy="11.5" r="3" />
    </>
  ),
  tree: (
    <>
      <path d="M5 5h14M7 5v14h4M7 12h4M14 12h5M14 19h5" />
    </>
  ),
  board: (
    <>
      <rect x="3" y="5" width="4" height="14" rx="1" />
      <rect x="10" y="5" width="4" height="9" rx="1" />
      <rect x="17" y="5" width="4" height="12" rx="1" />
    </>
  ),
  flow: (
    <>
      <circle cx="5" cy="12" r="2" />
      <circle cx="18" cy="5" r="2" />
      <circle cx="18" cy="19" r="2" />
      <path d="M7 12h4V5h5M11 12v7h5" />
    </>
  ),
  gantt: (
    <>
      <path d="M4 5h9M8 12h12M12 19h8" />
    </>
  ),
  restore: (
    <>
      <path d="M3.5 3.5v-2h7v7h-2" />
      <rect x="1.5" y="3.5" width="7" height="7" />
    </>
  ),
};
const viewBoxes: Record<string, string> = {
  'chevron-right': '0 0 16 16',
  reload: '0 0 24 24',
  close: '0 0 16 16',
  minimize: '0 0 12 12',
  maximize: '0 0 12 12',
  collapse: '0 0 24 24',
  settings: '0 0 24 24',
  tree: '0 0 24 24',
  board: '0 0 24 24',
  flow: '0 0 24 24',
  gantt: '0 0 24 24',
  restore: '0 0 12 12',
};
export function Icon({
  name,
  className,
  style,
}: {
  name: string;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      className={className}
      style={style}
      viewBox={viewBoxes[name] ?? '0 0 24 24'}
      aria-hidden="true"
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      {icons[name] ?? icons.close}
    </svg>
  );
}
