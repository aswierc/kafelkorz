import { Check, Download, FolderOpen, Grid2X2, Layers3, Plus, RectangleVertical, Square } from 'lucide-react'
import { useRef, useState } from 'react'
import { buildDrawing } from '../drawing/drawing'
import { sampleTexture } from '../drawing/texture'
import { calculateLayout } from '../layout/layout'
import type { Surface } from '../layout/types'
import { createSurface } from '../projects/examples'
import type { Project, ProjectStore } from '../projects/types'
import { useProjects } from '../projects/use-projects'
import { Dialog } from './dialog'
import { NewProjectDialog, ProjectsDialog } from './projects-dialog'
import type { Unit } from './settings'
import { SurfaceEditor } from './surface-editor'

export function App({ openStore }: { openStore: () => Promise<ProjectStore> }) {
  const projects = useProjects(openStore)
  const { project, status, error, busy, edit, readAsset } = projects
  const [unit, setUnit] = useState<Unit>('mm')
  const [surfaceId, setSurfaceId] = useState<string>()
  const [modal, setModal] = useState<'projects' | 'new' | 'surface' | 'pdf'>()
  const [textureInPdf, setTextureInPdf] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState('')
  const downloadLink = useRef<HTMLAnchorElement>(null)
  const active = project?.surfaces.find(item => item.id === surfaceId) ?? project?.surfaces[0]
  const close = () => setModal(undefined)

  function addSurface(kind: Surface['kind']) {
    if (!project) return
    const surface = createSurface(kind)
    edit({ ...project, surfaces: [...project.surfaces, surface] })
    setSurfaceId(surface.id)
    close()
  }

  async function download(snapshot: Project) {
    setExporting(true)
    setExportError('')
    const urls: string[] = []
    try {
      const { exportPlan } = await import('../pdf/export')
      const pages = await Promise.all(snapshot.surfaces.map(async surface => {
        let texture = textureInPdf ? sampleTexture(surface.texture) : undefined
        if (textureInPdf && surface.texture?.kind === 'asset') {
          const blob = await readAsset(snapshot.id, surface.texture.id)
          if (!blob) throw new Error('Brakuje zdjęcia na powierzchni „' + surface.name + '”.')
          texture = URL.createObjectURL(blob)
          urls.push(texture)
        }
        return { drawing: buildDrawing(surface, calculateLayout(surface)), texture }
      }))
      const file = await exportPlan({ name: snapshot.name, pages, includeTexture: textureInPdf })
      const url = URL.createObjectURL(file)
      const link = downloadLink.current
      if (!link) {
        URL.revokeObjectURL(url)
        return
      }
      link.href = url
      link.download = (snapshot.name.replace(/[\/:*?"<>|]/g, '-').trim() || 'kafelkorz') + '.pdf'
      link.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 30000)
      close()
    } catch (failure) {
      setExportError(failure instanceof Error ? failure.message : 'Nie udało się pobrać pliku PDF.')
    } finally {
      urls.forEach(url => URL.revokeObjectURL(url))
      setExporting(false)
    }
  }

  return <>
    <header className="app-header">
      <div className="header-inner">
        <div className="brand"><span className="brand-icon"><Grid2X2 size={25} strokeWidth={1.55} /></span><span>kafelkorz</span></div>
        <div className="header-actions">
          <button className="button header-button" disabled={status === 'loading'} onClick={() => { void projects.list(); setModal('projects') }}><FolderOpen size={17} /> Projekty</button>
          <button className="button header-button new-project" disabled={status === 'loading'} onClick={() => setModal('new')}><Plus size={17} /> Nowy projekt</button>
          <button className="button primary pdf-button" disabled={!project?.surfaces.length || busy} onClick={() => { setExportError(''); setModal('pdf') }}><Download size={17} /> Pobierz PDF</button>
        </div>
      </div>
    </header>
    <main className="workspace">
      {status === 'loading' ? <p className="load-message" role="status">Wczytywanie projektów…</p> : <>
        {error && <div className="editor-notice error" role="alert">{error}
          {projects.hasUnsavedChanges && <button className="button" onClick={() => void projects.retry()}>Ponów zapis</button>}
        </div>}
        {project ? <>
          <div className="project-heading">
            <div><p className="kicker"><Layers3 size={15} /> Plan układu płytek</p><h1>{project.name}</h1>
              {projects.introProject === project.id && <p className="intro">Zmień przykładowy układ albo wybierz <strong>Nowy projekt</strong>.</p>}
            </div>
            <div className="save-state" role="status" data-testid="save-state">
              {status === 'saved' && <><Check size={16} /> Zapisano lokalnie</>}
              {status === 'saving' && 'Zapisywanie…'}
            </div>
          </div>
          <nav className="surface-tabs" aria-label="Powierzchnie projektu">
            {project.surfaces.map(surface => <button key={surface.id} className="surface-tab" aria-current={active?.id === surface.id ? 'page' : undefined}
              onClick={() => setSurfaceId(surface.id)}>{surface.kind === 'wall' ? <RectangleVertical size={16} /> : <Square size={16} />}{surface.name}</button>)}
            <button className="button add-surface" onClick={() => setModal('surface')}><Plus size={17} /> Dodaj powierzchnię</button>
          </nav>
          {active ? <SurfaceEditor key={project.id + ':' + active.id} surface={active} projectId={project.id} unit={unit}
            changeUnit={setUnit} readAsset={readAsset}
            onChange={(surface, asset) => edit({ ...project, surfaces: project.surfaces.map(item => item.id === surface.id ? surface : item) }, asset)}
            onRemove={() => { edit({ ...project, surfaces: project.surfaces.filter(item => item.id !== active.id) }); setSurfaceId(undefined) }} />
            : <div className="empty"><Layers3 size={34} /><h2>Dodaj ścianę lub podłogę</h2><p>Od wymiarów powierzchni zaczniesz planowanie płytek.</p>
              <button className="button primary" onClick={() => setModal('surface')}><Plus size={17} /> Dodaj powierzchnię</button>
            </div>}
        </> : <div className="empty">
          <Grid2X2 size={40} /><h1>Planer płytek</h1><p>Utwórz projekt albo otwórz zapisany układ.</p>
          <button className="button primary" onClick={() => setModal('new')}><Plus size={17} /> Nowy projekt</button>
        </div>}
      </>}
    </main>
    <a hidden ref={downloadLink} aria-hidden="true" />
    {modal === 'projects' && <ProjectsDialog projects={projects} onClose={close} />}
    {modal === 'new' && <NewProjectDialog projects={projects} onClose={close} />}
    {modal === 'surface' && <Dialog title="Dodaj powierzchnię" onClose={close}>
      <div className="surface-options">
        <button className="button" onClick={() => addSurface('wall')}><RectangleVertical size={23} /> Ściana</button>
        <button className="button" onClick={() => addSurface('floor')}><Square size={23} /> Podłoga</button>
      </div>
    </Dialog>}
    {modal === 'pdf' && project && <Dialog title="Pobierz plan PDF" onClose={exporting ? () => {} : close}>
      <p>Rysunki i wymiary dla wszystkich powierzchni projektu. Format A4.</p>
      <label className="texture-checkbox"><input type="checkbox" checked={textureInPdf} disabled={exporting}
        onChange={event => setTextureInPdf(event.target.checked)} /> Dodaj tekstury płytek</label>
      {exportError && <p className="error" role="alert">{exportError}</p>}
      <div className="dialog-actions">
        <button className="button primary" disabled={exporting} onClick={() => void download(project)}><Download size={17} />
          {exporting ? 'Przygotowywanie PDF…' : 'Pobierz PDF'}</button>
      </div>
    </Dialog>}
  </>
}
