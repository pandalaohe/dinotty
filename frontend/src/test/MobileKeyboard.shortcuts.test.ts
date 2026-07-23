import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../composables/useUpload', () => ({
  formatMB: () => '0.0',
  useUpload: () => ({ uploadFiles: vi.fn(), uploadErrorStatus: vi.fn() }),
}))
vi.mock('../composables/useTransport', () => ({ isTauri: () => false }))
vi.mock('vue-toastification', () => ({
  POSITION: { BOTTOM_CENTER: 'bottom-center' },
  useToast: () => ({ error: vi.fn(), success: vi.fn() }),
}))
vi.mock('../composables/useHistory', async () => {
  const { ref } = await vi.importActual<typeof import('vue')>('vue')
  return {
    useHistory: () => ({
      suggestions: ref([]),
      fetchSuggestions: vi.fn(),
      fetchDebounced: vi.fn(),
    }),
  }
})

import MobileKeyboard from '../components/keyboard/MobileKeyboard.vue'
import { settings } from '../composables/useSettings'

function mountKeyboard(props: Record<string, unknown> = {}) {
  return mount(MobileKeyboard, {
    props: { visible: true, paneId: 'p1', getSendFn: () => null, ...props },
    global: {
      stubs: { SuggestionBar: true, MkbRow: true, HistoryPanel: true, FilePickerModal: true },
    },
  })
}

beforeEach(() => {
  settings.locale = 'en'
  Object.defineProperty(window, 'isSecureContext', { value: true, configurable: true })
  Object.defineProperty(navigator, 'clipboard', {
    value: { readText: vi.fn(async () => 'phone text') },
    configurable: true,
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('MobileKeyboard terminal shortcut strip', () => {
  it('renders only while the action textarea is not focused', async () => {
    const wrapper = mountKeyboard()
    const strip = wrapper.find('.mkb-terminal-shortcuts')
    expect(strip.attributes('style')).toBeUndefined()
    await wrapper.find('textarea').trigger('focus')
    await nextTick()
    expect(strip.attributes('style')).toContain('display: none')
    wrapper.unmount()
  })

  it('dispatches pasteTerminal and the live searchTerminal action', async () => {
    const wrapper = mountKeyboard()
    await wrapper.get('[data-testid="terminal-paste-key"]').trigger('pointerdown')
    await wrapper.get('[data-testid="terminal-find-key"]').trigger('pointerdown')
    expect(wrapper.emitted('app-action')).toEqual([['pasteTerminal'], ['searchTerminal']])
    wrapper.unmount()
  })

  it('shows armed confirmation styling and accessible text', () => {
    const wrapper = mountKeyboard({ pasteArmed: true, pasteConfirmLines: 3 })
    const paste = wrapper.get('[data-testid="terminal-paste-key"]')
    expect(paste.classes()).toContain('is-armed')
    expect(paste.attributes('title')).toBe('Clipboard has 3 lines — tap again to paste')
    expect(paste.attributes('aria-label')).toBe(paste.attributes('title'))
    wrapper.unmount()
  })

  it('keeps the phone-paste toolbar inserting into the textarea', async () => {
    const wrapper = mountKeyboard()
    ;(wrapper.find('textarea').element as HTMLTextAreaElement).focus()
    await nextTick()
    const phonePaste = wrapper
      .findAll('.mkb-toolbar .mkb-tool-btn')
      .find((button) => button.attributes('title') === 'Paste from phone')
    expect(phonePaste).toBeDefined()
    await phonePaste!.trigger('mousedown')
    await Promise.resolve()
    await nextTick()
    expect((wrapper.find('textarea').element as HTMLTextAreaElement).value).toBe('phone text')
    expect(wrapper.emitted('app-action')).toBeUndefined()
    wrapper.unmount()
  })
})
