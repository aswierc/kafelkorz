import { jsPDF } from 'jspdf'
import fontUrl from '../assets/NotoSans-Regular.ttf?url'
import { dimensions, formatMm } from '../drawing/drawing'
import type { Drawing, DrawnPiece } from '../drawing/drawing'
import type { PathCommand, Point } from '../layout/types'

type ExportPage = { drawing: Drawing; texture?: string }
export type ExportPlan = { name: string; pages: ExportPage[]; includeTexture: boolean }

type PdfOperation = { op: 'm' | 'l' | 'c' | 'h'; c: number[] }
function pdfPath(path: PathCommand[], map: (point: Point) => Point): PdfOperation[] {
  const coords = (value: Point) => {
    const p = map(value)
    return [p.x, p.y]
  }
  return path.map(command => {
    if (command.kind === 'Z') return { op: 'h', c: [] }
    if (command.kind === 'C') return { op: 'c', c: [...coords(command.control1), ...coords(command.control2), ...coords(command.point)] }
    return { op: command.kind === 'M' ? 'm' : 'l', c: coords(command.point) }
  })
}

async function loadBytes(url: string) {
  const response = await fetch(url)
  if (!response.ok) throw new Error('Nie udało się wczytać pliku do eksportu.')
  return new Uint8Array(await response.arrayBuffer())
}

function base64(bytes: Uint8Array) {
  let result = ''
  for (let start = 0; start < bytes.length; start += 8192) result += String.fromCharCode(...bytes.subarray(start, start + 8192))
  return btoa(result)
}

function pageTitle(pdf: jsPDF, title: string, subtitle: string) {
  pdf.setTextColor(33, 43, 34)
  pdf.setFontSize(17)
  const titleWidth = pdf.getTextWidth(title)
  if (titleWidth > 182) pdf.setFontSize(17 * 182 / titleWidth)
  pdf.text(title, 14, 19)
  pdf.setFontSize(8)
  pdf.text(subtitle, 14, 31, { maxWidth: 182 })
  pdf.setDrawColor(180, 176, 163)
  pdf.line(14, 36, 196, 36)
}

function drawTile(pdf: jsPDF, data: DrawnPiece, map: (point: Point) => Point, scale: number, picture?: Uint8Array, vertical?: boolean) {
  const { piece } = data
  const path = pdfPath(piece.path, map)
  if (picture) {
    pdf.saveGraphicsState()
    pdf.path(path)
    pdf.clipEvenOdd()
    pdf.discardPath()
    const start = map({ x: piece.tile.x, y: piece.tile.y + piece.tile.height })
    const width = piece.tile.width * scale
    const height = piece.tile.height * scale
    if (vertical) pdf.addImage(picture, 'JPEG', start.x, start.y - width, height, width, undefined, 'FAST', 270)
    else pdf.addImage(picture, 'JPEG', start.x, start.y, width, height, undefined, 'FAST')
    pdf.restoreGraphicsState()
  } else {
    pdf.setFillColor(...(piece.cut ? [237, 224, 204] : [246, 245, 239]) as [number, number, number])
    pdf.path(path).fillEvenOdd()
  }
  pdf.setDrawColor(130, 126, 115)
  pdf.setLineWidth(0.16)
  pdf.path(path).stroke()
}

function cutLabel(pdf: jsPDF, label: string, at: Point, textured: boolean) {
  if (textured) {
    const width = pdf.getTextWidth(label) + 1
    pdf.setFillColor(250, 247, 239)
    pdf.rect(at.x - width / 2, at.y - 1.55, width, 2.15, 'F')
  }
  pdf.text(label, at.x, at.y, { align: 'center' })
}

function appendix(pdf: jsPDF, drawing: Drawing, rows: string[], fontName: string) {
  if (!rows.length) return
  let nextY = 47
  for (const [index, row] of rows.entries()) {
    pdf.setFontSize(9)
    const lines = pdf.splitTextToSize(row, 180) as string[]
    const step = Math.max(7, lines.length * 4.8 + 3)
    if (index === 0 || nextY + step > 279) {
      pdf.addPage()
      pdf.setFont(fontName)
      pageTitle(pdf, 'Wykaz docinek i otworów', drawing.surface.name + ' · Wymiary w mm')
      pdf.setFontSize(9)
      nextY = 47
    }
    pdf.text(lines, 14, nextY)
    pdf.setDrawColor(226, 223, 213)
    pdf.line(14, nextY + step - 4, 196, nextY + step - 4)
    nextY += step
  }
}

