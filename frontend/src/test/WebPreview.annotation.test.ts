import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { settings } from '../composables/useSettings'
import WebAnnotationLayer from '../components/preview/WebAnnotationLayer.vue'
import WebPreview from '../components/preview/WebPreview.vue'
import { capture } from '../preview-bridge'
import {
  CaptureRequestError,
  calculateCaptureScale,
  copyPngWithFallback,
  downloadPng,
  isCaptureInitOriginAllowed,
  renderDrawCommands,
  type CaptureBasis,
  type DrawCommand,
} from '../utils/previewImage'
import {
  ANNOTATION_STORAGE_KEY,
  MAX_ANNOTATION_BYTES,
  createAnnotationRetentionStore,
} from '../utils/previewAnnotationRetention'

const mocks = vi.hoisted(() => ({
  snapdomToCanvas: vi.fn(),
  toastError: vi.fn(),
  toastInfo: vi.fn(),
  toastSuccess: vi.fn(),
  requestCapture: vi.fn(),
}))

vi.mock('@zumer/snapdom', () => ({
  snapdom: { toCanvas: mocks.snapdomToCanvas },
}))

vi.mock('../utils/previewImage', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../utils/previewImage')>()
  return { ...actual, requestCapture: mocks.requestCapture }
})

vi.mock('../composables/apiBase', () => ({
  getApiBase: vi.fn().mockResolvedValue(''),
}))

vi.mock('vue-toastification', () => ({
  useToast: () => ({
    error: mocks.toastError,
    info: mocks.toastInfo,
    success: mocks.toastSuccess,
  }),
}))

type ContextMock = CanvasRenderingContext2D & {
  drawImage: ReturnType<typeof vi.fn>
  fillRect: ReturnType<typeof vi.fn>
  getImageData: ReturnType<typeof vi.fn>
  strokeRect: ReturnType<typeof vi.fn>
}

class ResizeObserverMock {
  static instances: ResizeObserverMock[] = []
  private callback: ResizeObserverCallback

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback
    ResizeObserverMock.instances.push(this)
  }

  observe() {}
  disconnect() {}
  trigger() {
    this.callback([], this as unknown as ResizeObserver)
  }
}

const contexts = new WeakMap<HTMLCanvasElement, ContextMock>()
const createdUrls: string[] = []
const revokedUrls: string[] = []
const initialRootStyle = document.documentElement.getAttribute('style')
const initialBodyStyle = document.body.getAttribute('style')
let urlSequence = 0

function restoreStyleAttribute(element: HTMLElement, value: string | null) {
  if (value === null) element.removeAttribute('style')
  else element.setAttribute('style', value)
}

function contextFor(canvas: HTMLCanvasElement): ContextMock {
  let context = contexts.get(canvas)
  if (!context) {
    context = {
      save: vi.fn(),
      restore: vi.fn(),
      setTransform: vi.fn(),
      clearRect: vi.fn(),
      drawImage: vi.fn(),
      fillRect: vi.fn(),
      getImageData: vi.fn(() => ({
        data: new Uint8ClampedArray([255, 255, 255, 255]),
        width: 1,
        height: 1,
        colorSpace: 'srgb',
      })),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      strokeRect: vi.fn(),
      fillText: vi.fn(),
      lineCap: 'round',
      lineJoin: 'round',
      lineWidth: 1,
      strokeStyle: '#000000',
      fillStyle: '#000000',
      font: '',
      textBaseline: 'top',
    } as unknown as ContextMock
    contexts.set(canvas, context)
  }
  return context
}

function makeBitmap(width = 320, height = 200) {
  return { width, height, close: vi.fn() } as unknown as ImageBitmap
}

const basis = (width = 320, height = 200, capturedScale = 1): CaptureBasis => ({
  documentWidthCss: width,
  documentHeightCss: height,
  capturedScale,
})

function makeCanvas(width = 320, height = 200) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return canvas
}

function configureCaptureExtent(width = 320, height = 200) {
  for (const element of [document.documentElement, document.body]) {
    for (const [key, value] of Object.entries({
      clientWidth: width,
      clientHeight: height,
      scrollWidth: width,
      scrollHeight: height,
      offsetWidth: width,
      offsetHeight: height,
    })) {
      Object.defineProperty(element, key, { configurable: true, value })
    }
  }
}

function setRect(element: Element, width: number, height: number) {
  Object.defineProperty(element, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: width,
      bottom: height,
      width,
      height,
      toJSON: () => ({}),
    }),
  })
}

async function mountTextAnnotationLayer() {
  const layer = mount(WebAnnotationLayer, {
    props: {
      visible: true,
      enabled: true,
      pageWidth: 100,
      pageHeight: 100,
      basis: basis(100, 100),
    },
  })
  const host = layer.get('.web-annotation-layer')
  const canvas = layer.get('canvas')
  setRect(host.element, 100, 100)
  setRect(canvas.element, 100, 100)
  ;(layer.vm as unknown as { setTool: (tool: string) => void }).setTool('text')
  await canvas.trigger('pointerdown', {
    button: 0,
    pointerId: 1,
    clientX: 20,
    clientY: 30,
  })
  return {
    layer,
    input: layer.get<HTMLInputElement>('.annotation-text-input'),
    exposed: layer.vm as unknown as { getCommands: () => DrawCommand[] },
  }
}

