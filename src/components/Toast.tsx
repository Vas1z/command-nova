import { useEffect } from 'react'
import type { ToastMessage } from '../types'
import { UndoIcon, XIcon } from './Icons'

interface ToastProps {
  toast: ToastMessage
  onClose: () => void
}

export function Toast({ toast, onClose }: ToastProps) {
  useEffect(() => {
    const timeout = window.setTimeout(onClose, toast.actionLabel ? 7000 : 4200)
    return () => window.clearTimeout(timeout)
  }, [onClose, toast.actionLabel, toast.id])

  return (
    <div className={`toast toast--${toast.kind}`} role="status" aria-live="polite">
      <span className="toast__dot" aria-hidden="true" />
      <span className="toast__message">{toast.message}</span>
      {toast.actionLabel && toast.onAction && (
        <button
          className="toast__action"
          type="button"
          onClick={() => {
            toast.onAction?.()
            onClose()
          }}
        >
          <UndoIcon size={14} />
          {toast.actionLabel}
        </button>
      )}
      <button className="toast__close" type="button" onClick={onClose} aria-label="Закрыть уведомление">
        <XIcon size={13} />
      </button>
    </div>
  )
}