export async function exportPlan(plan: ExportPlan): Promise<Blob> {
  if (!plan.pages.length) throw new Error('Dodaj powierzchnię przed eksportem.')
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', putOnlyUsedFonts: true, compress: true })
  const fontName = 'NotoSans'
  const font = await loadBytes(fontUrl)
  pdf.addFileToVFS('NotoSans.ttf', base64(font))
  pdf.addFont('NotoSans.ttf', fontName, 'normal')
  pdf.setFont(fontName)
  pdf.setProperties({ title: plan.name, creator: 'kafelkorz' })

  for (const [index, { drawing, texture }] of plan.pages.entries()) {
    const { surface } = drawing
    if (drawing.error) throw new Error(surface.name + ' — ' + drawing.error)
    if (index) pdf.addPage()
    pdf.setFont(fontName)
    pageTitle(pdf, surface.name, plan.name + ' · ' + (surface.kind === 'wall' ? 'Ściana' : 'Podłoga') + ' · ' + dimensions(surface.width, surface.height) + ' mm')
    const scale = Math.min(173 / surface.width, 173 / surface.height)
    const chartWidth = surface.width * scale
    const chartHeight = surface.height * scale
    const left = (210 - chartWidth) / 2
    const top = 45
    const map = (point: Point) => ({ x: left + point.x * scale, y: top + chartHeight - point.y * scale })
    const picture = plan.includeTexture && texture ? await loadBytes(texture) : undefined
    pdf.setFillColor(233, 232, 226)
    pdf.rect(left, top, chartWidth, chartHeight, 'F')

    const rows: string[] = []
    const dense = drawing.cuts > 25
    const marked = new Set(drawing.openings.flatMap(item => item.opening.kind === 'circle' ? item.pieceIds : []))
    for (const item of drawing.pieces) drawTile(pdf, item, map, scale, picture, surface.tile.orientation === 'vertical')
    for (const item of drawing.pieces) {
      if (!item.piece.cut) continue
      const at = map(item.position)
      pdf.setTextColor(41, 47, 39)
      pdf.setFontSize(6.5)
      const fullSize = !dense && !item.detail && !marked.has(item.piece.id) &&
        pdf.getTextWidth(item.label) + 1.5 <= item.piece.bounds.width * scale && item.piece.bounds.height * scale >= 4
      if (fullSize) cutLabel(pdf, item.label, { x: at.x, y: at.y + 0.7 }, Boolean(picture))
      else {
        pdf.setFontSize(5.5)
        cutLabel(pdf, item.marker, { x: at.x, y: at.y + 0.6 }, Boolean(picture))
        rows.push(item.marker + ' · ' + item.label + ' mm' + (item.detail ? ' · ' + item.detail : ''))
      }
    }
    pdf.saveGraphicsState()
    pdf.rect(left, top, chartWidth, chartHeight, null)
    pdf.clip()
    pdf.discardPath()
    for (const item of drawing.openings) {
      pdf.setDrawColor(99, 105, 97)
      pdf.setLineWidth(0.2)
      pdf.setLineDashPattern([0.8, 0.6], 0)
      pdf.path(pdfPath(item.path, map)).stroke()
      pdf.setLineDashPattern([], 0)
      const at = map({ x: item.bounds.x + item.bounds.width / 2, y: item.bounds.y + item.bounds.height / 2 })
      pdf.setFontSize(7)
      pdf.setTextColor(42, 48, 41)
      const title = item.opening.label ? item.marker + ' · ' + item.opening.label : item.marker
      const fullName = pdf.getTextWidth(title) + 3 < item.bounds.width * scale && item.bounds.height * scale > 6
      if (at.x >= left && at.x <= left + chartWidth && at.y >= top && at.y <= top + chartHeight) {
        pdf.text(fullName ? title : item.marker, at.x, Math.max(top + 3, at.y), { align: 'center' })
      }
    }
    pdf.restoreGraphicsState()
    pdf.setDrawColor(72, 82, 70)
    pdf.setLineWidth(0.25)
    pdf.rect(left, top, chartWidth, chartHeight, 'S')
    if (surface.origin.x >= 0 && surface.origin.x <= surface.width && surface.origin.y >= 0 && surface.origin.y <= surface.height) {
      const origin = map(surface.origin)
      pdf.setDrawColor(128, 63, 38)
      pdf.line(origin.x - 1.5, origin.y, origin.x + 1.5, origin.y)
      pdf.line(origin.x, origin.y - 1.5, origin.x, origin.y + 1.5)
    }
    let atY = top + chartHeight + 8
    pdf.setFontSize(8)
    pdf.setTextColor(33, 43, 34)
    pdf.text('Płytka ' + dimensions(drawing.tile.width, drawing.tile.height) + ' mm · ' + (surface.tile.orientation === 'horizontal' ? 'Poziomo' : 'Pionowo'), 14, atY)
    atY += 5
    pdf.text('Fuga ' + formatMm(surface.grout) + ' mm · Szczelina obwodowa ' + formatMm(surface.clearance) + ' mm · Docinki w mm', 14, atY)
    atY += 5
    pdf.text('Punkt startowy (+)  ' + formatMm(surface.origin.x) + ' mm od lewej, ' + formatMm(surface.origin.y) + ' mm od dołu', 14, atY)
    atY += 7
    for (const item of drawing.openings) {
      const line = item.marker + ' · ' + item.label + ' · ' + item.size + (item.relation ? ' · ' + item.relation : '')
      const lines = pdf.splitTextToSize(line, 182) as string[]
      if (atY + lines.length * 4 > 282) rows.push(line)
      else {
        pdf.text(lines, 14, atY)
        atY += lines.length * 4 + 1
      }
    }
    if (rows.length && atY <= 283) pdf.text('Wymiary oznaczonych docinek i pozostałych otworów są w wykazie.', 14, atY)
    appendix(pdf, drawing, rows, fontName)
  }

  for (let page = 1; page <= pdf.getNumberOfPages(); page++) {
    pdf.setPage(page)
    pdf.setFontSize(7)
    pdf.setTextColor(105, 108, 100)
    pdf.text('kafelkorz', 14, 290)
    pdf.text(page + ' / ' + pdf.getNumberOfPages(), 196, 290, { align: 'right' })
  }
  return pdf.output('blob')
}
