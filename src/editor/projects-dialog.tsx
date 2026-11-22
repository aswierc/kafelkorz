import { ArrowUpRight, FolderOpen, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import type { Example } from '../projects/examples'
import type { useProjects } from '../projects/use-projects'
import { Dialog } from './dialog'

type Projects = ReturnType<typeof useProjects>

export function ProjectsDialog({ projects, onClose }: { projects: Projects; onClose: () => void }) {
  const [editing, setEditing] = useState<{ id: string; name: string }>()
  const [deleting, setDeleting] = useState<{ id: string; name: string }>()
  const [switching, setSwitching] = useState<{ id: string; name: string }>()
  async function open(id: string, discard = false) {
    if (await projects.open(id, discard)) onClose()
  }

  return <Dialog title="Projekty" onClose={onClose}>
    {projects.error && <p role="alert" className="error">{projects.error}</p>}
    {!projects.summaries.length && <p>Twoje zapisane projekty pojawią się tutaj.</p>}
    <ul className="project-list">
      {projects.summaries.map(item => <li key={item.id}>
        {editing?.id === item.id
          ? <form onSubmit={async event => {
            event.preventDefault()
            if (await projects.rename(item.id, editing.name)) setEditing(undefined)
          }}>
            <input aria-label="Nazwa projektu" maxLength={80} value={editing.name}
              onChange={event => setEditing({ id: item.id, name: event.target.value })} />
            <button className="button primary" disabled={projects.busy || !editing.name.trim()}>Zapisz</button>
            <button type="button" className="button" onClick={() => setEditing(undefined)}>Anuluj</button>
          </form> : <>
            <button className="project-name" disabled={projects.busy} onClick={() => {
              if (projects.hasUnsavedChanges) setSwitching(item)
              else void open(item.id)
            }}>
              <FolderOpen size={19} /><span>{item.name}<small>{item.id === projects.project?.id
                ? 'Otwarty projekt' : item.surfaces + (item.surfaces === 1 ? ' powierzchnia' : ' pow.')}</small></span><ArrowUpRight size={15} />
            </button>
            <button className="icon-button" aria-label={'Zmień nazwę projektu ' + item.name} onClick={() => setEditing(item)}><Pencil size={16} /></button>
            <button className="icon-button" aria-label={'Usuń projekt ' + item.name} onClick={() => setDeleting(item)}><Trash2 size={16} /></button>
          </>}
      </li>)}
    </ul>
    {deleting && <div className="confirm-box">
      <p>Usunąć projekt „{deleting.name}” z tej przeglądarki?</p>
      <div className="dialog-actions">
        <button className="button" onClick={() => setDeleting(undefined)}>Anuluj</button>
        <button className="button danger" disabled={projects.busy} onClick={async () => {
          if (await projects.remove(deleting.id)) setDeleting(undefined)
        }}>Usuń projekt</button>
      </div>
    </div>}
    {switching && <div className="confirm-box">
      <p>Otwarcie projektu „{switching.name}” odrzuci niezapisane zmiany.</p>
      <div className="dialog-actions">
        <button className="button" onClick={() => setSwitching(undefined)}>Anuluj</button>
        <button className="button danger" disabled={projects.busy} onClick={() => void open(switching.id, true)}>Odrzuć zmiany i otwórz</button>
      </div>
    </div>}
  </Dialog>
}

export function NewProjectDialog({ projects, onClose }: { projects: Projects; onClose: () => void }) {
  const [choice, setChoice] = useState<Example | 'empty'>('empty')
  const [name, setName] = useState('')
  return <Dialog title="Nowy projekt" onClose={onClose}>
    <form onSubmit={async event => {
      event.preventDefault()
      if (await projects.add(choice === 'empty' ? undefined : choice, name)) onClose()
    }}>
      <label className="field"><span>Nazwa projektu</span><input value={name} maxLength={80}
        placeholder="Np. Łazienka" onChange={event => setName(event.target.value)} /></label>
      <fieldset className="new-options">
        <legend>Zacznij od</legend>
        {([['empty', 'Pusty projekt'], ['wall', 'Przykład ściany łazienkowej'], ['floor', 'Przykład podłogi z rurą']] as const).map(([id, label]) =>
          <label key={id}><input type="radio" name="template" value={id} checked={id === choice}
            onChange={() => setChoice(id)} /> {label}</label>)}
      </fieldset>
      {projects.error && <p role="alert" className="error">{projects.error}</p>}
      <div className="dialog-actions"><button className="button primary" disabled={projects.busy}><Plus size={16} /> Utwórz projekt</button></div>
    </form>
  </Dialog>
}
