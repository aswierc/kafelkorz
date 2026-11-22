import { Circle, ImagePlus, LayoutTemplate, Square, Trash2 } from 'lucide-react'
import type { Drawing } from '../drawing/drawing'
import type { Opening, Surface } from '../layout/types'
import { NumberField, TextField } from './fields'

export type Unit = 'mm' | 'cm'
type Props = {
  surface: Surface
  drawing: Drawing
  unit: Unit
  openingId?: string
  changeUnit: (unit: Unit) => void
  update: (change: Partial<Surface>) => void
  selectOpening: (id: string) => void
  addOpening: (kind: Opening['kind']) => void
  upload: (file: File) => void
  removeSurface: () => void
}

export function Settings({ surface, drawing, unit, openingId, changeUnit, update, selectOpening, addOpening, upload, removeSurface }: Props) {
  const opening = surface.openings.find(item => item.id === openingId)
  const modifyOpening = (edited: Opening) => update({ openings: surface.openings.map(item => item.id === edited.id ? edited : item) })
  const placement = drawing.openings.find(item => item.opening.id === openingId)
  return <aside className="settings" aria-label="Ustawienia układu">
    <div className="settings-heading"><h2>Ustawienia</h2>
      <div className="segmented unit-switch" aria-label="Jednostki wymiarów">
        <button aria-pressed={unit === 'mm'} onClick={() => changeUnit('mm')}>mm</button>
        <button aria-pressed={unit === 'cm'} onClick={() => changeUnit('cm')}>cm</button>
      </div>
    </div>
    <section className="settings-section">
      <h3>{surface.kind === 'wall' ? 'Ściana' : 'Podłoga'}</h3>
      <TextField label="Nazwa powierzchni" value={surface.name} onChange={name => { if (name) update({ name }) }} />
      <div className="fields-row">
        <NumberField label="Szerokość powierzchni" value={surface.width} onChange={width => update({ width })} unit={unit} min={1} />
        <NumberField label={surface.kind === 'wall' ? 'Wysokość powierzchni' : 'Długość powierzchni'} value={surface.height} onChange={height => update({ height })} unit={unit} min={1} />
      </div>
    </section>
    <section className="settings-section">
      <h3>Płytka i fuga</h3>
      <div className="fields-row">
        <NumberField label="Szerokość płytki" value={surface.tile.width} onChange={width => update({ tile: { ...surface.tile, width } })} unit={unit} min={1} />
        <NumberField label="Wysokość płytki" value={surface.tile.height} onChange={height => update({ tile: { ...surface.tile, height } })} unit={unit} min={1} />
      </div>
      <div className="segmented orientation" aria-label="Orientacja płytki">
        <button aria-pressed={surface.tile.orientation === 'horizontal'} onClick={() => update({ tile: { ...surface.tile, orientation: 'horizontal' } })}>
          <LayoutTemplate size={16} /> Poziomo</button>
        <button aria-pressed={surface.tile.orientation === 'vertical'} onClick={() => update({ tile: { ...surface.tile, orientation: 'vertical' } })}>
          <LayoutTemplate size={16} className="rotate-icon" /> Pionowo</button>
      </div>
      <div className="fields-row">
        <NumberField label="Fuga" value={surface.grout} onChange={grout => update({ grout })} />
        <NumberField label="Szczelina obwodowa" value={surface.clearance} onChange={clearance => update({ clearance })} />
      </div>
    </section>
    <section className="settings-section">
      <h3>Kotwica siatki</h3>
      <div className="fields-row">
        <NumberField label="X od lewej" value={surface.origin.x} onChange={x => update({ origin: { ...surface.origin, x } })} unit={unit} min={-100000} />
        <NumberField label="Y od dołu" value={surface.origin.y} onChange={y => update({ origin: { ...surface.origin, y } })} unit={unit} min={-100000} />
      </div>
    </section>
    <section className="settings-section">
      <h3>Otwory</h3>
      {drawing.openings.length > 0 && <ul className="opening-list">
        {drawing.openings.map(item => <li key={item.opening.id}><button className="opening-row"
          aria-pressed={openingId === item.opening.id} onClick={() => selectOpening(item.opening.id)}>
          <span className="marker">{item.marker}</span><span>{item.label}</span><small>{item.size}</small>
        </button></li>)}
      </ul>}
      <div className="opening-actions">
        <button className="button" onClick={() => addOpening('rect')}><Square size={16} /> Prostokąt</button>
        <button className="button" onClick={() => addOpening('circle')}><Circle size={16} /> Koło</button>
      </div>
      {opening && <div className="opening-edit" key={opening.id}>
        <TextField label="Nazwa otworu" value={opening.label} onChange={label => modifyOpening({ ...opening, label })} />
        {opening.kind === 'rect' ? <>
          <div className="fields-row">
            <NumberField label="X otworu od lewej" value={opening.rect.x} onChange={x => modifyOpening({ ...opening, rect: { ...opening.rect, x } })} unit={unit} min={-100000} />
            <NumberField label="Y otworu od dołu" value={opening.rect.y} onChange={y => modifyOpening({ ...opening, rect: { ...opening.rect, y } })} unit={unit} min={-100000} />
          </div>
          <div className="fields-row">
            <NumberField label="Szerokość otworu" value={opening.rect.width} onChange={width => modifyOpening({ ...opening, rect: { ...opening.rect, width } })} unit={unit} min={1} />
            <NumberField label="Wysokość otworu" value={opening.rect.height} onChange={height => modifyOpening({ ...opening, rect: { ...opening.rect, height } })} unit={unit} min={1} />
          </div>
        </> : <>
          <div className="fields-row">
            <NumberField label="X środka od lewej" value={opening.center.x} onChange={x => modifyOpening({ ...opening, center: { ...opening.center, x } })} unit={unit} min={-100000} />
            <NumberField label="Y środka od dołu" value={opening.center.y} onChange={y => modifyOpening({ ...opening, center: { ...opening.center, y } })} unit={unit} min={-100000} />
          </div>
          <NumberField label="Średnica otworu" value={opening.diameter} onChange={diameter => modifyOpening({ ...opening, diameter })} unit={unit} min={1} />
        </>}
        {placement?.relation && <p className="field-hint">{placement.relation}</p>}
        <button className="text-button danger-text" onClick={() => update({ openings: surface.openings.filter(item => item.id !== opening.id) })}>
          <Trash2 size={15} /> Usuń otwór
        </button>
      </div>}
    </section>
    <section className="settings-section">
      <h3>Tekstura</h3>
      <label className="button file-button"><ImagePlus size={16} /> {surface.texture ? 'Zmień zdjęcie' : 'Wczytaj zdjęcie'}
        <input aria-label="Plik tekstury płytki" type="file" accept="image/jpeg,image/png,image/webp,image/avif"
          onChange={event => {
            const file = event.currentTarget.files?.[0]
            event.currentTarget.value = ''
            if (file) upload(file)
          }} />
      </label>
      {surface.texture && <button className="text-button" onClick={() => update({ texture: undefined })}>Usuń teksturę</button>}
    </section>
    <button className="text-button danger-text remove-surface" onClick={removeSurface}><Trash2 size={15} /> Usuń powierzchnię</button>
  </aside>
}
