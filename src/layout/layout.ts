import { Arc, BooleanOperations, Polygon, box, circle, point } from '@flatten-js/core'
import type { Face } from '@flatten-js/core'
import type { Opening, PathCommand, Piece, Point, Rect, Surface, TileLayout } from './types'

const epsilon = 0.000001
const clean = (value: number) => Math.round(value * 1e6) / 1e6
const right = (rect: Rect) => rect.x + rect.width
const top = (rect: Rect) => rect.y + rect.height
const asPolygon = (rect: Rect) => new Polygon(box(rect.x, rect.y, right(rect), top(rect)))
const overlaps = (a: Rect, b: Rect) =>
  Math.min(right(a), right(b)) - Math.max(a.x, b.x) > epsilon &&
  Math.min(top(a), top(b)) - Math.max(a.y, b.y) > epsilon

export function tileSize(surface: Surface) {
  const { width, height, orientation } = surface.tile
  return orientation === 'horizontal' ? { width, height } : { width: height, height: width }
}

export function openingBounds(opening: Opening): Rect {
  if (opening.kind === 'rect') return opening.rect
  return {
    x: opening.center.x - opening.diameter / 2, y: opening.center.y - opening.diameter / 2,
    width: opening.diameter, height: opening.diameter,
  }
}

function openingHits(opening: Opening, bounds: Rect) {
  if (opening.kind === 'rect') return overlaps(opening.rect, bounds)
  const dx = opening.center.x - Math.min(Math.max(opening.center.x, bounds.x), right(bounds))
  const dy = opening.center.y - Math.min(Math.max(opening.center.y, bounds.y), top(bounds))
  return Math.hypot(dx, dy) < opening.diameter / 2 - epsilon
}

export function rectanglePath(rect: Rect): PathCommand[] {
  return [
    { kind: 'M', point: { x: rect.x, y: rect.y } },
    { kind: 'L', point: { x: right(rect), y: rect.y } },
    { kind: 'L', point: { x: right(rect), y: top(rect) } },
    { kind: 'L', point: { x: rect.x, y: top(rect) } },
    { kind: 'Z' },
  ]
}

function arcPath(arc: Arc): PathCommand[] {
  const count = Math.max(1, Math.ceil(arc.sweep / (Math.PI / 8)))
  const step = arc.sweep / count * (arc.counterClockwise ? 1 : -1)
  const k = 4 / 3 * Math.tan(step / 4) * arc.r
  const at = (angle: number): Point => ({
    x: arc.pc.x + arc.r * Math.cos(angle), y: arc.pc.y + arc.r * Math.sin(angle),
  })
  return Array.from({ length: count }, (_, index) => {
    const a = arc.startAngle + index * step
    const b = a + step
    const start = at(a)
    const end = at(b)
    return {
      kind: 'C', point: end,
      control1: { x: start.x - k * Math.sin(a), y: start.y + k * Math.cos(a) },
      control2: { x: end.x + k * Math.sin(b), y: end.y - k * Math.cos(b) },
    }
  })
}

export function openingPath(opening: Opening): PathCommand[] {
  if (opening.kind === 'rect') return rectanglePath(opening.rect)
  const arc = new Arc(point(opening.center.x, opening.center.y), opening.diameter / 2, 0, Math.PI * 2)
  return [{ kind: 'M', point: arc.start }, ...arcPath(arc), { kind: 'Z' }]
}

function polygonPath(faces: Face[]): PathCommand[] {
  return faces.flatMap(face => {
    const [first] = face.shapes
    if (!first) return []
    const path: PathCommand[] = [{ kind: 'M', point: first.start }]
    for (const edge of face.shapes) {
      if (edge instanceof Arc) path.push(...arcPath(edge))
      else path.push({ kind: 'L', point: edge.end })
    }
    path.push({ kind: 'Z' })
    return path
  })
}

