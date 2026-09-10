import { beforeEach, describe, expect, it, vi } from 'vitest'
import { h } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'

// The switcher's own behavior is covered in ServerSwitcher.test.ts; here it is
// stubbed so the assertions are about WorkspaceOverview's wiring (the `s`
// binding, the gating, and the disconnected panel) and not about the popover.
// The real component is a single element with `keydown.stop`, which is exactly
// the shape the gating assertions need to exercise.
vi.mock('motion-v', () => {
  // `inheritAttrs: false` would drop `.mc-backdrop` / `.mc-ws-dual` onto the
  // stub as attrs instead of rendered attributes, and the class is how these
  // tests address the overlay. Render a plain element carrying both attrs and
  // listeners so `trigger('keydown')` reaches the component's own handler.
  const container = (name: string) => ({
    name,
    inheritAttrs: true,
    setup(_props: any, { slots, attrs }: any) {
      return () => h('div', { ...attrs, class: [name, attrs.class] }, slots.default?.())
    },
  })
  return {
    Motion: container('Motion'),
    AnimatePresence: {
      name: 'AnimatePresence',
      // Declared so the child's own `<AnimatePresence mode="wait">` does not
      // warn about a non-prop attribute on a fragment root.
      props: ['mode'],
      setup(_props: any, { slots }: any) {
        return () => slots.default?.()
      },
    },
  }
})

const hoisted = vi.hoisted(() => ({
  sendMcOp: vi.fn(),
  openPop: vi.fn(),
  closePop: vi.fn(),
}))

vi.mock('../composables/useMissionControlState', () => ({
  useMissionControlState: () => ({
    open: true,
    selectedWorkspaceId: null,
    selectedTabId: null,
    selectedTabTitle: null,
  }),
  sendMcOp: hoisted.sendMcOp,
}))

vi.mock('../components/overview/ServerSwitcher.vue', () => ({
  default: {
    name: 'ServerSwitcher',
    data: () => ({ open: false }),
    methods: {
      // Mirrors the real component's exposure. `openPop` flips the flag so the
      // gating branch is what decides the outcome, not the stub.
      openPop(this: any) {
        hoisted.openPop()
        this.open = true
      },
      close(this: any) {
        hoisted.closePop()
        this.open = false
      },
    },
    template: '<div class="srv-stub" @keydown.stop="() => {}" />',
  },
}))

import WorkspaceOverview from '../components/overview/WorkspaceOverview.vue'
import { useUiStore } from '../stores/uiStore'

function mountOverview(connected = true) {
  // The store defaults to disconnected, which swaps the grid for the offline
  // panel. Most cases here are about the connected overlay.
  useUiStore().syncConnected = connected
  return mount(WorkspaceOverview, {
    props: {
      visible: true,
      activePaneId: null,
      termRefs: {},
      indicators: {},
    } as any,
    attachTo: document.body,
  })
}

async function pressKey(wrapper: any, key: string, init: Record<string, unknown> = {}) {
  // The close button is inside the overlay (so the document listener's
  // containment check passes) but outside the switcher stub, whose real
  // counterpart stops propagation before the container sees the event.
  await wrapper.find('.mc-close-btn').trigger('keydown', { key, ...init })
}

beforeEach(() => {
  vi.clearAllMocks()
  setActivePinia(createPinia())
})

describe('WorkspaceOverview server switcher wiring', () => {
  it('mounts the switcher ahead of the workspace list', () => {
    const wrapper = mountOverview()
    const dual = wrapper.find('.mc-ws-dual')
    const order = Array.from(dual.element.children).map((el) => el.className)
    // The bar must be the workspace column's *previous* sibling: the desktop
    // top offset and the mobile unpadding are both keyed off
    // `.mc-srv-bar + .mc-ws-list`, which only matches in that exact position.
    // (`mc-ws-list` is focused dynamically, so it carries an extra raw
    // attribute here - match by class, not by exact className.)
    const idx = (cls: string) => order.findIndex((c) => c.split(' ').includes(cls))
    expect(idx('mc-ws-list')).toBeGreaterThan(0)
    expect(idx('srv-stub')).toBe(idx('mc-ws-list') - 1)
  })

  it('opens the popover on `s` when it is closed', async () => {
    const wrapper = mountOverview()
    await pressKey(wrapper, 's')

    expect(hoisted.openPop).toHaveBeenCalledTimes(1)
    expect(hoisted.sendMcOp).not.toHaveBeenCalled()
  })

  it('ignores `s` with a modifier so the browser keeps its own shortcut', async () => {
    const wrapper = mountOverview()
    await pressKey(wrapper, 's', { metaKey: true })

    expect(hoisted.openPop).not.toHaveBeenCalled()
  })

  it('gates `s` while the popover is open instead of toggling it again', async () => {
    const wrapper = mountOverview()
    await pressKey(wrapper, 's')
    expect(hoisted.openPop).toHaveBeenCalledTimes(1)

    // The container handler runs on the way up past the popover.
    await pressKey(wrapper, 's')

    expect(hoisted.openPop).toHaveBeenCalledTimes(1)
    expect(hoisted.closePop).toHaveBeenCalledTimes(1)
  })

  it('does not turn Escape into the MC Cancel op while the popover is open', async () => {
    const wrapper = mountOverview()
    await pressKey(wrapper, 's')

    await pressKey(wrapper, 'Escape')

    // Cancel is a server-side op; sending it would close MC for every client.
    expect(hoisted.sendMcOp).not.toHaveBeenCalled()
    expect(hoisted.closePop).toHaveBeenCalledTimes(1)
  })

  it('still sends Cancel on Escape when the popover is closed', async () => {
    const wrapper = mountOverview()
    await pressKey(wrapper, 'Escape')

    expect(hoisted.sendMcOp).toHaveBeenCalledWith({ kind: 'cancel' })
  })

  it('replaces the tab grid with the disconnected panel and a switch entry', async () => {
    const wrapper = mountOverview(false)
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.mc-offline').exists()).toBe(true)
    expect(wrapper.find('.mc-offline-btn').exists()).toBe(true)
    // The workspace grid is meaningless without the socket that drives its
    // selection, so it goes too - the switcher is the way out.
    expect(wrapper.find('.mc-ws-list').exists()).toBe(false)
    expect(wrapper.find('.mc-grid').exists()).toBe(false)
  })

  it('offers the switcher from the disconnected panel', async () => {
    const wrapper = mountOverview(false)
    await wrapper.vm.$nextTick()

    await wrapper.find('.mc-offline-btn').trigger('click')

    expect(hoisted.openPop).toHaveBeenCalledTimes(1)
  })

  it('restores the grid once the sync socket is back', async () => {
    const wrapper = mountOverview(false)
    const ui = useUiStore()
    expect(wrapper.find('.mc-offline').exists()).toBe(true)

    ui.syncConnected = true
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.mc-offline').exists()).toBe(false)
    expect(wrapper.find('.mc-ws-list').exists()).toBe(true)
  })
})
