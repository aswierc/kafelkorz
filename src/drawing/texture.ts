import clay from '../assets/clay.jpg'
import stone from '../assets/stone.jpg'
import type { Texture } from '../layout/types'

export function sampleTexture(texture: Texture | undefined) {
  if (texture?.kind !== 'sample') return undefined
  return texture.finish === 'clay' ? clay : stone
}

export type Crop = { x: number; y: number; size: number }
export const defaultCrop: Crop = { x: 50, y: 50, size: 100 }

export function cropArea(width: number, height: number, ratio: number, crop: Crop) {
  const cropWidth = Math.min(width, height * ratio) * crop.size / 100
  const cropHeight = cropWidth / ratio
  return { x: (width - cropWidth) * crop.x / 100, y: (height - cropHeight) * crop.y / 100, width: cropWidth, height: cropHeight }
}

export async function cropTexture(image: HTMLImageElement, ratio: number, crop: Crop): Promise<Blob> {
  const area = cropArea(image.naturalWidth, image.naturalHeight, ratio, crop)
  const scale = Math.min(1, 1400 / Math.max(area.width, area.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(area.width * scale))
  canvas.height = Math.max(1, Math.round(area.height * scale))
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Przeglądarka nie może przetworzyć obrazu.')
  context.fillStyle = '#efebe2'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.drawImage(image, area.x, area.y, area.width, area.height, 0, 0, canvas.width, canvas.height)
  return new Promise((resolve, reject) => canvas.toBlob(
    blob => blob ? resolve(blob) : reject(new Error('Nie udało się wykadrować obrazu.')),
    'image/jpeg', 0.9,
  ))
}
