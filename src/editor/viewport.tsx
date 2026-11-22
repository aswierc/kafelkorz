import { useId, useRef, useState } from 'react'
import type { PointerEvent } from 'react'
import { dimensions, formatMm, svgPath } from '../drawing/drawing'
import type { Drawing } from '../drawing/drawing'
import type { Opening, Point, Surface } from '../layout/types'

export type Mode = 'select' | 'grid' | 'pan'

type Props = {
  drawing: Drawing
  texture?: string
  textured: boolean
  mode: Mode
  zoom: number
  pieceId?: string
  openingId?: string
  onPiece: (id: string) => void
  onOpening: (id: string) => void
  onPreview: (surface?: Surface) => void
  onCommit: (surface: Surface) => void
}

type Drag = {
  pointer: number
  screen: Point
  start: Point
  transform: DOMMatrix
  view: Point
  surface: Surface
  opening?: Opening
  action: Mode | 'move' | 'resize'
  moved: boolean
  next?: Surface
}

const round = (n: number) => Math.round(n * 10) / 10
const moveOpening = (opening: Opening, dx: number, dy: number, resize: boolean): Opening => {
  if (opening.kind === 'circle') {
    if (resize) return { ...opening, diameter: Math.max(1, round(opening.diameter + 2 * dx)) }
    return { ...opening, center: { x: round(opening.center.x + dx), y: round(opening.center.y + dy) } }
  }
  const { rect } = opening
  return resize
    ? { ...opening, rect: { ...rect, width: Math.max(1, round(rect.width + dx)), height: Math.max(1, round(rect.height + dy)) } }
    : { ...opening, rect: { ...rect, x: round(rect.x + dx), y: round(rect.y + dy) } }
}