function findNotch(face: Face, bounds: Rect, area: number): Rect | undefined {
  if (face.shapes.some(edge => edge instanceof Arc)) return
  const xs = [...new Set(face.vertices.map(vertex => clean(vertex.x)))].sort((a, b) => a - b)
  const ys = [...new Set(face.vertices.map(vertex => clean(vertex.y)))].sort((a, b) => a - b)
  if (xs.length !== 3 || ys.length !== 3) return
  const missing = [
    { x: xs[0], y: ys[0], width: xs[1] - xs[0], height: ys[1] - ys[0] },
    { x: xs[1], y: ys[0], width: xs[2] - xs[1], height: ys[1] - ys[0] },
    { x: xs[0], y: ys[1], width: xs[1] - xs[0], height: ys[2] - ys[1] },
    { x: xs[1], y: ys[1], width: xs[2] - xs[1], height: ys[2] - ys[1] },
  ].filter(rect => !face.toPolygon().contains(point(rect.x + rect.width / 2, rect.y + rect.height / 2)))
  if (missing.length !== 1) return
  const [notch] = missing
  return Math.abs(area - bounds.width * bounds.height + notch.width * notch.height) < epsilon ? notch : undefined
}

function possibleSplits(bounds: Rect, notch: Rect, grout: number): Piece['splitOptions'] {
  const onLeft = notch.x === bounds.x
  const onBottom = notch.y === bounds.y
  const remainingWidth = clean(bounds.width - notch.width)
  const remainingHeight = clean(bounds.height - notch.height)
  const opts: Piece['splitOptions'] = []
  if (notch.height - grout > epsilon) opts.push({
    direction: 'horizontal',
    parts: [
      { ...bounds, y: onBottom ? top(notch) : bounds.y, height: remainingHeight },
      {
        x: onLeft ? right(notch) : bounds.x, y: onBottom ? bounds.y : notch.y + grout,
        width: remainingWidth, height: clean(notch.height - grout),
      },
    ],
  })
  if (notch.width - grout > epsilon) opts.push({
    direction: 'vertical',
    parts: [
      { ...bounds, x: onLeft ? right(notch) : bounds.x, width: remainingWidth },
      {
        x: onLeft ? bounds.x : notch.x + grout, y: onBottom ? top(notch) : bounds.y,
        width: clean(notch.width - grout), height: remainingHeight,
      },
    ],
  })
  return opts
}

function polygonsForTile(bounds: Rect, openings: Opening[]) {
  const tile = asPolygon(bounds)
  let cutouts: Polygon | undefined
  for (const opening of openings) {
    if (!openingHits(opening, bounds)) continue
    const shape = opening.kind === 'rect'
      ? asPolygon(opening.rect)
      : new Polygon(circle(point(opening.center.x, opening.center.y), opening.diameter / 2))
    cutouts = cutouts ? BooleanOperations.unify(cutouts, shape) : shape
  }
  const remaining = cutouts ? BooleanOperations.subtract(tile, cutouts) : tile
  return remaining.isEmpty() ? [] : remaining.splitToIslands()
}

function makePiece(shape: Polygon, tile: Rect, grout: number): Piece {
  const { xmin, ymin, width, height } = shape.box
  const bounds = { x: clean(xmin), y: clean(ymin), width: clean(width), height: clean(height) }
  const faces = Array.from(shape.faces) as unknown as Face[]
  const area = shape.area()
  const notch = faces.length === 1 ? findNotch(faces[0], bounds, area) : undefined
  const key = (rect: Rect) => [rect.x, rect.y, rect.width, rect.height].map(clean).join(',')
  return {
    id: [key(tile), key(bounds), notch && key(notch)].filter(Boolean).join('/'),
    tile, bounds, notch, path: polygonPath(faces),
    cut: Math.abs(area - tile.width * tile.height) > epsilon,
    splitOptions: notch ? possibleSplits(bounds, notch, grout) : [],
  }
}

function hasCircleEdge(face: Face, opening: Extract<Opening, { kind: 'circle' }>) {
  return face.shapes.some(edge => edge instanceof Arc
    && Math.abs(edge.r - opening.diameter / 2) < epsilon
    && Math.hypot(edge.pc.x - opening.center.x, edge.pc.y - opening.center.y) < epsilon)
}

function isDrill(face: Face, opening: Extract<Opening, { kind: 'circle' }>) {
  const circle = openingBounds(opening)
  const edges = face.shapes
  return edges.length > 0 && edges.every(edge => edge instanceof Arc)
    && Math.abs(face.box.xmin - circle.x) < epsilon && Math.abs(face.box.ymin - circle.y) < epsilon
    && Math.abs(face.box.width - circle.width) < epsilon && Math.abs(face.box.height - circle.height) < epsilon
    && Math.abs(Math.abs(face.signedArea()) - Math.PI * (opening.diameter / 2) ** 2) < epsilon
}

