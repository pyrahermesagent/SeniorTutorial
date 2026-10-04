import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import AppCard from '../../components/AppCard.vue'
import AppIcon from '../../components/AppIcon.vue'
import AppNotice from '../../components/AppNotice.vue'

describe('AppCard', () => {
  it('renders slot content', () => {
    const wrapper = mount(AppCard, { slots: { default: '<p>Card body</p>' } })
    expect(wrapper.find('p').text()).toBe('Card body')
  })

  it('is padded by default and can opt out', () => {
    const padded = mount(AppCard, { slots: { default: 'x' } })
    const bare = mount(AppCard, { props: { padded: false }, slots: { default: 'x' } })
    expect(padded.classes()).toContain('app-card--padded')
    expect(bare.classes()).not.toContain('app-card--padded')
  })
})

describe('AppIcon', () => {
  it('renders an svg for a known icon name', () => {
    const wrapper = mount(AppIcon, { props: { name: 'wallet' } })
    expect(wrapper.find('svg').exists()).toBe(true)
  })

  it('applies the requested size', () => {
    const wrapper = mount(AppIcon, { props: { name: 'check', size: 32 } })
    expect(wrapper.find('svg').attributes('width')).toBe('32')
    expect(wrapper.find('svg').attributes('height')).toBe('32')
  })

  it('is hidden from assistive technology', () => {
    const wrapper = mount(AppIcon, { props: { name: 'check' } })
    expect(wrapper.find('svg').attributes('aria-hidden')).toBe('true')
  })

  it('renders nothing for an unknown icon name', () => {
    const wrapper = mount(AppIcon, { props: { name: 'not-a-real-icon' } })
    expect(wrapper.find('svg').exists()).toBe(false)
  })
})

describe('AppNotice', () => {
  it('renders the message from the default slot', () => {
    const wrapper = mount(AppNotice, {
      props: { kind: 'info' },
      slots: { default: 'Your wallet stays on this device.' },
    })
    expect(wrapper.text()).toContain('Your wallet stays on this device.')
  })

  it.each(['info', 'warning', 'success'] as const)('applies the %s kind class', (kind) => {
    const wrapper = mount(AppNotice, { props: { kind }, slots: { default: 'msg' } })
    expect(wrapper.classes()).toContain(`app-notice--${kind}`)
  })

  it('shows an icon matching the kind', () => {
    const wrapper = mount(AppNotice, { props: { kind: 'success' }, slots: { default: 'Done' } })
    expect(wrapper.find('svg').exists()).toBe(true)
  })

  it('uses role alert for warnings and status otherwise', () => {
    const warning = mount(AppNotice, { props: { kind: 'warning' }, slots: { default: 'w' } })
    const info = mount(AppNotice, { props: { kind: 'info' }, slots: { default: 'i' } })
    expect(warning.attributes('role')).toBe('alert')
    expect(info.attributes('role')).toBe('status')
  })
})
