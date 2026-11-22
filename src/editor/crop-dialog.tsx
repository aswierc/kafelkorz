import { useEffect, useRef, useState } from 'react'
import { cropArea, cropTexture, defaultCrop } from '../drawing/texture'
import { Dialog } from './dialog'

export function CropDialog({ file, ratio, onClose, onSave }: {
  file: File; ratio: number; onClose: () => void; onSave: (blob: Blob) => void
}) {
  const image = useRef<HTMLImageElement>(null)
  const [url, setUrl] = useState('')
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [crop, setCrop] = useState(defaultCrop)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    const next = URL.createObjectURL(file)
    setUrl(next)
    return () => URL.revokeObjectURL(next)
  }, [file])
  const area = cropArea(size.width, size.height, ratio, crop)
  async function save() {
    if (!image.current) return
    setBusy(true)
    try {
      onSave(await cropTexture(image.current, ratio, crop))
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Nie udało się odczytać zdjęcia.')
      setBusy(false)
    }
  }
  return <Dialog title="Wykadruj teksturę" onClose={busy ? () => {} : onClose}>
    <p>Ustaw fragment zdjęcia, który ma wypełnić jedną płytkę.</p>
    <div className="crop-image">
      {url && <img ref={image} src={url} alt="Zdjęcie płytki do wykadrowania" onLoad={event => setSize({
        width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight,
      })} onError={() => setError('Przeglądarka nie rozpoznaje tego zdjęcia. Wybierz plik JPG, PNG lub WebP.')} />}
      {size.width > 0 && <div className="crop-outline" style={{
        left: area.x / size.width * 100 + '%', top: area.y / size.height * 100 + '%',
        width: area.width / size.width * 100 + '%', height: area.height / size.height * 100 + '%',
      }} />}
    </div>
    <div className="crop-controls">
      {([['x', 'Lewo / prawo', 0], ['y', 'Góra / dół', 0], ['size', 'Rozmiar kadru', 10]] as const).map(([key, label, min]) =>
        <label key={key}>{label}<input type="range" min={min} max="100" value={crop[key]}
          onChange={event => setCrop({ ...crop, [key]: Number(event.target.value) })} /></label>)}
    </div>
    {error && <p role="alert" className="error">{error}</p>}
    <div className="dialog-actions"><button className="button primary" disabled={busy || !size.width} onClick={() => void save()}>
      {busy ? 'Zapisywanie zdjęcia…' : 'Użyj tekstury'}</button></div>
  </Dialog>
}
