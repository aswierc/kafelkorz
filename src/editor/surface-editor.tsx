import { ChevronDown, Grid2X2, Hand, Image, Maximize, Minus, MousePointer2, Plus, Redo2, Scissors } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { buildDrawing, dimensions } from '../drawing/drawing'
import { sampleTexture } from '../drawing/texture'
import { calculateLayout } from '../layout/layout'
import type { Opening, Split, Surface } from '../layout/types'
import type { ProjectAsset } from '../projects/types'
import { CropDialog } from './crop-dialog'
import { Dialog } from './dialog'
import { Settings } from './settings'
import type { Unit } from './settings'
import { Viewport } from './viewport'
import type { Mode } from './viewport'

type Props = {
  surface: Surface
  projectId: string
  unit: Unit
  changeUnit: (unit: Unit) => void
  onChange: (surface: Surface, asset?: ProjectAsset) => void
  onRemove: () => void
  readAsset: (projectId: string, assetId: string) => Promise<Blob | undefined>
}

export function SurfaceEditor({ surface, projectId, unit, changeUnit, onChange, onRemove, readAsset }: Props) {
  const [mode, setMode] = useState<Mode>('select')
  const [textured, setTextured] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [viewKey, setViewKey] = useState(0)
  const [preview, setPreview] = useState<Surface>()
  const [undo, setUndo] = useState<Surface>()
  const [pieceId, setPieceId] = useState<string>()
  const [openingId, setOpeningId] = useState<string>()
  const [split, setSplit] = useState<Split>()
  const [file, setFile] = useState<File>()
  const [confirmRemove, setConfirmRemove] = useState(false)
  const [asset, setAsset] = useState<{ id: string; url: string }>()
  const [assetError, setAssetError] = useState('')
  const textureId = surface.texture?.kind === 'asset' ? surface.texture.id : undefined

  useEffect(() => {
    if (!textureId) return
    let live = true
    let url: string | undefined
    setAssetError('')
    void readAsset(projectId, textureId).then(blob => {
      if (!live) return
      if (!blob) {
        setAssetError('Brakuje zapisanego zdjęcia płytki.')
        return
      }
      url = URL.createObjectURL(blob)
      setAsset({ id: textureId, url })
    }).catch(() => { if (live) setAssetError('Nie udało się odczytać zdjęcia płytki.') })
    return () => {
      live = false
      if (url) URL.revokeObjectURL(url)
    }
  }, [projectId, textureId, readAsset])

  const texture = sampleTexture(surface.texture) ?? (asset?.id === textureId ? asset?.url : undefined)
  const current = preview ?? surface
  const layout = useMemo(() => calculateLayout(current), [current])
  const drawing = useMemo(() => buildDrawing(current, layout), [current, layout])
  const displayed = useMemo(() => {
    if (!split || preview) return drawing
    const splitSurface = { ...surface, splits: [...surface.splits, split] }
    return buildDrawing(splitSurface, calculateLayout(splitSurface))
  }, [drawing, preview, split, surface])
  const selected = drawing.pieces.find(item => item.piece.id === pieceId)
  const chosenOpening = drawing.openings.find(item => item.opening.id === openingId)

  function changeSurface(next: Surface, nextAsset?: ProjectAsset) {
    setSplit(undefined)
    const result = calculateLayout(next)
    if (!result.error && result.invalidSplits.length) {
      setUndo(surface)
      next = { ...next, splits: next.splits.filter(item => !result.invalidSplits.includes(item.pieceId)) }
    } else {
      setUndo(undefined)
    }
    onChange(next, nextAsset)
  }

  function addOpening(kind: Opening['kind']) {
    const id = crypto.randomUUID()
    const x = Math.round(surface.width / 2)
    const y = Math.round(surface.height / 2)
    const width = Math.min(600, Math.round(surface.width * .35) || 1)
    const height = Math.min(600, Math.round(surface.height * .35) || 1)
    const opening: Opening = kind === 'circle'
      ? { id, kind, label: '', center: { x, y }, diameter: Math.min(68, width, height) }
      : { id, kind, label: '', rect: { x: Math.max(0, x - width / 2), y: Math.max(0, y - height / 2), width, height } }
    changeSurface({ ...surface, openings: [...surface.openings, opening] })
    selectOpening(id)
  }

  function selectOpening(id: string) {
    setMode('select')
    setOpeningId(id)
    setPieceId(undefined)
    setSplit(undefined)
  }

  function selectPiece(id: string) {
    setPieceId(id)
    setOpeningId(undefined)
    setSplit(undefined)
  }

  return <div className="editor-grid">
    <section className="drawing-panel" aria-label="Rysunek i docinki">
      <header className="drawing-heading">
        <div><h2>Rysunek układu</h2><p>{dimensions(surface.width, surface.height)} mm</p></div>
        <div className="segmented drawing-views" aria-label="Widok rysunku">
          <button aria-pressed={!textured} onClick={() => setTextured(false)}><Grid2X2 size={16} /> Techniczny</button>
          <button aria-pressed={textured} onClick={() => setTextured(true)}><Image size={16} /> Z teksturą</button>
        </div>
      </header>
      <div className="drawing-tools">
        <div className="tool-group" aria-label="Narzędzia rysunku">
          {([
            ['select', 'Zaznacz', MousePointer2],
            ['grid', 'Przesuń siatkę', Grid2X2],
            ['pan', 'Przesuń widok', Hand],
          ] as const).map(([id, label, Icon]) => <button key={id} className="tool-button" aria-pressed={mode === id}
            onClick={() => { setMode(id); setSplit(undefined) }} title={label}><Icon size={16} /> <span>{label}</span></button>)}
        </div>
        <div className="tool-group zoom-tools" aria-label="Powiększenie">
          <button className="icon-button" aria-label="Pomniejsz" disabled={zoom <= .5} onClick={() => setZoom(Math.max(.5, zoom / 1.25))}><Minus size={16} /></button>
          <output aria-label="Skala widoku">{Math.round(zoom * 100)}%</output>
          <button className="icon-button" aria-label="Powiększ" disabled={zoom >= 5} onClick={() => setZoom(Math.min(5, zoom * 1.25))}><Plus size={16} /></button>
          <button className="icon-button fit" aria-label="Dopasuj rysunek" onClick={() => { setZoom(1); setViewKey(viewKey + 1) }}><Maximize size={15} /></button>
        </div>
      </div>
      <div className="drawing-stage">
        <Viewport key={viewKey} drawing={displayed} texture={texture} textured={textured} mode={mode} zoom={zoom} pieceId={pieceId}
          openingId={openingId} onPiece={selectPiece} onOpening={selectOpening} onPreview={setPreview} onCommit={changeSurface} />
        {drawing.error && <p className="drawing-message error" role="alert">{drawing.error}</p>}
        {textured && !surface.texture && <p className="drawing-message">Dodaj zdjęcie płytki w ustawieniach tekstury.</p>}
        {textured && textureId && assetError && <p className="drawing-message error" role="alert">{assetError}</p>}
      </div>
      <div className="drawing-legend">
        <span><i className="swatch whole" /> Pełna płytka <strong>{displayed.whole}</strong></span>
        <span><i className="swatch cut" /> Docinka <strong>{displayed.cuts}</strong></span>
        <span><i className="swatch hole" /> Otwór <strong>{drawing.openings.length}</strong></span>
        <span><i className="legend-anchor">+</i> Kotwica</span>
      </div>
      {undo && <div className="editor-notice" role="status">Po zmianie układu usunięto podział docinki.
        <button className="text-button" onClick={() => { onChange(undo); setUndo(undefined) }}><Redo2 size={16} className="undo-icon" /> Cofnij zmianę</button>
      </div>}
      {chosenOpening && <div className="inspector" aria-live="polite">
        <h3>{chosenOpening.marker} · {chosenOpening.label}</h3>
        <p>{chosenOpening.size}{chosenOpening.relation && ' · ' + chosenOpening.relation}</p>
      </div>}
      {selected && <div className="inspector">
        <h3>Docinka {selected.marker} · {selected.label} mm</h3>
        {selected.detail && <p>{selected.detail}</p>}
        {selected.piece.splitOptions.length > 0 && <div className="split-options">
          <p><Scissors size={16} /> Podziel docinkę na dwa prostokąty</p>
          {selected.piece.splitOptions.map(({ direction, parts }) => <button key={direction} className="button"
            aria-pressed={split?.direction === direction} onClick={() => setSplit({ pieceId: selected.piece.id, direction })}>
            {direction === 'horizontal' ? 'Podział poziomy' : 'Podział pionowy'} <small>{parts.map(part => dimensions(part.width, part.height)).join(' + ')} mm</small>
          </button>)}
          {split && <div className="split-confirm"><span>Fuga w podziale {surface.grout} mm</span>
            <button className="button primary" onClick={() => changeSurface({ ...surface, splits: [...surface.splits, split] })}>Zastosuj podział</button>
            <button className="button" onClick={() => setSplit(undefined)}>Anuluj</button>
          </div>}
        </div>}
        {selected.piece.splitFrom && <button className="text-button" onClick={() => {
          const original = selected.piece.splitFrom
          changeSurface({ ...surface, splits: surface.splits.filter(item => item.pieceId !== original) })
          setPieceId(original)
        }}>Usuń podział</button>}
      </div>}
      {drawing.cuts > 0 && <details className="cut-list">
        <summary><ChevronDown size={16} /> Wykaz docinek <span>{drawing.cuts}</span></summary>
        <ul>{drawing.pieces.filter(item => item.piece.cut).map(item => <li key={item.piece.id}>
          <button onClick={() => { setMode('select'); selectPiece(item.piece.id) }}>
            <span className="marker">{item.marker}</span><span>{item.label} mm</span>
            {item.detail && <small>{item.detail}</small>}
          </button>
        </li>)}</ul>
      </details>}
    </section>
    <Settings surface={surface} drawing={drawing} unit={unit} openingId={openingId} changeUnit={changeUnit}
      update={change => changeSurface({ ...surface, ...change })} selectOpening={selectOpening} addOpening={addOpening}
      upload={setFile} removeSurface={() => setConfirmRemove(true)} />
    {file && <CropDialog file={file} ratio={surface.tile.width / surface.tile.height} onClose={() => setFile(undefined)} onSave={blob => {
      const id = crypto.randomUUID()
      changeSurface({ ...surface, texture: { kind: 'asset', id } }, { id, data: blob })
      setTextured(true)
      setFile(undefined)
    }} />}
    {confirmRemove && <Dialog title="Usuń powierzchnię" onClose={() => setConfirmRemove(false)}>
      <p>Usunąć „{surface.name}” wraz z jej układem płytek i otworami?</p>
      <div className="dialog-actions"><button className="button" onClick={() => setConfirmRemove(false)}>Anuluj</button>
        <button className="button danger" onClick={onRemove}>Usuń powierzchnię</button></div>
    </Dialog>}
  </div>
}
