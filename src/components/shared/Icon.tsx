import type { CSSProperties, ReactNode } from 'react';
const icons: Record<string, ReactNode> = {
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
      <rect x="8" y="3" width="8" height="5" rx="1" />
      <path d="M12 8v5M5 16v-3h14v3" />
      <rect x="2" y="16" width="6" height="5" rx="1" />
      <rect x="16" y="16" width="6" height="5" rx="1" />
    </>
  ),
  board: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M9 3v18M15 3v18" />
      <rect x="5" y="6" width="2" height="4" rx=".5" />
      <rect x="11" y="6" width="2" height="4" rx=".5" />
      <rect x="17" y="6" width="2" height="4" rx=".5" />
      <rect x="5" y="13" width="2" height="4" rx=".5" />
      <rect x="17" y="13" width="2" height="4" rx=".5" />
    </>
  ),
  flow: (
    <>
      <circle cx="5" cy="5" r="3" />
      <circle cx="5" cy="19" r="3" />
      <circle cx="19" cy="12" r="3" />
      <path d="m8 6.5 7 3.5m-2-3 2 3-3 .5M8 17.5l7-3.5m-3-.5 3 .5-2 3" />
    </>
  ),
  gantt: (
    <>
      <path d="M3 3v18h18" />
      <rect x="6" y="5" width="8" height="3" rx="1" />
      <rect x="10" y="10" width="9" height="3" rx="1" />
      <rect x="15" y="15" width="6" height="3" rx="1" />
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
