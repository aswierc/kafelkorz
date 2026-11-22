export type Point = { x: number; y: number }
export type Rect = Point & { width: number; height: number }

export type Opening =
  | { id: string; kind: 'rect'; label: string; rect: Rect }
  | { id: string; kind: 'circle'; label: string; center: Point; diameter: number }

export type SplitDirection = 'horizontal' | 'vertical'
export type Split = { pieceId: string; direction: SplitDirection }
export type Texture = { kind: 'sample'; finish: 'stone' | 'clay' } | { kind: 'asset'; id: string }

export type Surface = {
  id: string
  name: string
  kind: 'wall' | 'floor'
  width: number
  height: number
  tile: { width: number; height: number; orientation: 'horizontal' | 'vertical' }
  grout: number
  clearance: number
  origin: Point
  openings: Opening[]
  splits: Split[]
  texture?: Texture
}

export type PathCommand =
  | { kind: 'M' | 'L'; point: Point }
  | { kind: 'C'; control1: Point; control2: Point; point: Point }
  | { kind: 'Z' }

export type Piece = {
  id: string
  tile: Rect
  bounds: Rect
  path: PathCommand[]
  cut: boolean
  notch?: Rect
  splitOptions: { direction: SplitDirection; parts: [Rect, Rect] }[]
  splitFrom?: string
}

export type OpeningPlacement = {
  openingId: string
  pieceIds: string[]
  drill?: { pieceId: string; offset: Point; diameter: number }
}

export type TileLayout = {
  pieces: Piece[]
  openings: OpeningPlacement[]
  invalidSplits: string[]
  error?: string
}