export function calculateLayout(surface: Surface): TileLayout {
  const { width, height } = tileSize(surface)
  const { grout, clearance, origin } = surface
  const empty = { pieces: [], openings: [], invalidSplits: surface.splits.map(split => split.pieceId) }
  const usable: Rect = {
    x: clearance, y: clearance, width: surface.width - 2 * clearance, height: surface.height - 2 * clearance,
  }
  if (usable.width <= epsilon || usable.height <= epsilon) {
    return { ...empty, error: 'Szczelina obwodowa zajmuje całą powierzchnię. Zmniejsz jej szerokość.' }
  }
  const pitchX = width + grout
  const pitchY = height + grout
  const firstX = Math.floor((usable.x - origin.x) / pitchX)
  const firstY = Math.floor((usable.y - origin.y) / pitchY)
  const lastX = Math.ceil((right(usable) - origin.x) / pitchX)
  const lastY = Math.ceil((top(usable) - origin.y) / pitchY)
  if (![firstX, firstY, lastX, lastY].every(Number.isSafeInteger) ||
    (lastX - firstX) * (lastY - firstY) > 12000) {
    return { ...empty, error: 'Za dużo płytek do narysowania. Zwiększ format płytki lub zmniejsz powierzchnię.' }
  }

  const pieces: Piece[] = []
  const circlePlacements = new Map<string, { piece: Piece; drill: boolean }[]>()
  const circles = surface.openings.filter(opening => opening.kind === 'circle')
  const usedSplits = new Set<string>()
  const splits = new Map(surface.splits.map(split => [split.pieceId, split.direction]))
  try {
    for (let row = firstY; row < lastY; row++) {
      for (let col = firstX; col < lastX; col++) {
        const tile = { x: clean(origin.x + col * pitchX), y: clean(origin.y + row * pitchY), width, height }
        if (!overlaps(tile, usable)) continue
        const x = Math.max(tile.x, usable.x)
        const y = Math.max(tile.y, usable.y)
        const bounds = { x, y, width: Math.min(right(tile), right(usable)) - x, height: Math.min(top(tile), top(usable)) - y }
        for (const shape of polygonsForTile(bounds, surface.openings)) {
          if (shape.area() <= epsilon) continue
          const piece = makePiece(shape, tile, grout)
          const split = piece.splitOptions.find(option => option.direction === splits.get(piece.id))
          if (!split) {
            pieces.push(piece)
            const faces = Array.from(shape.faces) as unknown as Face[]
            for (const opening of circles) {
              if (!openingHits(opening, bounds)) continue
              const face = faces.find(item => hasCircleEdge(item, opening))
              if (!face) continue
              const placements = circlePlacements.get(opening.id) ?? []
              const hole = face.box.xmin > piece.bounds.x + epsilon && face.box.ymin > piece.bounds.y + epsilon &&
                face.box.xmax < right(piece.bounds) - epsilon && face.box.ymax < top(piece.bounds) - epsilon
              placements.push({ piece, drill: hole && isDrill(face, opening) })
              circlePlacements.set(opening.id, placements)
            }
            continue
          }
          usedSplits.add(piece.id)
          split.parts.forEach((part, index) => pieces.push({
            id: piece.id + ':' + index, splitFrom: piece.id, tile, bounds: part,
            path: rectanglePath(part), cut: true, splitOptions: [],
          }))
        }
      }
    }
  } catch {
    return { ...empty, error: 'Tego układu otworów nie udało się obliczyć. Sprawdź wymiary i położenie otworów.' }
  }

  const openings = surface.openings.map(opening => {
    if (opening.kind === 'rect') return {
      openingId: opening.id, pieceIds: pieces.filter(piece => openingHits(opening, piece.bounds)).map(piece => piece.id),
    }
    const affected = circlePlacements.get(opening.id) ?? []
    if (affected.length === 1 && affected[0].drill) {
      const [{ piece }] = affected
      return {
        openingId: opening.id, pieceIds: [piece.id],
        drill: {
          pieceId: piece.id, diameter: opening.diameter,
          offset: { x: clean(opening.center.x - piece.bounds.x), y: clean(opening.center.y - piece.bounds.y) },
        },
      }
    }
    return { openingId: opening.id, pieceIds: affected.map(({ piece }) => piece.id) }
  })
  return { pieces, openings, invalidSplits: surface.splits.filter(split => !usedSplits.has(split.pieceId)).map(split => split.pieceId) }
}
