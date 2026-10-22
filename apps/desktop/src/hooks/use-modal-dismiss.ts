import {
  useRef,
  type MouseEvent,
  type PointerEvent,
  type KeyboardEvent,
  type SyntheticEvent,
} from 'react';
function isBackdrop(event: MouseEvent<HTMLDialogElement> | PointerEvent<HTMLDialogElement>) {
  if (event.target !== event.currentTarget) return false;
  const rect = event.currentTarget.getBoundingClientRect();
  return (
    event.clientX < rect.left ||
    event.clientX > rect.right ||
    event.clientY < rect.top ||
    event.clientY > rect.bottom
  );
}
export function useModalDismiss(onClose: () => void, isBusy: () => boolean) {
  const startedOutside = useRef(false);
  return {
    onPointerDown(event: PointerEvent<HTMLDialogElement>) {
      startedOutside.current =
        event.button === 0 && event.isPrimary !== false && !isBusy() && isBackdrop(event);
    },
    onPointerCancel() {
      startedOutside.current = false;
    },
    onClick(event: MouseEvent<HTMLDialogElement>) {
      const dismiss = startedOutside.current && isBackdrop(event);
      startedOutside.current = false;
      if (dismiss && !isBusy()) onClose();
    },
    onKeyDown(event: KeyboardEvent<HTMLDialogElement>) {
      if (event.key === 'Escape') event.stopPropagation();
    },
    onCancel(event: SyntheticEvent<HTMLDialogElement>) {
      event.preventDefault();
      if (!isBusy()) onClose();
    },
  };
}