export function Viewport({ drawing, texture, textured, mode, zoom, pieceId, openingId, onPiece, onOpening, onPreview, onCommit }: Props) {
  const { surface, tile } = drawing
  const id = useId()
  const stage = useRef<SVGSVGElement>(null)
  const drag = useRef<Drag | null>(null)
  const ignoreClick = useRef(false)
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 })
  const scale = Math.min(surface.width, surface.height)
  const font = scale / 47
  const margin = scale * 0.105
  const viewWidth = (surface.width + 2 * margin) / zoom
  const viewHeight = (surface.height + 2 * margin) / zoom
  const toSvg = ({ x, y }: Point) => ({ x, y: surface.height - y })
  const originInView = surface.origin.x >= 0 && surface.origin.x <= surface.width
    && surface.origin.y >= 0 && surface.origin.y <= surface.height
  const openingCuts = new Set(drawing.openings.find(item => item.opening.id === openingId && item.opening.kind === 'circle')?.pieceIds)

  function begin(event: PointerEvent<SVGElement>, opening?: Opening, resize = false) {
    if (event.button !== 0 || drag.current) return
    ignoreClick.current = false
    const transform = stage.current?.getScreenCTM()?.inverse()
    if (!transform) return
    const screen = { x: event.clientX, y: event.clientY }
    const start = new DOMPoint(screen.x, screen.y).matrixTransform(transform)
    const action = opening && mode === 'select' ? resize ? 'resize' : 'move' : mode
    if (action === 'select') return
    drag.current = { pointer: event.pointerId, screen, start, transform, view: pan, surface, action, opening, moved: false }
  }

  function move(event: PointerEvent<SVGSVGElement>) {
    const active = drag.current
    if (!active || active.pointer !== event.pointerId) return
    if (!active.moved && Math.hypot(event.clientX - active.screen.x, event.clientY - active.screen.y) < 4) return
    if (!active.moved) {
      event.currentTarget.setPointerCapture(event.pointerId)
      active.moved = true
      if (active.opening && (active.action === 'move' || active.action === 'resize')) onOpening(active.opening.id)
    }
    const now = new DOMPoint(event.clientX, event.clientY).matrixTransform(active.transform)
    const dx = now.x - active.start.x
    const dy = active.start.y - now.y
    const start = active.surface
    if (active.action === 'pan') {
      setPan({ x: active.view.x - dx, y: active.view.y + dy })
    } else if (active.action === 'grid') {
      active.next = { ...start, origin: { x: round(start.origin.x + dx), y: round(start.origin.y + dy) } }
      onPreview(active.next)
    } else if (active.opening) {
      const opening = moveOpening(active.opening, dx, dy, active.action === 'resize')
      active.next = { ...start, openings: start.openings.map(item => item.id === opening.id ? opening : item) }
      onPreview(active.next)
    }
  }

  function end(event: PointerEvent<SVGSVGElement>, cancelled = false) {
    const active = drag.current
    if (!active || active.pointer !== event.pointerId) return
    drag.current = null
    ignoreClick.current = active.moved
    onPreview()
    if (!cancelled && active.next) onCommit(active.next)
    if (cancelled && active.action === 'pan') setPan(active.view)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }

  const patternY = surface.height - surface.origin.y - tile.height - surface.grout
  return <svg ref={stage} className={'viewport mode-' + mode}
    aria-label={'Siatka płytek, ' + surface.name} data-testid="tile-viewport"
    viewBox={[surface.width / 2 - viewWidth / 2 + pan.x, surface.height / 2 - viewHeight / 2 + pan.y, viewWidth, viewHeight].join(' ')}
    onPointerDown={event => begin(event)} onPointerMove={move} onPointerUp={endPointer => end(endPointer)}
    onPointerCancel={event => end(event, true)} onLostPointerCapture={event => end(event, true)}
    onPointerLeave={event => { if (!drag.current?.moved) end(event, true) }}>
    <defs>
      <clipPath id={id + 'surface'}><rect width={surface.width} height={surface.height} /></clipPath>
      {texture && <pattern id={id + 'texture'} patternUnits="userSpaceOnUse" x={surface.origin.x} y={patternY}
        width={tile.width + surface.grout} height={tile.height + surface.grout}>
        <image href={texture} width={surface.tile.width} height={surface.tile.height} preserveAspectRatio="none"
          transform={surface.tile.orientation === 'vertical'
            ? 'translate(' + tile.width + ' ' + surface.grout + ') rotate(90)'
            : 'translate(0 ' + surface.grout + ')'} />
      </pattern>}
    </defs>
    <g className="surface-dimensions" fontSize={font}>
      <line x1="0" y1={-font * 1.6} x2={surface.width} y2={-font * 1.6} />
      <path d={`M0 ${-font * 2} v${font * .8} M${surface.width} ${-font * 2} v${font * .8}`} />
      <text x={surface.width / 2} y={-font * 2} textAnchor="middle">{formatMm(surface.width)} mm</text>
      <line x1={-font * 1.6} y1="0" x2={-font * 1.6} y2={surface.height} />
      <path d={`M${-font * 2} 0 h${font * .8} M${-font * 2} ${surface.height} h${font * .8}`} />
      <text x={-font * 2} y={surface.height / 2} textAnchor="middle"
        transform={`rotate(-90 ${-font * 2} ${surface.height / 2})`}>{formatMm(surface.height)} mm</text>
    </g>
    <rect className="surface-base" width={surface.width} height={surface.height} />
    <g clipPath={'url(#' + id + 'surface)'}>
      {drawing.pieces.map(({ piece, marker, label, position }) => {
        const at = toSvg(position)
        const selected = (pieceId !== undefined && (pieceId === piece.id || pieceId === piece.splitFrom)) || openingCuts.has(piece.id)
        const roomy = piece.bounds.width > font * (label.length * .44 + 1) && piece.bounds.height > font * 2
        const classes = 'tile' + (piece.cut ? ' cut' : '') + (selected ? ' selected' : '') + (textured ? ' textured' : '')
        return <g key={piece.id}>
          <path className={classes} d={svgPath(piece.path, toSvg)} fillRule="evenodd"
            style={textured && texture ? { fill: 'url(#' + id + 'texture)' } : undefined}
            data-testid={piece.splitOptions.length ? 'split-cut' : undefined}
            role={mode === 'select' && piece.cut ? 'button' : undefined} aria-label={piece.cut ? 'Docinka ' + marker : undefined}
            tabIndex={mode === 'select' && piece.splitOptions.length ? 0 : undefined}
            onClick={() => { if (!ignoreClick.current && mode === 'select' && piece.cut) onPiece(piece.id) }}
            onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onPiece(piece.id) } }}>
            {piece.cut && <title>{marker + ' · ' + label + ' mm'}</title>}
          </path>
          {piece.cut && !textured && piece.bounds.width >= font * .75 && piece.bounds.height >= font * .75 &&
            <text className="cut-label" textAnchor="middle" dominantBaseline="central" x={at.x} y={at.y}
              fontSize={roomy ? font * .72 : Math.min(font * .64, piece.bounds.width / 2.3)}>{roomy && !openingCuts.has(piece.id) ? label : marker}</text>}
        </g>
      })}
      {drawing.openings.map(item => <path key={item.opening.id}
        className={'opening' + (item.opening.id === openingId ? ' selected' : '')}
        d={svgPath(item.path, toSvg)} onPointerDown={event => { event.stopPropagation(); begin(event, item.opening) }}
        onClick={() => { if (!ignoreClick.current && mode === 'select') onOpening(item.opening.id) }}>
        <title>{item.marker + ' · ' + item.label + ' · ' + item.size}</title>
      </path>)}
    </g>
    {drawing.openings.map(({ opening, marker, bounds }) => {
      const at = toSvg({ x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 })
      const resize = toSvg({ x: bounds.x + bounds.width, y: opening.kind === 'circle' ? opening.center.y : bounds.y + bounds.height })
      const inside = at.x >= 0 && at.x <= surface.width && at.y >= 0 && at.y <= surface.height
      const showName = !textured && opening.label && bounds.width > (opening.label.length + 7) * font * .4 && bounds.height > font * 1.6
      return <g key={opening.id} className="opening-marker">
        {inside && <text x={at.x} y={at.y} fontSize={font * .66} textAnchor="middle" dominantBaseline="central">{showName ? marker + ' · ' + opening.label : marker}</text>}
        {opening.id === openingId && mode === 'select' &&
          <circle className="resize-handle" cx={resize.x} cy={resize.y} r={font * .31}
            onPointerDown={event => { event.stopPropagation(); begin(event, opening, true) }} />}
      </g>
    })}
    <g className="origin-marker" transform={`translate(${(originInView ? surface.origin.x : 0)} ${surface.height - (originInView ? surface.origin.y : 0)})`}>
      <path d={`M${-font * .24} 0 h${font * .48} M0 ${-font * .24} v${font * .48}`} />
      <circle r={font * .1} />
    </g>
    <text className="anchor-label" x="0" y={surface.height + font * 1.5} fontSize={font * .72}>
      {originInView ? 'Kotwica' : 'Kotwica poza obrysem'} · {dimensions(surface.origin.x, surface.origin.y)} mm
    </text>
  </svg>
}
