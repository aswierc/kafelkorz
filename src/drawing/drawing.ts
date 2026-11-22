import { openingBounds, openingPath, tileSize } from '../layout/layout'
import type { Opening, OpeningPlacement, PathCommand, Piece, Point, Surface, TileLayout } from '../layout/types'

const mm = new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 2, useGrouping: false })
export const formatMm = (value: number) => mm.format(value)
export const dimensions = (width: number, height: number) => formatMm(width) + ' × ' + formatMm(height)

export type DrawnPiece = {
  piece: Piece
  marker: string
  label: string
  detail: string
  position: Point
}

function drawPiece(piece: Piece, index: number): DrawnPiece {
  const { bounds, notch } = piece
  const inner = piece.splitOptions[0]?.parts[0] ?? bounds
  return {
    piece,
    marker: piece.cut ? 'D' + index : '',
    label: dimensions(bounds.width, bounds.height),
    detail: notch ? 'Wycięcie ' + dimensions(notch.width, notch.height) + ' mm' : '',
    position: { x: inner.x + inner.width / 2, y: inner.y + inner.height / 2 },
  }
}

export type DrawnOpening = {
  opening: Opening
  marker: string
  label: string
  size: string
  relation: string
  pieceIds: string[]
  bounds: ReturnType<typeof openingBounds>
  path: PathCommand[]
}

function drawOpening(opening: Opening, index: number, marks: Map<string, string>, placement?: OpeningPlacement): DrawnOpening {
  const bounds = openingBounds(opening)
  const drill = placement?.drill
  return {
    opening, marker: 'O' + (index + 1), label: opening.label || (opening.kind === 'circle' ? 'Otwór okrągły' : 'Otwór prostokątny'),
    size: opening.kind === 'circle' ? 'Ø' + formatMm(opening.diameter) + ' mm' : dimensions(bounds.width, bounds.height) + ' mm',
    relation: drill
      ? 'Płytka ' + marks.get(drill.pieceId) + ' · Środek od lewej / od dołu płytki: ' + dimensions(drill.offset.x, drill.offset.y) + ' mm'
      : opening.kind === 'circle' && placement?.pieceIds.length
        ? 'Wycięcie w ' + placement.pieceIds.map(id => marks.get(id)).join(', ')
        : '',
    pieceIds: placement?.pieceIds ?? [],
    bounds, path: openingPath(opening),
  }
}

export function buildDrawing(surface: Surface, layout: TileLayout) {
  let cuts = 0
  const pieces = layout.pieces.map(piece => drawPiece(piece, piece.cut ? ++cuts : 0))
  const marks = new Map(pieces.map(item => [item.piece.id, item.marker]))
  return {
    surface,
    pieces,
    openings: surface.openings.map((opening, index) => drawOpening(opening, index, marks, layout.openings.find(item => item.openingId === opening.id))),
    whole: layout.pieces.length - cuts, cuts,
    tile: tileSize(surface),
    error: layout.error,
  }
}

export type Drawing = ReturnType<typeof buildDrawing>

export function svgPath(path: PathCommand[], map: (point: Point) => Point) {
  const coord = (point: Point) => {
    const { x, y } = map(point)
    return x + ' ' + y
  }
  return path.map(command => {
    if (command.kind === 'Z') return 'Z'
    if (command.kind === 'C') return 'C ' + coord(command.control1) + ' ' + coord(command.control2) + ' ' + coord(command.point)
    return command.kind + ' ' + coord(command.point)
  }).join(' ')
}
