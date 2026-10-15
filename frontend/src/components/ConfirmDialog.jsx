import { useRef } from 'react';
import useFocusTrap from '../hooks/useFocusTrap';

// The one confirm prompt. Danger confirms use the red button; Escape and the
// backdrop both mean "cancel", so the safe choice is always the easy one.
export default function ConfirmDialog({ title, message, confirmText, cancelText = 'Cancel', danger = false, onConfirm, onCancel }) {
  const ref = useRef(null);
  const cancelRef = useRef(null);
  useFocusTrap(ref, { onEscape: onCancel, initialFocusRef: cancelRef });

  return (
    <div className="confirm-overlay" onClick={onCancel}>
      <div
        ref={ref}
        className="confirm-panel"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-message"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="confirm-title">{title}</h3>
        <p id="confirm-message">{message}</p>
        <div className="confirm-actions">
          <button type="button" className={danger ? 'btn-danger' : 'btn-primary'} onClick={onConfirm}>{confirmText}</button>
          <button ref={cancelRef} type="button" className="btn-secondary" onClick={onCancel}>{cancelText}</button>
        </div>
      </div>
    </div>
  );
}