function configureSameOriginIframe(iframe: HTMLIFrameElement, width = 320, height = 200) {
  const doc = document.implementation.createHTMLDocument('preview')
  for (const [key, value] of Object.entries({
    clientWidth: width,
    clientHeight: height,
    scrollWidth: width,
    scrollHeight: height,
    offsetWidth: width,
    offsetHeight: height,
  })) {
    Object.defineProperty(doc.documentElement, key, { configurable: true, value })
  }
  Object.defineProperty(doc, 'fonts', {
    configurable: true,
    value: { ready: Promise.resolve() },
  })
  Object.defineProperty(iframe, 'contentDocument', { configurable: true, value: doc })
  Object.defineProperty(iframe, 'contentWindow', {
    configurable: true,
    value: {
      devicePixelRatio: 1,
      innerWidth: width,
      innerHeight: height,
      scrollX: 0,
      scrollY: 0,
    },
  })
  setRect(iframe, width, height)
  return doc
}

async function mountReadyPreview() {
  const wrapper = mount(WebPreview, { props: { visible: true, url: 'http://localhost:4173/' } })
  const iframe = wrapper.get('iframe').element as HTMLIFrameElement
  configureSameOriginIframe(iframe)
  await wrapper.get('iframe').trigger('load')
  announceReady(wrapper)
  await flushPromises()
  return wrapper
}

function announceReady(
  wrapper: ReturnType<typeof mount>,
  options: { origin?: string; source?: MessageEventSource | null } = {}
) {
  const iframe = wrapper.get('iframe').element as HTMLIFrameElement
  window.dispatchEvent(
    new MessageEvent('message', {
      data: { type: 'dinotty:capture-ready', v: 1 },
      origin: options.origin ?? new URL(iframe.getAttribute('src')!, location.href).origin,
      source: options.source === undefined ? iframe.contentWindow : options.source,
    })
  )
}

async function freezePreview(wrapper: Awaited<ReturnType<typeof mountReadyPreview>>) {
  await wrapper.get('button[aria-label="Freeze preview"]').trigger('click')
  await flushPromises()
  await flushPromises()
}

beforeEach(() => {
  settings.locale = 'en'
  mocks.snapdomToCanvas.mockReset().mockImplementation(() => Promise.resolve(makeCanvas()))
  mocks.toastError.mockReset()
  mocks.toastInfo.mockReset()
  mocks.toastSuccess.mockReset()
  mocks.requestCapture.mockReset().mockImplementation(() =>
    Promise.resolve({
      bitmap: makeBitmap(),
      documentWidthCss: 320,
      documentHeightCss: 200,
      capturedScale: 1,
      background: '#ffffff',
    })
  )
  ResizeObserverMock.instances = []
  createdUrls.length = 0
  revokedUrls.length = 0
  urlSequence = 0
  sessionStorage.clear()
  vi.stubGlobal('ResizeObserver', ResizeObserverMock)
  vi.stubGlobal(
    'createImageBitmap',
    vi.fn(() => Promise.resolve(makeBitmap()))
  )
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    callback(0)
    return 1
  })
  Object.defineProperty(window, 'devicePixelRatio', { configurable: true, value: 1 })
  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
    configurable: true,
    value(this: HTMLCanvasElement) {
      return contextFor(this)
    },
  })
  Object.defineProperty(HTMLCanvasElement.prototype, 'toBlob', {
    configurable: true,
    value(callback: BlobCallback) {
      callback(new Blob(['png'], { type: 'image/png' }))
    },
  })
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    value: vi.fn(() => {
      const url = `blob:preview-${++urlSequence}`
      createdUrls.push(url)
      return url
    }),
  })
  Object.defineProperty(URL, 'revokeObjectURL', {
    configurable: true,
    value: vi.fn((url: string) => revokedUrls.push(url)),
  })
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
  restoreStyleAttribute(document.documentElement, initialRootStyle)
  restoreStyleAttribute(document.body, initialBodyStyle)
})

