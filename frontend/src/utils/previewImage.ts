export type DrawTool = 'pen' | 'arrow' | 'rect' | 'text'

export interface DrawCommand {
  tool: DrawTool
  points: number[]
  color: string
  width?: number
  fontSize?: number
  text?: string
}

export type I18nFn = (key: string) => string

async function snapDocument(root: Element, dpr: number, scale: number): Promise<HTMLCanvasElement> {
  const { snapdom } = await import('@zumer/snapdom')
  return snapdom.toCanvas(root, { dpr, scale, embedFonts: true })
}

export function calculateCaptureScale(
  documentWidth: number,
  documentHeight: number,
  dpr: number,
  pixelCap: number
): number {
  if (documentWidth <= 0 || documentHeight <= 0 || dpr <= 0 || pixelCap <= 0) {
    throw new Error('capture dimensions must be positive')
  }
  return Math.min(1, Math.sqrt(pixelCap / (documentWidth * documentHeight * dpr * dpr)))
}

function viewportMetrics(iframe: HTMLIFrameElement) {
  const doc = iframe.contentDocument
  const win = iframe.contentWindow
  if (!doc || !win) throw new Error('iframe document is not accessible')

  const root = doc.documentElement
  const width = root.clientWidth || win.innerWidth
  const height = root.clientHeight || win.innerHeight
  if (!root || width <= 0 || height <= 0) throw new Error('iframe viewport has no size')

  return { doc, win, root, width, height }
}

export async function captureViewport(
  iframe: HTMLIFrameElement,
  { pixelCap }: { pixelCap: number }
): Promise<HTMLCanvasElement> {
  const { win, root, width, height } = viewportMetrics(iframe)
  const documentWidth = Math.max(root.scrollWidth, root.offsetWidth, width)
  const documentHeight = Math.max(root.scrollHeight, root.offsetHeight, height)
  const deviceDpr = Math.max(1, win.devicePixelRatio || window.devicePixelRatio || 1)
  const capScale = calculateCaptureScale(documentWidth, documentHeight, deviceDpr, pixelCap)
  const outputDpr = deviceDpr * capScale
  const snapshot = await snapDocument(root, deviceDpr, capScale)
  let output: HTMLCanvasElement | undefined
  let succeeded = false

  try {
    const scaleX = snapshot.width / documentWidth
    const scaleY = snapshot.height / documentHeight
    output = document.createElement('canvas')
    output.width = Math.max(1, Math.floor(width * outputDpr))
    output.height = Math.max(1, Math.floor(height * outputDpr))
    const ctx = output.getContext('2d')
    if (!ctx) throw new Error('2D canvas is unavailable')

    const sx = Math.max(0, win.scrollX * scaleX)
    const sy = Math.max(0, win.scrollY * scaleY)
    const sw = Math.min(snapshot.width - sx, width * scaleX)
    const sh = Math.min(snapshot.height - sy, height * scaleY)
    if (sw <= 0 || sh <= 0) throw new Error('captured viewport is empty')
    ctx.drawImage(snapshot, sx, sy, sw, sh, 0, 0, output.width, output.height)
    succeeded = true
    return output
  } finally {
    snapshot.width = 0
    snapshot.height = 0
    if (!succeeded && output) {
      output.width = 0
      output.height = 0
    }
  }
}

export function renderDrawCommands(
  ctx: CanvasRenderingContext2D,
  commands: DrawCommand[],
  width: number,
  height: number
): void {
  ctx.save()
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  for (const command of commands) {
    const p = command.points
    ctx.strokeStyle = command.color
    ctx.fillStyle = command.color
    ctx.lineWidth = Math.max(1, (command.width ?? 0.004) * height)

    if (command.tool === 'pen' && p.length >= 4) {
      ctx.beginPath()
      ctx.moveTo(p[0] * width, p[1] * height)
      for (let i = 2; i + 1 < p.length; i += 2) ctx.lineTo(p[i] * width, p[i + 1] * height)
      ctx.stroke()
    } else if (command.tool === 'rect' && p.length >= 4) {
      ctx.strokeRect(p[0] * width, p[1] * height, (p[2] - p[0]) * width, (p[3] - p[1]) * height)
    } else if (command.tool === 'arrow' && p.length >= 4) {
      const x1 = p[0] * width
      const y1 = p[1] * height
      const x2 = p[2] * width
      const y2 = p[3] * height
      const angle = Math.atan2(y2 - y1, x2 - x1)
      const head = Math.max(ctx.lineWidth * 4, height * 0.018)
      ctx.beginPath()
      ctx.moveTo(x1, y1)
      ctx.lineTo(x2, y2)
      ctx.moveTo(x2, y2)
      ctx.lineTo(
        x2 - head * Math.cos(angle - Math.PI / 6),
        y2 - head * Math.sin(angle - Math.PI / 6)
      )
      ctx.moveTo(x2, y2)
      ctx.lineTo(
        x2 - head * Math.cos(angle + Math.PI / 6),
        y2 - head * Math.sin(angle + Math.PI / 6)
      )
      ctx.stroke()
    } else if (command.tool === 'text' && command.text && p.length >= 2) {
      ctx.font = `${Math.max(1, (command.fontSize ?? 0.035) * height)}px sans-serif`
      ctx.textBaseline = 'top'
      ctx.fillText(command.text, p[0] * width, p[1] * height)
    }
  }

  ctx.restore()
}

