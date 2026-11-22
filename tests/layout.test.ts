import { describe, expect, it } from 'vitest'
import { calculateLayout } from '../src/layout/layout'
import type { Surface } from '../src/layout/types'

const bathroom: Surface = {
  id: 'wall', name: 'Ściana testowa', kind: 'wall', width: 2709, height: 2455,
  tile: { width: 597, height: 297, orientation: 'horizontal' },
  grout: 3, clearance: 3, origin: { x: 1122, y: 138 }, splits: [],
  openings: [
    { id: 'door', label: 'Drzwi', kind: 'rect', rect: { x: 219, y: 0, width: 900, height: 2110 } },
    { id: 'cold', label: '', kind: 'circle', center: { x: 1894, y: 625 }, diameter: 30 },
    { id: 'hot', label: '', kind: 'circle', center: { x: 1984, y: 620 }, diameter: 30 },
    { id: 'drain', label: '', kind: 'circle', center: { x: 1939, y: 505 }, diameter: 50 },
  ],
}

describe('układ płytek', () => {
  it('odtwarza wymiary ściany i mieści trzy przyłącza na jednej płytce', () => {
    const layout = calculateLayout(bathroom)
    expect(layout.error).toBeUndefined()
    expect(layout.pieces.map(piece => piece.bounds)).toContainEqual({ x: 2322, y: 3, width: 384, height: 132 })
    const drains = layout.openings.filter(opening => ['cold', 'hot', 'drain'].includes(opening.openingId))
    expect(drains.map(opening => opening.drill?.offset)).toEqual([
      { x: 172, y: 187 }, { x: 262, y: 182 }, { x: 217, y: 67 },
    ])
    expect(new Set(drains.map(opening => opening.drill?.pieceId)).size).toBe(1)
  })
})

it('pokazuje dwa prostokątne warianty podziału L, zachowuje wybór i wykrywa zmianę obrysu', () => {
  const surface: Surface = {
    ...bathroom, width: 100, height: 100, clearance: 0, grout: 3,
    origin: { x: 0, y: 0 }, tile: { width: 100, height: 100, orientation: 'horizontal' },
    openings: [{ id: 'corner', kind: 'rect', label: '', rect: { x: 60, y: 70, width: 40, height: 30 } }],
  }
  const [piece] = calculateLayout(surface).pieces
  expect(piece.notch).toEqual({ x: 60, y: 70, width: 40, height: 30 })
  expect(piece.splitOptions).toHaveLength(2)
  const withSplit: Surface = { ...surface, splits: [{ pieceId: piece.id, direction: 'vertical' }] }
  expect(calculateLayout(withSplit).pieces.map(part => part.bounds)).toEqual([
    { x: 0, y: 0, width: 60, height: 100 }, { x: 63, y: 0, width: 37, height: 70 },
  ])
  expect(calculateLayout({ ...withSplit, grout: 0 }).pieces[1].bounds.width).toBe(40)
  expect(calculateLayout({ ...withSplit, origin: { x: -5, y: 0 } }).invalidSplits).toEqual([piece.id])
})

it('rozróżnia otwór na dwóch płytkach od styczności bez docinki', () => {
  const surface: Surface = {
    ...bathroom, width: 200, height: 100, clearance: 0, grout: 0, origin: { x: 0, y: 0 },
    tile: { width: 100, height: 100, orientation: 'vertical' },
    openings: [{ id: 'pipe', kind: 'circle', center: { x: 100, y: 50 }, diameter: 20, label: '' }],
  }
  expect(calculateLayout(surface).openings[0].pieceIds).toHaveLength(2)
  const tangent: Surface = { ...surface, openings: [{ id: 'pipe', kind: 'circle', center: { x: -10, y: 50 }, diameter: 20, label: '' }] }
  expect(calculateLayout(tangent).pieces.map(piece => piece.cut)).toEqual([false, false])
})

it('odróżnia wiercenie od koła nachodzącego na inne wycięcie lub całkowicie w nim ukrytego', () => {
  const surface: Surface = {
    ...bathroom, width: 100, height: 100, clearance: 0, grout: 0, origin: { x: 0, y: 0 },
    tile: { width: 100, height: 100, orientation: 'horizontal' },
    openings: [
      { id: 'rect', kind: 'rect', rect: { x: 17, y: 17, width: 28, height: 33 }, label: '' },
      { id: 'hidden', kind: 'circle', center: { x: 30, y: 30 }, diameter: 10, label: '' },
      { id: 'merged', kind: 'circle', center: { x: 50, y: 35 }, diameter: 20, label: '' },
    ],
  }
  const layout = calculateLayout(surface)
  expect(layout.error).toBeUndefined()
  expect(layout.openings.find(opening => opening.openingId === 'hidden')?.pieceIds).toEqual([])
  expect(layout.openings.find(opening => opening.openingId === 'merged')).toEqual({
    openingId: 'merged', pieceIds: [layout.pieces[0].id],
  })
})