describe('EPV1 embedded preview annotation', () => {
  it('propagates a gradient body background only for raster and restores exact inline styles', async () => {
    configureCaptureExtent(411, 603)
    const root = document.documentElement
    const body = document.body
    setRect(root, 411, 353)
    const rootStyle =
      'background-color: transparent !important; min-width: 17px; min-height: 19px; --root-token: preserved'
    const bodyStyle =
      'margin: 7px; background-color: transparent; background-image: linear-gradient(red, blue); background-repeat: repeat-x !important; background-position: 11px 13px; background-size: 17px 19px; background-origin: content-box; background-clip: padding-box; background-attachment: fixed; --body-token: keep'
    root.setAttribute('style', rootStyle)
    body.setAttribute('style', bodyStyle)
    const bodyComputed = getComputedStyle(body)
    const expectedBackground = Object.fromEntries(
      [
        'background-color',
        'background-image',
        'background-repeat',
        'background-position',
        'background-size',
        'background-origin',
        'background-clip',
      ].map((property) => [property, bodyComputed.getPropertyValue(property)])
    )
    const canvas = makeCanvas()
    contextFor(canvas).getImageData.mockReturnValue({
      data: new Uint8ClampedArray([12, 34, 56, 255]),
      width: 1,
      height: 1,
      colorSpace: 'srgb',
    })
    mocks.snapdomToCanvas.mockImplementation(async (_root, options) => {
      for (const [property, value] of Object.entries(expectedBackground)) {
        expect(root.style.getPropertyValue(property)).toBe(value)
        expect(root.style.getPropertyPriority(property)).toBe('important')
      }
      expect(root.style.getPropertyValue('background-attachment')).toBe('scroll')
      expect(root.style.getPropertyPriority('background-attachment')).toBe('important')
      expect(root.style.getPropertyValue('min-width')).toBe('411px')
      expect(root.style.getPropertyPriority('min-width')).toBe('important')
      expect(root.style.getPropertyValue('min-height')).toBe('603px')
      expect(root.style.getPropertyPriority('min-height')).toBe('important')
      expect(options.width).toBe(411)
      expect(options.height).toBe(603)
      expect(body.style.getPropertyValue('background-color')).toBe('transparent')
      expect(body.style.getPropertyValue('background-image')).toBe('none')
      expect(body.style.getPropertyPriority('background-image')).toBe('important')
      expect(body.style.margin).toBe('7px')
      expect(body.style.getPropertyValue('--body-token')).toBe('keep')
      return canvas
    })

    const result = await capture({ pixelCap: 1_000_000 })

    expect(result.background).toBe('rgb(12, 34, 56)')
    expect(root.getAttribute('style')).toBe(rootStyle)
    expect(body.getAttribute('style')).toBe(bodyStyle)
    expect(root.style.getPropertyPriority('background-color')).toBe('important')
    expect(body.style.getPropertyPriority('background-repeat')).toBe('important')
  })

  it('restores exact root and body inline styles when gradient rasterization throws', async () => {
    configureCaptureExtent(411, 603)
    const root = document.documentElement
    const body = document.body
    setRect(root, 411, 353)
    const rootStyle =
      'background-color: transparent; min-width: 23px !important; min-height: 29px; color: rgb(1, 2, 3) !important'
    const bodyStyle =
      'padding: 3px; background-image: linear-gradient(gold, navy) !important; background-position: 4px 5px'
    root.setAttribute('style', rootStyle)
    body.setAttribute('style', bodyStyle)
    mocks.snapdomToCanvas.mockImplementation(async () => {
      expect(root.style.backgroundImage).toContain('linear-gradient')
      expect(root.style.getPropertyValue('min-width')).toBe('411px')
      expect(root.style.getPropertyPriority('min-width')).toBe('important')
      expect(root.style.getPropertyValue('min-height')).toBe('603px')
      expect(root.style.getPropertyPriority('min-height')).toBe('important')
      expect(body.style.backgroundImage).toBe('none')
      throw new Error('raster failed')
    })

    await expect(capture({ pixelCap: 1_000_000 })).rejects.toMatchObject({
      code: 'raster-failed',
    })
    expect(root.getAttribute('style')).toBe(rootStyle)
    expect(body.getAttribute('style')).toBe(bodyStyle)
  })

  it('rejects a concurrent capture immediately and still restores the first capture styles', async () => {
    configureCaptureExtent(411, 603)
    const root = document.documentElement
    const body = document.body
    const rootStyle = 'background-color: transparent; --root-token: concurrent'
    const bodyStyle =
      'background-image: linear-gradient(red, blue); margin: 9px; --body-token: concurrent'
    root.setAttribute('style', rootStyle)
    body.setAttribute('style', bodyStyle)
    let resolveRaster!: (canvas: HTMLCanvasElement) => void
    mocks.snapdomToCanvas.mockReturnValue(
      new Promise<HTMLCanvasElement>((resolve) => {
        resolveRaster = resolve
      })
    )

    const firstCapture = capture({ pixelCap: 1_000_000 })
    await vi.waitFor(() => expect(mocks.snapdomToCanvas).toHaveBeenCalledOnce())
    expect(root.style.backgroundImage).toContain('linear-gradient')
    expect(body.style.backgroundImage).toBe('none')

    await expect(capture({ pixelCap: 1_000_000 })).rejects.toMatchObject({
      code: 'capture-in-progress',
    })

    resolveRaster(makeCanvas())
    await expect(firstCapture).resolves.toMatchObject({
      documentWidthCss: 411,
      documentHeightCss: 603,
    })
    expect(root.getAttribute('style')).toBe(rootStyle)
    expect(body.getAttribute('style')).toBe(bodyStyle)
  })

  it('does not propagate body background when html has its own background', async () => {
    configureCaptureExtent()
    const root = document.documentElement
    const body = document.body
    const rootStyle = 'background-color: rgb(9, 8, 7) !important; border: 0'
    const bodyStyle = 'background-image: linear-gradient(red, blue); margin: 12px !important'
    root.setAttribute('style', rootStyle)
    body.setAttribute('style', bodyStyle)
    mocks.snapdomToCanvas.mockImplementation(async () => {
      expect(root.getAttribute('style')).toBe(rootStyle)
      expect(body.getAttribute('style')).toBe(bodyStyle)
      expect(root.style.getPropertyValue('min-width')).toBe('')
      expect(root.style.getPropertyValue('min-height')).toBe('')
      return makeCanvas()
    })

    const result = await capture({ pixelCap: 1_000_000 })

    expect(result.background).toBe('rgb(9, 8, 7)')
    expect(root.getAttribute('style')).toBe(rootStyle)
    expect(body.getAttribute('style')).toBe(bodyStyle)
  })

  it('keeps the opaque body color as the returned capture background', async () => {
    configureCaptureExtent()
    const root = document.documentElement
    const body = document.body
    const rootStyle = 'background-color: transparent'
    const bodyStyle = 'background-color: rgb(21, 22, 23); margin: 5px'
    root.setAttribute('style', rootStyle)
    body.setAttribute('style', bodyStyle)
    mocks.snapdomToCanvas.mockImplementation(async () => {
      expect(root.style.backgroundColor).toBe('rgb(21, 22, 23)')
      expect(body.style.backgroundColor).toBe('transparent')
      return makeCanvas()
    })

    const result = await capture({ pixelCap: 1_000_000 })

    expect(result.background).toBe('rgb(21, 22, 23)')
    expect(root.getAttribute('style')).toBe(rootStyle)
    expect(body.getAttribute('style')).toBe(bodyStyle)
  })

  it('falls back to white when neither html nor body has a background', async () => {
    configureCaptureExtent()
    const root = document.documentElement
    const body = document.body
    root.removeAttribute('style')
    body.setAttribute('style', 'margin: 6px')
    mocks.snapdomToCanvas.mockImplementation(async () => {
      expect(root.hasAttribute('style')).toBe(false)
      expect(body.getAttribute('style')).toBe('margin: 6px')
      return makeCanvas()
    })

    const result = await capture({ pixelCap: 1_000_000 })

    expect(result.background).toBe('#ffffff')
    expect(root.hasAttribute('style')).toBe(false)
    expect(body.getAttribute('style')).toBe('margin: 6px')
  })

  it('freezes, annotates, exports a composite, and retains annotations across unfreeze', async () => {
    const wrapper = await mountReadyPreview()
    await freezePreview(wrapper)
    expect(wrapper.find('button[aria-label="Return to live preview"]').exists()).toBe(true)
    const frozenCanvas = wrapper.get('.frozen-bitmap').element as HTMLCanvasElement
    const frozenContext = contextFor(frozenCanvas)
    expect(frozenCanvas.width).toBe(320)
    expect(frozenCanvas.style.width).toBe('320px')
    expect(frozenContext.fillRect.mock.invocationCallOrder[0]).toBeLessThan(
      frozenContext.drawImage.mock.invocationCallOrder[0]
    )
    const captureResult = await mocks.requestCapture.mock.results[0].value
    expect(captureResult.bitmap.close).toHaveBeenCalledOnce()

    const layer = wrapper.get('.web-annotation-layer')
    const canvas = layer.get('canvas')
    setRect(layer.element, 320, 200)
    setRect(canvas.element, 320, 200)
    await canvas.trigger('pointerdown', { button: 0, pointerId: 1, clientX: 32, clientY: 20 })
    await canvas.trigger('pointermove', { pointerId: 1, clientX: 160, clientY: 100 })
    await canvas.trigger('pointerup', { pointerId: 1, clientX: 160, clientY: 100 })

    await wrapper.get('button[aria-label="Rectangle"]').trigger('click')
    await canvas.trigger('pointerdown', { button: 0, pointerId: 2, clientX: 64, clientY: 40 })
    await canvas.trigger('pointermove', { pointerId: 2, clientX: 288, clientY: 180 })
    await canvas.trigger('pointerup', { pointerId: 2, clientX: 288, clientY: 180 })
    expect(
      wrapper.get('button[aria-label="Undo annotation"]').attributes('disabled')
    ).toBeUndefined()

    await wrapper.get('button[aria-label="Download annotated PNG"]').trigger('click')
    await flushPromises()
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledOnce()
    expect(createdUrls).toEqual(revokedUrls)

    await wrapper.get('button[aria-label="Return to live preview"]').trigger('click')
    expect(wrapper.find('button[aria-label="Freeze preview"]').exists()).toBe(true)
    await freezePreview(wrapper)
    expect(
      wrapper.get('button[aria-label="Undo annotation"]').attributes('disabled')
    ).toBeUndefined()
    const exposed = wrapper.findComponent(WebAnnotationLayer).vm as unknown as {
      getCommands: () => DrawCommand[]
    }
    expect(exposed.getCommands()).toHaveLength(2)
    wrapper.unmount()
  })

  it('discards a capture when navigation changes its generation and recovers live mode', async () => {
    let resolveCapture!: (result: {
      bitmap: ImageBitmap
      documentWidthCss: number
      documentHeightCss: number
      capturedScale: number
      background: string
    }) => void
    const pendingBitmap = makeBitmap()
    mocks.requestCapture.mockReturnValue(
      new Promise((resolve) => {
        resolveCapture = resolve
      })
    )
    const wrapper = await mountReadyPreview()
    await wrapper.get('button[aria-label="Freeze preview"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('button[aria-label="Capturing preview…"]').exists()).toBe(true)

    await wrapper.setProps({ url: 'http://localhost:4174/' })
    resolveCapture({
      bitmap: pendingBitmap,
      documentWidthCss: 320,
      documentHeightCss: 200,
      capturedScale: 1,
      background: '#fff',
    })
    await flushPromises()
    expect(wrapper.find('.web-preview-content.frozen').exists()).toBe(false)
    expect(pendingBitmap.close).toHaveBeenCalledOnce()
    expect(mocks.toastError).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('keeps freeze disabled when the bridge does not announce within three seconds', async () => {
    vi.useFakeTimers()
    const wrapper = mount(WebPreview, { props: { visible: true, url: 'https://example.com/' } })
    const iframe = wrapper.get('iframe').element as HTMLIFrameElement
    await expect(wrapper.get('iframe').trigger('load')).resolves.toBeUndefined()
    await vi.advanceTimersByTimeAsync(3000)
    const freezeButton = wrapper.get(
      'button[aria-label="Freeze is unavailable because this page did not start the capture bridge"]'
    )
    expect(freezeButton.attributes('disabled')).toBeDefined()
    expect(mocks.toastError).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('accepts capture readiness announced before iframe load and preserves its generation', async () => {
    const wrapper = mount(WebPreview, {
      props: { visible: true, url: 'http://localhost:4173/' },
    })
    const iframe = wrapper.get('iframe').element as HTMLIFrameElement
    configureSameOriginIframe(iframe)

    announceReady(wrapper)
    await flushPromises()
    expect(
      wrapper.get('button[aria-label="Freeze preview"]').attributes('disabled')
    ).toBeUndefined()

    await wrapper.get('iframe').trigger('load')
    expect(
      wrapper.get('button[aria-label="Freeze preview"]').attributes('disabled')
    ).toBeUndefined()
    wrapper.unmount()
  })

  it('rejects capture-ready announcements from the wrong source or origin', async () => {
    const wrapper = mount(WebPreview, {
      props: { visible: true, url: 'http://localhost:4173/' },
    })
    const iframe = wrapper.get('iframe').element as HTMLIFrameElement
    configureSameOriginIframe(iframe)
    await wrapper.get('iframe').trigger('load')

    announceReady(wrapper, { source: window })
    announceReady(wrapper, { origin: 'https://spoofed.example' })
    await flushPromises()

    expect(
      wrapper
        .get(
          'button[aria-label="Freeze is unavailable because this page did not start the capture bridge"]'
        )
        .attributes('disabled')
    ).toBeDefined()
    expect(mocks.requestCapture).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('accepts only the four permitted parent-origin classes', () => {
    const pageOrigin = 'https://dinotty.example'
    expect(isCaptureInitOriginAllowed(pageOrigin, pageOrigin)).toBe(true)
    expect(isCaptureInitOriginAllowed('tauri://localhost', pageOrigin)).toBe(true)
    expect(isCaptureInitOriginAllowed('http://tauri.localhost', pageOrigin)).toBe(true)
    expect(isCaptureInitOriginAllowed('http://localhost:8998', pageOrigin)).toBe(true)
    expect(isCaptureInitOriginAllowed('https://127.0.0.1:8998', pageOrigin)).toBe(true)
    expect(isCaptureInitOriginAllowed('tauri://attacker', pageOrigin)).toBe(false)
    expect(isCaptureInitOriginAllowed('https://tauri.localhost', pageOrigin)).toBe(false)
    expect(isCaptureInitOriginAllowed('https://localhost', pageOrigin)).toBe(false)
    expect(isCaptureInitOriginAllowed('https://attacker.example', pageOrigin)).toBe(false)
    expect(isCaptureInitOriginAllowed('not an origin', pageOrigin)).toBe(false)
  })

  it('re-keys retention and clears annotations on a trusted proxy navigation', async () => {
    const wrapper = await mountReadyPreview()
    await freezePreview(wrapper)
    const layer = wrapper.get('.web-annotation-layer')
    const canvas = layer.get('canvas')
    setRect(layer.element, 320, 200)
    setRect(canvas.element, 320, 200)
    await canvas.trigger('pointerdown', { button: 0, pointerId: 1, clientX: 20, clientY: 20 })
    await canvas.trigger('pointerup', { pointerId: 1, clientX: 80, clientY: 80 })
    expect(sessionStorage.getItem(ANNOTATION_STORAGE_KEY)).not.toBeNull()

    const iframe = wrapper.get('iframe').element as HTMLIFrameElement
    const nextUrl = 'http://localhost:4173/next'
    window.dispatchEvent(
      new MessageEvent('message', {
        data: { type: 'proxy-navigate', url: nextUrl },
        origin: 'https://spoofed.example',
        source: iframe.contentWindow,
      })
    )
    await flushPromises()
    expect(wrapper.get<HTMLInputElement>('.web-preview-address input').element.value).not.toBe(
      nextUrl
    )

    window.dispatchEvent(
      new MessageEvent('message', {
        data: { type: 'proxy-navigate', url: nextUrl },
        origin: new URL(iframe.getAttribute('src')!, location.href).origin,
        source: iframe.contentWindow,
      })
    )
    await flushPromises()

    const exposed = wrapper.findComponent(WebAnnotationLayer).vm as unknown as {
      getCommands: () => DrawCommand[]
    }
    expect(wrapper.get<HTMLInputElement>('.web-preview-address input').element.value).toBe(nextUrl)
    expect(wrapper.find('.web-preview-content.frozen').exists()).toBe(false)
    expect(exposed.getCommands()).toEqual([])
    expect(JSON.parse(sessionStorage.getItem(ANNOTATION_STORAGE_KEY)!)).toMatchObject({
      url: nextUrl,
      commands: [],
    })
    wrapper.unmount()
  })

  it('clears the current retained annotation record from the toolbar', async () => {
    const wrapper = await mountReadyPreview()
    await freezePreview(wrapper)
    const layer = wrapper.get('.web-annotation-layer')
    const canvas = layer.get('canvas')
    setRect(layer.element, 320, 200)
    setRect(canvas.element, 320, 200)
    await canvas.trigger('pointerdown', { button: 0, pointerId: 1, clientX: 20, clientY: 20 })
    await canvas.trigger('pointerup', { pointerId: 1, clientX: 80, clientY: 80 })

    await wrapper.get('button[aria-label="Clear annotations"]').trigger('click')
    await wrapper.get('button[aria-label="Return to live preview"]').trigger('click')
    await freezePreview(wrapper)

    const exposed = wrapper.findComponent(WebAnnotationLayer).vm as unknown as {
      getCommands: () => DrawCommand[]
    }
    expect(exposed.getCommands()).toEqual([])
    wrapper.unmount()
  })

  it('replaces retention on URL change and enforces the command and serialized-size caps', () => {
    const store = createAnnotationRetentionStore()
    store.activate('http://localhost:4173/?_t=1')
    const manyCommands = Array.from(
      { length: 105 },
      (_, index): DrawCommand => ({
        tool: 'pen',
        points: [index, 0, index + 1, 1],
        color: '#f00',
      })
    )
    const capped = store.write('http://localhost:4173/?_t=2', basis(), manyCommands)
    expect(capped.commands).toHaveLength(100)
    expect(capped.commands[0].points[0]).toBe(5)

    const largeCommands = Array.from(
      { length: 4 },
      (_, index): DrawCommand => ({
        tool: 'text',
        points: [index, index],
        color: '#f00',
        text: String(index).repeat(30_000),
      })
    )
    const sizeCapped = store.write('http://localhost:4173/', basis(), largeCommands)
    const stored = sessionStorage.getItem(ANNOTATION_STORAGE_KEY)!
    expect(new TextEncoder().encode(stored).byteLength).toBeLessThanOrEqual(MAX_ANNOTATION_BYTES)
    expect(sizeCapped.commands.length).toBeLessThan(largeCommands.length)
    expect(sizeCapped.droppedCommands).toBeGreaterThan(5)

    expect(store.activate('http://localhost:4174/')).toBeUndefined()
    expect(sessionStorage.getItem(ANNOTATION_STORAGE_KEY)).toBeNull()
  })

  it('degrades to in-memory retention when sessionStorage is unavailable', () => {
    const storageSpy = vi.spyOn(window, 'sessionStorage', 'get').mockImplementation(() => {
      throw new DOMException('storage disabled')
    })
    const store = createAnnotationRetentionStore()
    expect(() => store.activate('http://localhost:4173/')).not.toThrow()
    expect(() =>
      store.write('http://localhost:4173/', basis(), [
        { tool: 'pen', points: [1, 2, 3, 4], color: '#f00' },
      ])
    ).not.toThrow()
    expect(store.read('http://localhost:4173/')?.commands).toHaveLength(1)
    storageSpy.mockRestore()
  })

  it('restores retained annotations after the preview pane is remounted', async () => {
    const first = await mountReadyPreview()
    await freezePreview(first)
    const firstLayer = first.get('.web-annotation-layer')
    const firstCanvas = firstLayer.get('canvas')
    setRect(firstLayer.element, 320, 200)
    setRect(firstCanvas.element, 320, 200)
    await firstCanvas.trigger('pointerdown', {
      button: 0,
      pointerId: 1,
      clientX: 25,
      clientY: 30,
    })
    await firstCanvas.trigger('pointerup', {
      pointerId: 1,
      clientX: 100,
      clientY: 120,
    })
    first.unmount()

    const second = await mountReadyPreview()
    await freezePreview(second)
    const exposed = second.findComponent(WebAnnotationLayer).vm as unknown as {
      getCommands: () => DrawCommand[]
    }
    expect(exposed.getCommands()).toHaveLength(1)
    expect(exposed.getCommands()[0].points).toEqual([25, 30, 25, 30, 100, 120])
    second.unmount()
  })

  it('falls through clipboard tiers from execCommand to download', async () => {
    vi.stubGlobal('ClipboardItem', undefined)
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined })
    Object.defineProperty(HTMLImageElement.prototype, 'complete', {
      configurable: true,
      get: () => true,
    })
    Object.defineProperty(HTMLImageElement.prototype, 'naturalWidth', {
      configurable: true,
      get: () => 1,
    })
    const execCommand = vi.fn().mockReturnValueOnce(true).mockReturnValueOnce(false)
    Object.defineProperty(document, 'execCommand', { configurable: true, value: execCommand })
    const blob = new Blob(['png'], { type: 'image/png' })

    await expect(copyPngWithFallback(blob, (key) => key)).resolves.toBe('execCommand')
    await expect(copyPngWithFallback(blob, (key) => key)).resolves.toBe('download')
    expect(execCommand).toHaveBeenCalledTimes(2)
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledOnce()
    expect(createdUrls).toEqual(revokedUrls)
  })

  it('maps capture timeout distinctly and recovers live mode', async () => {
    mocks.requestCapture.mockRejectedValue(new CaptureRequestError('timeout'))
    const wrapper = await mountReadyPreview()
    await wrapper.get('button[aria-label="Freeze preview"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('button[aria-label="Freeze preview"]').exists()).toBe(true)
    expect(mocks.toastError).toHaveBeenCalledWith('Preview capture timed out')
    wrapper.unmount()
  })

  it.each([
    ['bridge-absent', 'The preview capture bridge is unavailable'],
    ['snapdom-load-failed', 'The preview capture renderer could not load'],
    ['raster-failed', 'The preview page could not be rendered as an image'],
    ['canvas-tainted', 'Cross-origin page content blocked image capture'],
    ['document-too-large', 'The preview page is too large to capture'],
    ['capture-in-progress', 'A page capture is already in progress'],
    ['busy', 'The preview is already being captured'],
    ['timeout', 'Preview capture timed out'],
  ] as const)('maps %s to its distinct localized capture error', async (code, message) => {
    mocks.requestCapture.mockRejectedValue(new CaptureRequestError(code))
    const wrapper = await mountReadyPreview()
    await freezePreview(wrapper)
    expect(mocks.toastError).toHaveBeenCalledWith(message)
    expect(wrapper.find('.web-preview-content.frozen').exists()).toBe(false)
    wrapper.unmount()
  })

  it('calculates capture scale from the full tall-document raster extent', () => {
    const pixelCap = 8_294_400
    const scale = calculateCaptureScale(1200, 12_000, 2, pixelCap)

    expect(scale).toBeCloseTo(Math.sqrt(pixelCap / (1200 * 12_000 * 2 * 2)), 12)
    expect(1200 * 12_000 * (2 * scale) ** 2).toBeCloseTo(pixelCap, 5)
  })

  it('maps page CSS coordinates and visual thickness into capture bitmap pixels', () => {
    const canvas = makeCanvas(400, 200)
    const context = contextFor(canvas)
    renderDrawCommands(
      context,
      [{ tool: 'rect', points: [20, 10, 100, 50], color: '#f00', width: 3 }],
      basis(200, 100, 0.5),
      400,
      200
    )

    expect(context.strokeRect).toHaveBeenLastCalledWith(40, 20, 160, 80)
    expect(context.lineWidth).toBe(6)
  })

  it('downloads when decode rejects even if the clipboard image has natural width', async () => {
    vi.stubGlobal('ClipboardItem', undefined)
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined })
    Object.defineProperty(HTMLImageElement.prototype, 'decode', {
      configurable: true,
      value: vi.fn().mockRejectedValue(new Error('decode failed')),
    })
    Object.defineProperty(HTMLImageElement.prototype, 'complete', {
      configurable: true,
      get: () => true,
    })
    Object.defineProperty(HTMLImageElement.prototype, 'naturalWidth', {
      configurable: true,
      get: () => 1,
    })
    const execCommand = vi.fn().mockReturnValue(true)
    Object.defineProperty(document, 'execCommand', { configurable: true, value: execCommand })

    await expect(
      copyPngWithFallback(new Blob(['png'], { type: 'image/png' }), (key) => key)
    ).resolves.toBe('download')
    expect(execCommand).not.toHaveBeenCalled()
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledOnce()
    expect(createdUrls).toEqual(revokedUrls)
  })

  it('commits the pointer-up endpoint for a quick drag and discards pointer cancellation', async () => {
    const layer = mount(WebAnnotationLayer, {
      props: {
        visible: true,
        enabled: true,
        pageWidth: 100,
        pageHeight: 100,
        basis: basis(100, 100),
      },
    })
    const host = layer.get('.web-annotation-layer')
    const canvas = layer.get('canvas')
    setRect(host.element, 100, 100)
    setRect(canvas.element, 100, 100)

    await canvas.trigger('pointerdown', {
      button: 0,
      pointerId: 1,
      clientX: 10,
      clientY: 10,
    })
    await canvas.trigger('pointerup', { pointerId: 1, clientX: 80, clientY: 70 })
    const exposed = layer.vm as unknown as { getCommands: () => DrawCommand[] }
    expect(exposed.getCommands()).toHaveLength(1)
    expect(exposed.getCommands()[0].points.slice(-2)).toEqual([80, 70])

    await canvas.trigger('pointerdown', {
      button: 0,
      pointerId: 2,
      clientX: 20,
      clientY: 20,
    })
    await canvas.trigger('pointercancel', { pointerId: 2, clientX: 90, clientY: 90 })
    expect(exposed.getCommands()).toHaveLength(1)
    layer.unmount()
  })

  it('does not commit or prevent Enter while text input is composing', async () => {
    const { layer, input, exposed } = await mountTextAnnotationLayer()
    await input.setValue('注音')
    await input.trigger('compositionstart')

    const composingEnter = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
    })
    input.element.dispatchEvent(composingEnter)

    expect(composingEnter.defaultPrevented).toBe(false)
    expect(exposed.getCommands()).toHaveLength(0)
    expect(layer.find('.annotation-text-input').exists()).toBe(true)

    input.element.dispatchEvent(new Event('compositionend', { bubbles: true }))
    await flushPromises()
    const legacyImeEnter = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
    })
    Object.defineProperty(legacyImeEnter, 'keyCode', { value: 229 })
    input.element.dispatchEvent(legacyImeEnter)

    expect(legacyImeEnter.defaultPrevented).toBe(false)
    expect(exposed.getCommands()).toHaveLength(0)
    expect(layer.find('.annotation-text-input').exists()).toBe(true)
    layer.unmount()
  })

  it('commits Enter after compositionend has cleared on the next tick', async () => {
    const { layer, input, exposed } = await mountTextAnnotationLayer()
    await input.setValue('完成')
    await input.trigger('compositionstart')
    input.element.dispatchEvent(new Event('compositionend', { bubbles: true }))
    await flushPromises()

    const enter = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
    })
    input.element.dispatchEvent(enter)
    await flushPromises()

    expect(enter.defaultPrevented).toBe(true)
    expect(exposed.getCommands()).toHaveLength(1)
    expect(exposed.getCommands()[0].text).toBe('完成')
    expect(layer.find('.annotation-text-input').exists()).toBe(false)
    layer.unmount()
  })

  it('does not commit text when the input blurs while composing', async () => {
    const { layer, input, exposed } = await mountTextAnnotationLayer()
    await input.setValue('編集中')
    await input.trigger('compositionstart')
    await input.trigger('blur')

    expect(exposed.getCommands()).toHaveLength(0)
    expect(layer.find('.annotation-text-input').exists()).toBe(true)
    layer.unmount()
  })

  it('lets IME handle Escape while composing and cancels text when not composing', async () => {
    const { layer, input, exposed } = await mountTextAnnotationLayer()
    await input.setValue('候補')
    await input.trigger('compositionstart')
    const composingEscape = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
    })
    input.element.dispatchEvent(composingEscape)

    expect(composingEscape.defaultPrevented).toBe(false)
    expect(layer.find('.annotation-text-input').exists()).toBe(true)

    input.element.dispatchEvent(new Event('compositionend', { bubbles: true }))
    await flushPromises()
    const escape = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
    })
    input.element.dispatchEvent(escape)
    await flushPromises()

    expect(escape.defaultPrevented).toBe(true)
    expect(exposed.getCommands()).toHaveLength(0)
    expect(layer.find('.annotation-text-input').exists()).toBe(false)
    layer.unmount()
  })

  it('still commits plain text with Enter outside IME composition', async () => {
    const { layer, input, exposed } = await mountTextAnnotationLayer()
    await input.setValue('plain text')
    const enter = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
    })
    input.element.dispatchEvent(enter)
    await flushPromises()

    expect(enter.defaultPrevented).toBe(true)
    expect(exposed.getCommands()).toHaveLength(1)
    expect(exposed.getCommands()[0].text).toBe('plain text')
    expect(layer.find('.annotation-text-input').exists()).toBe(false)
    layer.unmount()
  })

  it('keeps the frozen state and annotations when composite export fails', async () => {
    const wrapper = await mountReadyPreview()
    await freezePreview(wrapper)
    const layer = wrapper.get('.web-annotation-layer')
    const canvas = layer.get('canvas')
    setRect(layer.element, 320, 200)
    setRect(canvas.element, 320, 200)
    await canvas.trigger('pointerdown', { button: 0, pointerId: 1, clientX: 20, clientY: 20 })
    await canvas.trigger('pointerup', { pointerId: 1, clientX: 120, clientY: 80 })
    Object.defineProperty(HTMLCanvasElement.prototype, 'toBlob', {
      configurable: true,
      value: vi.fn(() => {
        throw new Error('encoding failed')
      }),
    })

    await wrapper.get('button[aria-label="Download annotated PNG"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('button[aria-label="Return to live preview"]').exists()).toBe(true)
    expect(
      wrapper.get('button[aria-label="Undo annotation"]').attributes('disabled')
    ).toBeUndefined()
    const exposed = wrapper.findComponent(WebAnnotationLayer).vm as unknown as {
      getCommands: () => DrawCommand[]
    }
    expect(exposed.getCommands()).toHaveLength(1)
    expect(mocks.toastError).toHaveBeenCalledWith('Could not export the annotated preview')
    wrapper.unmount()
  })

  it('round-trips page coordinates across a changed capture basis and reports the mismatch', async () => {
    const originalBasis = basis(200, 100, 1)
    const wrapper = mount(WebAnnotationLayer, {
      props: {
        visible: true,
        enabled: true,
        pageWidth: 200,
        pageHeight: 100,
        basis: originalBasis,
      },
    })
    const layer = wrapper.get('.web-annotation-layer')
    const canvas = wrapper.get('canvas')
    setRect(layer.element, 200, 100)
    setRect(canvas.element, 200, 100)
    ;(wrapper.vm as unknown as { setTool: (tool: string) => void }).setTool('rect')
    await canvas.trigger('pointerdown', { button: 0, pointerId: 1, clientX: 20, clientY: 10 })
    await canvas.trigger('pointermove', { pointerId: 1, clientX: 100, clientY: 50 })
    await canvas.trigger('pointerup', { pointerId: 1, clientX: 100, clientY: 50 })

    const context = contextFor(canvas.element as HTMLCanvasElement)
    const first = context.strokeRect.mock.calls[context.strokeRect.mock.calls.length - 1]
    const exposed = wrapper.vm as unknown as {
      getCommands: () => DrawCommand[]
      setCommands: (commands: DrawCommand[], basis: CaptureBasis) => boolean
    }
    const stored = exposed.getCommands()
    await wrapper.setProps({ pageHeight: 200, basis: basis(200, 200, 0.5) })
    setRect(layer.element, 200, 200)
    setRect(canvas.element, 200, 200)
    expect(exposed.setCommands(stored, originalBasis)).toBe(true)
    const second = context.strokeRect.mock.calls[context.strokeRect.mock.calls.length - 1]

    expect(first).toEqual([20, 10, 80, 40])
    expect(second).toEqual([20, 10, 80, 40])
    expect(exposed.getCommands()[0].points).toEqual([20, 10, 100, 50])
    wrapper.unmount()
  })

  it('recovers from capture failure, revokes URLs, and caps undo history at 100', async () => {
    mocks.requestCapture.mockRejectedValue(new CaptureRequestError('raster-failed'))
    const preview = await mountReadyPreview()
    await freezePreview(preview)
    expect(preview.find('.web-preview-content.frozen').exists()).toBe(false)
    expect(preview.find('button[aria-label="Freeze preview"]').exists()).toBe(true)
    expect(mocks.toastError).toHaveBeenCalledWith(
      'The preview page could not be rendered as an image'
    )

    downloadPng(new Blob(['png'], { type: 'image/png' }), 'preview.png')
    expect(createdUrls).toEqual(revokedUrls)
    preview.unmount()

    const layer = mount(WebAnnotationLayer, {
      props: {
        visible: true,
        enabled: true,
        pageWidth: 100,
        pageHeight: 100,
        basis: basis(100, 100),
      },
    })
    const host = layer.get('.web-annotation-layer')
    const canvas = layer.get('canvas')
    setRect(host.element, 100, 100)
    setRect(canvas.element, 100, 100)
    for (let index = 0; index < 105; index++) {
      await canvas.trigger('pointerdown', {
        button: 0,
        pointerId: index + 1,
        clientX: 10,
        clientY: 10,
      })
      await canvas.trigger('pointerup', {
        pointerId: index + 1,
        clientX: 20,
        clientY: 20,
      })
    }
    const exposed = layer.vm as unknown as { getCommands: () => DrawCommand[] }
    expect(exposed.getCommands()).toHaveLength(100)
    layer.unmount()
  })
})
