import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import AppButton from '../../components/AppButton.vue'

const nuxtLinkStub = {
  props: ['to'],
  template: '<a :href="to"><slot /></a>',
}

function mountButton(options: Record<string, unknown> = {}) {
  return mount(AppButton, {
    global: { stubs: { NuxtLink: nuxtLinkStub } },
    ...options,
  })
}

describe('AppButton', () => {
  it('renders slot text', () => {
    const wrapper = mountButton({ slots: { default: 'Continue' } })
    expect(wrapper.text()).toContain('Continue')
  })

  it('renders a button element by default', () => {
    const wrapper = mountButton({ slots: { default: 'Save' } })
    expect(wrapper.find('button').exists()).toBe(true)
    expect(wrapper.find('a').exists()).toBe(false)
  })

  it('renders an anchor via NuxtLink when `to` is set', () => {
    const wrapper = mountButton({
      props: { to: '/lesson/1' },
      slots: { default: 'Start lesson' },
    })
    const link = wrapper.find('a')
    expect(link.exists()).toBe(true)
    expect(link.attributes('href')).toBe('/lesson/1')
    expect(wrapper.find('button').exists()).toBe(false)
  })

  it('applies the disabled attribute to the button', () => {
    const wrapper = mountButton({
      props: { disabled: true },
      slots: { default: 'Save' },
    })
    expect(wrapper.find('button').attributes('disabled')).toBeDefined()
  })

  it('sets aria-busy when loading', () => {
    const wrapper = mountButton({
      props: { loading: true },
      slots: { default: 'Connecting' },
    })
    expect(wrapper.find('button').attributes('aria-busy')).toBe('true')
  })

  it('does not set aria-busy when not loading', () => {
    const wrapper = mountButton({ slots: { default: 'Save' } })
    expect(wrapper.find('button').attributes('aria-busy')).toBeUndefined()
  })

  it('emits click when the button is clicked', async () => {
    const wrapper = mountButton({ slots: { default: 'Save' } })
    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('click')).toHaveLength(1)
  })

  it('suppresses click while loading', async () => {
    const wrapper = mountButton({
      props: { loading: true },
      slots: { default: 'Connecting' },
    })
    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('click')).toBeUndefined()
  })

  it('marks a disabled link as inert and suppresses click', async () => {
    const wrapper = mountButton({
      props: { to: '/lesson/1', disabled: true },
      slots: { default: 'Start lesson' },
    })
    const link = wrapper.find('a')
    expect(link.attributes('aria-disabled')).toBe('true')
    expect(link.attributes('tabindex')).toBe('-1')
    await link.trigger('click')
    expect(wrapper.emitted('click')).toBeUndefined()
  })

  it('sets aria-busy on a loading link and suppresses click', async () => {
    const wrapper = mountButton({
      props: { to: '/lesson/1', loading: true },
      slots: { default: 'Start lesson' },
    })
    const link = wrapper.find('a')
    expect(link.attributes('aria-busy')).toBe('true')
    await link.trigger('click')
    expect(wrapper.emitted('click')).toBeUndefined()
  })
})
