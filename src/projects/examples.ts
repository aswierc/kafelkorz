import type { Surface } from '../layout/types'
import type { Project } from './types'

export type Example = 'wall' | 'floor'

export function createSurface(kind: Surface['kind']): Surface {
  return {
    id: crypto.randomUUID(), name: kind === 'wall' ? 'Ściana' : 'Podłoga', kind,
    width: kind === 'wall' ? 2800 : 3200, height: kind === 'wall' ? 2500 : 2400,
    tile: { width: 600, height: 300, orientation: 'horizontal' },
    grout: 3, clearance: 3, origin: { x: 3, y: 3 }, openings: [], splits: [],
  }
}

export function createProject(example?: Example): Project {
  const project: Project = { id: crypto.randomUUID(), schema: 1, name: 'Nowy projekt', surfaces: [] }
  if (example === 'wall') {
    const surface = createSurface('wall')
    project.name = 'Ściana łazienkowa'
    project.surfaces.push({
      ...surface, name: 'Ściana łazienkowa', width: 2800, height: 2460,
      tile: { width: 600, height: 300, orientation: 'horizontal' },
      origin: { x: 48, y: 146 }, texture: { kind: 'sample', finish: 'stone' },
      openings: [
        { id: crypto.randomUUID(), kind: 'rect', label: 'Drzwi', rect: { x: 260, y: 0, width: 810, height: 2050 } },
        { id: crypto.randomUUID(), kind: 'circle', label: 'Puszka', center: { x: 1580, y: 1160 }, diameter: 68 },
        { id: crypto.randomUUID(), kind: 'circle', label: 'Odpływ', center: { x: 2180, y: 585 }, diameter: 52 },
      ],
    })
  }
  if (example === 'floor') {
    project.name = 'Podłoga z rurą'
    project.surfaces.push({
      ...createSurface('floor'), name: 'Podłoga', origin: { x: 135, y: 95 },
      texture: { kind: 'sample', finish: 'clay' },
      openings: [
        { id: crypto.randomUUID(), kind: 'circle', label: 'Rura', center: { x: 3160, y: 1280 }, diameter: 94 },
      ],
    })
  }
  return project
}
