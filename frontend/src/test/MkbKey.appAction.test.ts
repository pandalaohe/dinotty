import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import MkbKey from '../components/keyboard/MkbKey.vue'

vi.mock('../composables/useSettings', () => ({
  settings: { keyboard_sound: false },
}))

describe('MkbKey app-action options', () => {
  it.each([true, false])('emits the key autoEnter=%s value with the action id', async (autoEnter) => {
    const wrapper = mount(MkbKey, {
      props: {
        k: { l: 'Paste', act: 'pasteTerminal', autoEnter },
        state: { shift: false, ctrl: false, alt: false },
      },
    })

    await wrapper.trigger('mousedown')

    expect(wrapper.emitted('app-action')).toEqual([
      ['pasteTerminal', { autoEnter }],
    ])
    wrapper.unmount()
  })
})
