// Inline confirmation pill for destructive surface actions. Modeless
// on purpose — the canvas stays visible behind it so the user can see
// what they're about to remove. Auto-focuses Cancel as the safe default;
// Esc cancels.

import { useEffect, useRef } from 'react'
import './DeleteConfirm.css'

type Props = {
  label: string
  onConfirm: () => void
  onCancel: () => void
}

export default function DeleteConfirm({ label, onConfirm, onCancel }: Props) {
  const cancelRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    cancelRef.current?.focus()
  }, [])

  return (
    <div
      role="alertdialog"
      aria-labelledby="delete-confirm-title"
      className="delete-confirm"
    >
      <p id="delete-confirm-title" className="delete-confirm__text">
        Delete <strong>{label}</strong>? This can&rsquo;t be undone.
      </p>
      <div className="delete-confirm__actions">
        <button
          ref={cancelRef}
          type="button"
          className="delete-confirm__cancel"
          onClick={onCancel}
        >
          Keep it
        </button>
        <button
          type="button"
          className="delete-confirm__confirm"
          onClick={onConfirm}
        >
          Delete
        </button>
      </div>
    </div>
  )
}
