import { X } from 'lucide-react'
import { useEffect, useId, useRef } from 'react'
import type { ReactNode } from 'react'

export function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const element = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  useEffect(() => {
    const dialog = element.current
    dialog?.showModal()
    return () => dialog?.close()
  }, [])
  return <dialog ref={element} aria-labelledby={titleId} onCancel={event => { event.preventDefault(); onClose() }}>
    <header className="dialog-header">
      <h2 id={titleId}>{title}</h2>
      <button className="icon-button" aria-label="Zamknij" onClick={onClose}><X size={18} /></button>
    </header>
    {children}
  </dialog>
}
