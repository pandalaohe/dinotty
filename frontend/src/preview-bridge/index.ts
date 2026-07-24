export type CaptureErrorCode =
  | 'snapdom-load-failed'
  | 'raster-failed'
  | 'canvas-tainted'
  | 'document-too-large'
  | 'capture-in-progress'

export class CaptureBridgeError extends Error {
  readonly code: CaptureErrorCode

  constructor(code: CaptureErrorCode) {
    super(code)
    this.name = 'CaptureBridgeError'
    this.code = code
  }
}

export interface CaptureResult {
  bitmap: ImageBitmap
  documentWidthCss: number
  documentHeightCss: number
  capturedScale: number
  background: string
}

const MAX_CANVAS_DIMENSION = 16_384

let snapdomModule: Promise<typeof import('@zumer/snapdom')> | undefined
let captureInProgress = false

function captureError(code: CaptureErrorCode): CaptureBridgeError {
  return new CaptureBridgeError(code)
}

function isSecurityError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'SecurityError'
}

function calculateCaptureScale(
  documentWidth: number,
  documentHeight: number,
  dpr: number,
  pixelCap: number
): number {
  if (documentWidth <= 0 || documentHeight <= 0 || dpr <= 0 || pixelCap <= 0) {
    throw captureError('document-too-large')
  }
  return Math.min(1, Math.sqrt(pixelCap / (documentWidth * documentHeight * dpr * dpr)))
}

async function loadSnapdom(): Promise<typeof import('@zumer/snapdom')> {
  snapdomModule ??= import('@zumer/snapdom')
  try {
    return await snapdomModule
  } catch {
    throw captureError('snapdom-load-failed')
  }
}

function nextAnimationFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()))
}

async function waitForStableDocument(): Promise<void> {
  const fontsReady = document.fonts?.ready
  if (fontsReady) {
    await Promise.race([
      fontsReady.catch(() => undefined),
      new Promise<void>((resolve) => window.setTimeout(resolve, 1_000)),
    ])
  }
  await nextAnimationFrame()
  await nextAnimationFrame()
}

function documentExtent(root: HTMLElement): { width: number; height: number } {
  const body = document.body
  const width = Math.ceil(
    Math.max(
      root.scrollWidth,
      root.offsetWidth,
      root.clientWidth,
      body?.scrollWidth ?? 0,
      body?.offsetWidth ?? 0,
      body?.clientWidth ?? 0
    )
  )
  const height = Math.ceil(
    Math.max(
      root.scrollHeight,
      root.offsetHeight,
      root.clientHeight,
      body?.scrollHeight ?? 0,
      body?.offsetHeight ?? 0,
      body?.clientHeight ?? 0
    )
  )
  return { width, height }
}

function isTransparent(color: string): boolean {
  const normalized = color.trim().toLowerCase()
  if (!normalized || normalized === 'initial' || normalized === 'transparent') return true
  if (/^rgba\([^)]*,\s*0(?:\.0+)?\s*\)$/.test(normalized)) return true
  return /^rgba?\([^)]*\/\s*0(?:\.0+)?%?\s*\)$/.test(normalized)
}

function hasBackgroundImage(image: string): boolean {
  const normalized = image.trim().toLowerCase()
  return normalized !== '' && normalized !== 'initial' && normalized !== 'none'
}

const PROPAGATED_BACKGROUND_PROPERTIES = [
  'background-color',
  'background-image',
  'background-repeat',
  'background-position',
  'background-size',
  'background-origin',
  'background-clip',
] as const

interface InlineStyleSnapshot {
  element: HTMLElement
  value: string | null
}

interface DocumentBackground {
  color: string | undefined
  hasImage: boolean
  propagationSource: HTMLElement | undefined
  propagatedValues: ReadonlyMap<string, string>
}

function restoreInlineStyle({ element, value }: InlineStyleSnapshot): void {
  if (value === null) {
    element.removeAttribute('style')
  } else {
    element.setAttribute('style', value)
  }
}

function inspectDocumentBackground(root: HTMLElement): DocumentBackground {
  const rootStyle = getComputedStyle(root)
  const rootColor = rootStyle.backgroundColor
  const rootHasImage = hasBackgroundImage(rootStyle.backgroundImage)
  if (!isTransparent(rootColor) || rootHasImage) {
    return {
      color: isTransparent(rootColor) ? undefined : rootColor,
      hasImage: rootHasImage,
      propagationSource: undefined,
      propagatedValues: new Map(),
    }
  }

  const body = document.body
  if (!body) {
    return {
      color: undefined,
      hasImage: false,
      propagationSource: undefined,
      propagatedValues: new Map(),
    }
  }

  const bodyStyle = getComputedStyle(body)
  const bodyColor = bodyStyle.backgroundColor
  const bodyHasImage = hasBackgroundImage(bodyStyle.backgroundImage)
  if (isTransparent(bodyColor) && !bodyHasImage) {
    return {
      color: undefined,
      hasImage: false,
      propagationSource: undefined,
      propagatedValues: new Map(),
    }
  }

  return {
    color: isTransparent(bodyColor) ? undefined : bodyColor,
    hasImage: bodyHasImage,
    propagationSource: body,
    propagatedValues: new Map(
      PROPAGATED_BACKGROUND_PROPERTIES.map((property) => [
        property,
        bodyStyle.getPropertyValue(property),
      ])
    ),
  }
}

