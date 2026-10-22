import type { CSSProperties, ReactNode } from 'react';
export function Badge({
  label,
  color,
  children,
  leading,
}: {
  label: string;
  color?: string;
  children?: ReactNode;
  leading?: ReactNode;
}) {
  return (
    <span
      className="value-badge"
      style={color ? ({ '--badge-color': color } as CSSProperties) : undefined}
    >
      {leading}
      <span className="value-badge-label">{label}</span>
      {children}
    </span>
  );
}
