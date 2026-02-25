import { beforeEach, describe, expect, test } from 'vitest'
import { UrlMutator } from './UrlMutator'

describe('UrlMutator params serialization', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/')
  })

  test('serializes params into hash path structure', () => {
    const store = new Map<string, unknown>([
      ['play', false],
      ['seed', 'river-stone-echo'],
      ['rotation', 135],
      ['thickness', 4.5],
      ['variant', 3],
      ['range', [2, 8]],
    ])

    const url = new UrlMutator().setParams(store).toURL()

    expect(decodeURIComponent(url.hash)).toBe(
      '#/play:false/seed:river-stone-echo/rotation:135/thickness:4.5/variant:3/range:2,8',
    )
  })

  test('deserializes params from hash path structure', () => {
    window.history.replaceState(
      null,
      '',
      '/#/play:false/seed:river-stone-echo/rotation:135/thickness:4.5/variant:3/range:2,8',
    )

    const params = UrlMutator.params()

    expect(Array.from(params.entries())).toEqual([
      ['play', false],
      ['seed', 'river-stone-echo'],
      ['rotation', 135],
      ['thickness', 4.5],
      ['variant', 3],
      ['range', [2, 8]],
    ])
  })

  test('roundtrips params with encoded special characters', () => {
    const store = new Map<string, unknown>([
      ['path/value:key', 'hello/world:again'],
      ['unicode', '你好🌊'],
      ['spaces', 'value with spaces'],
      ['neg', -42.75],
      ['window', [-3.5, 9.25]],
    ])

    const hash = new UrlMutator().setParams(store).toURL().hash
    expect(hash).toContain('%2F')
    expect(hash).toContain('%3A')

    window.history.replaceState(null, '', `/${hash}`)
    const parsed = UrlMutator.params()

    expect(Array.from(parsed.entries())).toEqual([
      ['path/value:key', 'hello/world:again'],
      ['unicode', '你好🌊'],
      ['spaces', 'value with spaces'],
      ['neg', -42.75],
      ['window', [-3.5, 9.25]],
    ])
  })

  test('ignores malformed hash segments while parsing valid ones', () => {
    window.history.replaceState(
      null,
      '',
      '/#/valid:1/invalidsegment/:nokey/another:two',
    )

    const parsed = UrlMutator.params()

    expect(Array.from(parsed.entries())).toEqual([
      ['valid', 1],
      ['another', 'two'],
    ])
  })

  test('setParams with empty map clears hash', () => {
    const url = new URL('http://localhost/#/old:1')
    const serialized = new UrlMutator(url).setParams(new Map()).toURL()

    expect(serialized.hash).toBe('')
  })

  test('deserializes scalar edge values consistently', () => {
    window.history.replaceState(
      null,
      '',
      '/#/bool:true/negzero:-0/padded:001/scientific:1e3/scientificNeg:-2.5e-4/raw:NaN',
    )

    const parsed = UrlMutator.params()

    expect(Array.from(parsed.entries())).toEqual([
      ['bool', true],
      ['negzero', -0],
      ['padded', 1],
      ['scientific', 1000],
      ['scientificNeg', -0.00025],
      ['raw', 'NaN'],
    ])
  })
})