export async function compositePng(base: HTMLCanvasElement, commands: DrawCommand[]): Promise<Blob> {
  const output = document.createElement('canvas')
  try {
    output.width = base.width
    output.height = base.height
    const ctx = output.getContext('2d')
    if (!ctx || output.width <= 0 || output.height <= 0) {
      throw new Error('2D canvas is unavailable')
    }
    ctx.drawImage(base, 0, 0)
    renderDrawCommands(ctx, commands, output.width, output.height)
    return await new Promise<Blob>((resolve, reject) => {
      let settled = false
      let timer = 0
      const finish = (callback: () => void) => {
        if (settled) return
        settled = true
        window.clearTimeout(timer)
        callback()
      }
      timer = window.setTimeout(
        () => finish(() => reject(new Error('PNG encoding timed out'))),
        10_000
      )
      try {
        output.toBlob(
          (blob) =>
            finish(() => {
              if (blob) resolve(blob)
              else reject(new Error('PNG encoding failed'))
            }),
          'image/png'
        )
      } catch (error) {
        finish(() => reject(error))
      }
    })
  } finally {
    output.width = 0
    output.height = 0
  }
}

export function downloadPng(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  let link: HTMLAnchorElement | undefined
  try {
    link = document.createElement('a')
    link.href = url
    link.download = filename
    link.style.display = 'none'
    document.body.appendChild(link)
    link.click()
  } finally {
    try {
      link?.remove()
    } finally {
      URL.revokeObjectURL(url)
    }
  }
}

async function copyWithExecCommand(blob: Blob, t: I18nFn): Promise<boolean> {
  const url = URL.createObjectURL(blob)
  let holder: HTMLDivElement | undefined

  try {
    holder = document.createElement('div')
    const image = document.createElement('img')
    holder.contentEditable = 'true'
    holder.setAttribute('aria-hidden', 'true')
    holder.style.cssText = 'position:fixed;left:-10000px;top:0;opacity:0;pointer-events:none;'
    image.src = url
    image.alt = t('preview.annotation.clipboardImageAlt')
    holder.appendChild(image)
    document.body.appendChild(holder)

    if (typeof image.decode === 'function') {
      try {
        await image.decode()
      } catch (error) {
        if (!image.complete || image.naturalWidth <= 0) throw error
      }
    } else {
      await new Promise<void>((resolve, reject) => {
        const verifyDecoded = () => {
          if (image.naturalWidth > 0) resolve()
          else reject(new Error('clipboard image failed to decode'))
        }
        image.onload = verifyDecoded
        image.onerror = () => reject(new Error('clipboard image failed to load'))
        if (image.complete) verifyDecoded()
      })
    }
    const selection = window.getSelection()
    const range = document.createRange()
    range.selectNode(image)
    selection?.removeAllRanges()
    selection?.addRange(range)
    return typeof document.execCommand === 'function' && document.execCommand('copy')
  } finally {
    try {
      try {
        window.getSelection()?.removeAllRanges()
      } finally {
        holder?.remove()
      }
    } finally {
      URL.revokeObjectURL(url)
    }
  }
}

export async function copyPngWithFallback(
  blob: Blob,
  t: I18nFn
): Promise<'clipboard' | 'execCommand' | 'download'> {
  try {
    if (navigator.clipboard?.write && typeof ClipboardItem !== 'undefined') {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
      return 'clipboard'
    }
  } catch {}

  try {
    if (await copyWithExecCommand(blob, t)) return 'execCommand'
  } catch {}

  downloadPng(blob, t('preview.annotation.filename'))
  return 'download'
}