function applyBackgroundPropagation(
  root: HTMLElement,
  background: DocumentBackground,
  documentWidthCss: number,
  documentHeightCss: number
): InlineStyleSnapshot[] {
  const source = background.propagationSource
  if (!source) return []

  const snapshots = [root, source].map((element) => ({
    element,
    value: element.getAttribute('style'),
  }))

  try {
    for (const property of PROPAGATED_BACKGROUND_PROPERTIES) {
      root.style.setProperty(property, background.propagatedValues.get(property) ?? '', 'important')
    }
    root.style.setProperty('background-attachment', 'scroll', 'important')
    root.style.setProperty('min-width', `${documentWidthCss}px`, 'important')
    root.style.setProperty('min-height', `${documentHeightCss}px`, 'important')
    source.style.setProperty('background-color', 'transparent', 'important')
    source.style.setProperty('background-image', 'none', 'important')
  } catch (error) {
    for (const snapshot of snapshots) restoreInlineStyle(snapshot)
    throw error
  }

  return snapshots
}

function sampledPixelColor(pixel: ImageData): string | undefined {
  const [red, green, blue, alphaByte] = pixel.data
  if (alphaByte === 0) return undefined
  if (alphaByte === 255) return `rgb(${red}, ${green}, ${blue})`
  return `rgba(${red}, ${green}, ${blue}, ${Number((alphaByte / 255).toFixed(3))})`
}

function documentBackground(background: DocumentBackground, topLeftPixel: ImageData): string {
  if (background.color) return background.color
  if (background.hasImage) return sampledPixelColor(topLeftPixel) ?? '#ffffff'
  return '#ffffff'
}

export async function capture({ pixelCap }: { pixelCap: number }): Promise<CaptureResult> {
  if (captureInProgress) throw captureError('capture-in-progress')
  captureInProgress = true
  try {
    if (!Number.isFinite(pixelCap) || pixelCap <= 0) {
      throw captureError('document-too-large')
    }

    await waitForStableDocument()

    const root = document.documentElement
    const { width: documentWidthCss, height: documentHeightCss } = documentExtent(root)
    const dpr = Math.max(1, window.devicePixelRatio || 1)
    const capturedScale = calculateCaptureScale(documentWidthCss, documentHeightCss, dpr, pixelCap)
    const outputWidth = Math.ceil(documentWidthCss * dpr * capturedScale)
    const outputHeight = Math.ceil(documentHeightCss * dpr * capturedScale)
    if (
      !Number.isSafeInteger(documentWidthCss) ||
      !Number.isSafeInteger(documentHeightCss) ||
      outputWidth <= 0 ||
      outputHeight <= 0 ||
      outputWidth > MAX_CANVAS_DIMENSION ||
      outputHeight > MAX_CANVAS_DIMENSION
    ) {
      throw captureError('document-too-large')
    }

    const { snapdom } = await loadSnapdom()
    let canvas: HTMLCanvasElement | undefined
    const background = inspectDocumentBackground(root)

    try {
      let styleSnapshots: InlineStyleSnapshot[] = []
      try {
        styleSnapshots = applyBackgroundPropagation(
          root,
          background,
          documentWidthCss,
          documentHeightCss
        )
        canvas = await snapdom.toCanvas(root, {
          dpr,
          scale: capturedScale,
          width: documentWidthCss,
          height: documentHeightCss,
          embedFonts: true,
        })
      } finally {
        for (const snapshot of styleSnapshots) restoreInlineStyle(snapshot)
      }
      if (
        canvas.width <= 0 ||
        canvas.height <= 0 ||
        canvas.width > MAX_CANVAS_DIMENSION ||
        canvas.height > MAX_CANVAS_DIMENSION
      ) {
        throw captureError('document-too-large')
      }

      const context = canvas.getContext('2d')
      if (!context) throw captureError('raster-failed')
      const topLeftPixel = context.getImageData(0, 0, 1, 1)

      const bitmap = await createImageBitmap(canvas)
      return {
        bitmap,
        documentWidthCss,
        documentHeightCss,
        capturedScale,
        background: documentBackground(background, topLeftPixel),
      }
    } catch (error) {
      if (error instanceof CaptureBridgeError) throw error
      if (isSecurityError(error)) throw captureError('canvas-tainted')
      throw captureError('raster-failed')
    } finally {
      if (canvas) {
        canvas.width = 0
        canvas.height = 0
      }
    }
  } finally {
    captureInProgress = false
  }
}
