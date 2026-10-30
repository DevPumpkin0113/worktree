import { useState } from 'react';
import { isEpicIconColor } from '@worktree/core/epic-icons';
import { messages } from '../../i18n/messages';
import { hexToHsv, hsvToHex } from '../../views/icon-color';

export function EpicColorEditor({
  color,
  onChange,
  onClose,
}: {
  color?: string;
  onChange: (color: string) => void;
  onClose: () => void;
}) {
  const initial = isEpicIconColor(color) ? color : '#efcbb5';
  const [hsv, setHsv] = useState(() => hexToHsv(initial));
  const [hex, setHex] = useState(initial);
  const update = (next: typeof hsv) => {
    setHsv(next);
    const value = hsvToHex(next.h, next.s, next.v);
    setHex(value);
    onChange(value);
  };
  const point = (event: React.PointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    update({
      ...hsv,
      s: Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width)),
      v: Math.max(0, Math.min(1, 1 - (event.clientY - bounds.top) / bounds.height)),
    });
  };
  return (
    <div className="epic-color-editor">
      <div className="epic-color-heading">
        <span
          className="epic-color-swatch"
          style={{ background: hex }}
          role="img"
          aria-label={messages.iconColor + ' ' + hex}
        />
        <label className="epic-color-hex">
          HEX{' '}
          <input
            aria-label={messages.iconHexColor}
            value={hex}
            spellCheck={false}
            maxLength={7}
            onChange={(event) => {
              const value = event.target.value;
              setHex(value);
              if (isEpicIconColor(value)) {
                setHsv(hexToHsv(value));
                onChange(value.toLowerCase());
              }
            }}
            onBlur={() => {
              if (!isEpicIconColor(hex)) setHex(hsvToHex(hsv.h, hsv.s, hsv.v));
            }}
          />
        </label>
        <button
          type="button"
          className="epic-color-custom"
          aria-label={messages.customIconColor}
          aria-expanded="true"
          onClick={onClose}
        />
      </div>
      <div className="epic-color-controls">
        <div
          className="epic-color-plane"
          style={{ backgroundColor: hsvToHex(hsv.h, 1, 1) }}
          onPointerDown={(event) => {
            if (event.button !== 0) return;
            event.preventDefault();
            event.currentTarget.setPointerCapture(event.pointerId);
            point(event);
          }}
          onPointerMove={(event) => {
            if (event.currentTarget.hasPointerCapture(event.pointerId)) point(event);
          }}
          onPointerUp={(event) => {
            if (event.currentTarget.hasPointerCapture(event.pointerId))
              event.currentTarget.releasePointerCapture(event.pointerId);
          }}
        >
          <span
            className="epic-color-thumb"
            style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%` }}
          />
          <input
            className="epic-color-axis"
            type="range"
            aria-label={messages.iconSaturation}
            min="0"
            max="100"
            value={Math.round(hsv.s * 100)}
            onChange={(event) => update({ ...hsv, s: Number(event.target.value) / 100 })}
          />
          <input
            className="epic-color-axis"
            type="range"
            aria-label={messages.iconBrightness}
            min="0"
            max="100"
            value={Math.round(hsv.v * 100)}
            onChange={(event) => update({ ...hsv, v: Number(event.target.value) / 100 })}
          />
        </div>
        <input
          className="epic-color-hue"
          type="range"
          aria-label={messages.iconHue}
          min="0"
          max="359"
          value={Math.round(hsv.h)}
          onChange={(event) => update({ ...hsv, h: Number(event.target.value) })}
        />
      </div>
    </div>
  );
}
