import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { settings } from '../composables/useSettings'
import WebAnnotationLayer from '../components/preview/WebAnnotationLayer.vue'
import WebPreview from '../components/preview/WebPreview.vue'
import {
  calculateCaptureScale,
  copyPngWithFallback,
  downloadPng,
  type DrawCommand,
} from '../utils/previewImage'

const mocks = vi.hoisted(() => ({
  snapdomToCanvas: vi.fn(),
  toastError: vi.fn(),
  toastInfo: vi.fn(),
  toastSuccess: vi.fn(),
}))

vi.mock('@zumer/snapdom', () => ({
  snapdom: { toCanvas: mocks.snapdomToCanvas },
}))

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
let urlSequence = 0

function contextFor(canvas: HTMLCanvasElement): ContextMock {
  let context = contexts.get(canvas)
  if (!context) {
    context = {
      save: vi.fn(),
      restore: vi.fn(),
      setTransform: vi.fn(),
      clearRect: vi.fn(),
      drawImage: vi.fn(),
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

function makeCanvas(width = 320, height = 200) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return canvas
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
  await flushPromises()
  return wrapper
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
  ResizeObserverMock.instances = []
  createdUrls.length = 0
  revokedUrls.length = 0
  urlSequence = 0
  vi.stubGlobal('ResizeObserver', ResizeObserverMock)
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
})

describe('EPV1 embedded preview annotation', () => {
  it('freezes, annotates, exports a composite, and clears on unfreeze', async () => {
    const wrapper = await mountReadyPreview()
    await freezePreview(wrapper)
    expect(wrapper.find('button[aria-label="Return to live preview"]').exists()).toBe(true)

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
    expect(wrapper.get('button[aria-label="Undo annotation"]').attributes('disabled')).toBeDefined()
    wrapper.unmount()
  })

  it('discards a capture when navigation changes its generation and recovers live mode', async () => {
    let resolveCapture!: (canvas: HTMLCanvasElement) => void
    const pendingCanvas = makeCanvas()
    mocks.snapdomToCanvas.mockReturnValue(
      new Promise<HTMLCanvasElement>((resolve) => {
        resolveCapture = resolve
      })
    )
    const wrapper = await mountReadyPreview()
    await wrapper.get('button[aria-label="Freeze preview"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('button[aria-label="Capturing preview…"]').exists()).toBe(true)

    await wrapper.setProps({ url: 'http://localhost:4174/' })
    resolveCapture(pendingCanvas)
    await flushPromises()
    expect(wrapper.find('.web-preview-content.frozen').exists()).toBe(false)
    expect(pendingCanvas.width).toBe(0)
    expect(mocks.toastError).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('disables freeze for a cross-origin iframe without throwing', async () => {
    const wrapper = mount(WebPreview, { props: { visible: true, url: 'https://example.com/' } })
    const iframe = wrapper.get('iframe').element as HTMLIFrameElement
    Object.defineProperty(iframe, 'contentDocument', {
      configurable: true,
      get: () => {
        throw new DOMException('cross origin')
      },
    })
    await expect(wrapper.get('iframe').trigger('load')).resolves.toBeUndefined()
    const freezeButton = wrapper.get(
      'button[aria-label="Freeze is unavailable for cross-origin previews"]'
    )
    expect(freezeButton.attributes('disabled')).toBeDefined()
    expect(mocks.toastError).not.toHaveBeenCalled()
    wrapper.unmount()
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

  it('proceeds with capture when document fonts take longer than one second', async () => {
    vi.useFakeTimers()
    const wrapper = await mountReadyPreview()
    const iframe = wrapper.get('iframe').element as HTMLIFrameElement
    Object.defineProperty(iframe.contentDocument!, 'fonts', {
      configurable: true,
      value: { ready: new Promise(() => {}) },
    })

    await wrapper.get('button[aria-label="Freeze preview"]').trigger('click')
    await flushPromises()
    expect(mocks.snapdomToCanvas).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(1000)
    await flushPromises()
    expect(mocks.snapdomToCanvas).toHaveBeenCalledOnce()
    expect(wrapper.find('button[aria-label="Return to live preview"]').exists()).toBe(true)
    expect(mocks.toastError).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('times out capture after fifteen seconds, reports failure, and releases a late canvas', async () => {
    vi.useFakeTimers()
    let resolveCapture!: (canvas: HTMLCanvasElement) => void
    mocks.snapdomToCanvas.mockReturnValue(
      new Promise<HTMLCanvasElement>((resolve) => {
        resolveCapture = resolve
      })
    )
    const wrapper = await mountReadyPreview()
    await wrapper.get('button[aria-label="Freeze preview"]').trigger('click')
    await flushPromises()

    await vi.advanceTimersByTimeAsync(15_000)
    await flushPromises()
    expect(wrapper.find('button[aria-label="Freeze preview"]').exists()).toBe(true)
    expect(mocks.toastError).toHaveBeenCalledWith('Could not freeze this preview')

    const lateCanvas = makeCanvas()
    resolveCapture(lateCanvas)
    await flushPromises()
    expect(lateCanvas.width).toBe(0)
    expect(lateCanvas.height).toBe(0)
    wrapper.unmount()
  })

  it('calculates capture scale from the full tall-document raster extent', () => {
    const pixelCap = 8_294_400
    const scale = calculateCaptureScale(1200, 12_000, 2, pixelCap)

    expect(scale).toBeCloseTo(Math.sqrt(pixelCap / (1200 * 12_000 * 2 * 2)), 12)
    expect(1200 * 12_000 * (2 * scale) ** 2).toBeCloseTo(pixelCap, 5)
  })

  it('downloads instead of using execCommand when clipboard image decoding fails', async () => {
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
      get: () => 0,
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
      props: { visible: true, enabled: true, width: 100, height: 100 },
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
    expect(exposed.getCommands()[0].points.slice(-2)).toEqual([0.8, 0.7])

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
    expect(wrapper.get('button[aria-label="Undo annotation"]').attributes('disabled')).toBeUndefined()
    const exposed = wrapper.findComponent(WebAnnotationLayer).vm as unknown as {
      getCommands: () => DrawCommand[]
    }
    expect(exposed.getCommands()).toHaveLength(1)
    expect(mocks.toastError).toHaveBeenCalledWith('Could not export the annotated preview')
    wrapper.unmount()
  })

  it('re-renders normalized commands at resized CSS and DPR dimensions without distortion', async () => {
    const wrapper = mount(WebAnnotationLayer, {
      props: { visible: true, enabled: true, width: 200, height: 100 },
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
    Object.defineProperty(window, 'devicePixelRatio', { configurable: true, value: 2 })
    setRect(layer.element, 400, 200)
    setRect(canvas.element, 400, 200)
    ResizeObserverMock.instances[ResizeObserverMock.instances.length - 1].trigger()
    const second = context.strokeRect.mock.calls[context.strokeRect.mock.calls.length - 1]

    expect(first).toEqual([20, 10, 80, 40])
    expect(second).toEqual([40, 20, 160, 80])
    expect((canvas.element as HTMLCanvasElement).width).toBe(800)
    expect((canvas.element as HTMLCanvasElement).height).toBe(400)
    wrapper.unmount()
  })

  it('recovers from capture failure, revokes URLs, and caps undo history at 100', async () => {
    mocks.snapdomToCanvas.mockRejectedValue(new Error('capture failed'))
    const preview = await mountReadyPreview()
    await freezePreview(preview)
    expect(preview.find('.web-preview-content.frozen').exists()).toBe(false)
    expect(preview.find('button[aria-label="Freeze preview"]').exists()).toBe(true)
    expect(mocks.toastError).toHaveBeenCalledWith('Could not freeze this preview')

    downloadPng(new Blob(['png'], { type: 'image/png' }), 'preview.png')
    expect(createdUrls).toEqual(revokedUrls)
    preview.unmount()

    const layer = mount(WebAnnotationLayer, {
      props: { visible: true, enabled: true, width: 100, height: 100 },
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
