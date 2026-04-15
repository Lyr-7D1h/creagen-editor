import { beforeEach, describe, expect, test } from 'vitest'
import { UrlMutator } from './UrlMutator'
import { SemVer } from 'semver'
import type { Sha256Hash } from 'versie'
import { decompressFromEncodedURIComponent } from 'lz-string'

describe('UrlMutator query params', () => {
  test('iterates through current search params', () => {
    const url = new URL('http://localhost/?hide_all=true&show_qr=false')
    const entries: Array<[string, string]> = []

    new UrlMutator(url).forEachQueryParam((value, key) => {
      entries.push([key, value])
    })

    expect(entries).toEqual([
      ['hide_all', 'true'],
      ['show_qr', 'false'],
    ])
  })
})

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

describe('UrlMutator shareable link', () => {
  test('roundtrips shareable link data from pathname payload', () => {
    const source = {
      code: 'draw("hello:world;c:marker")\nconst v = [1, 2, 3];\n',
      bookmarkName: 'sunset trail',
      editorVersion: new SemVer('1.2.3'),
      libraries: [
        { name: 'math', version: new SemVer('1.0.0') },
        { name: 'noise', version: new SemVer('2.3.4') },
      ],
      createdOn: new Date('2024-01-03T10:20:30.000Z'),
      author: 'lyr',
    }

    const shareable = UrlMutator.createShareableLink(source)
    window.history.replaceState(null, '', shareable.toString())

    const parsed = new UrlMutator().getSharableLinkData()

    if (parsed instanceof Error) {
      expect.fail(parsed.message)
    }
    if (parsed === null) {
      expect.fail('Should contain data')
    }

    expect(parsed.code).toBe(source.code)
    expect(parsed.bookmarkName).toBe(source.bookmarkName)
    expect(parsed.editorVersion.version).toBe(source.editorVersion.version)
    expect(parsed.libraries).toEqual(source.libraries)
    expect(parsed.createdOn.toISOString()).toBe(source.createdOn.toISOString())
    expect(parsed.author).toBe(source.author)
  })

  test('returns error when current path is not a shareable payload', () => {
    window.history.replaceState(null, '', '/not-shareable')

    const parsed = new UrlMutator().getSharableLinkData()
    expect(parsed).toBeNull()
  })

  test('returns error when payload is invalid', () => {
    window.history.replaceState(null, '', '/~not-a-valid-payload')

    const parsed = new UrlMutator().getSharableLinkData()
    expect(parsed).toBeInstanceOf(Error)
    if (!(parsed instanceof Error)) {
      throw new Error('Expected parsing error')
    }
    expect(parsed.message.length).toBeGreaterThan(0)
  })

  test('stores raw code with length-prefixed metadata tail', () => {
    const source = {
      code: 'draw("hello")\nconst path = "a:b;c";\n',
      bookmarkName: 'sunset trail',
      editorVersion: new SemVer('1.2.3'),
      libraries: [{ name: 'math', version: new SemVer('1.0.0') }],
      createdOn: new Date('2024-01-03T10:20:30.000Z'),
      author: undefined,
    }

    const shareable = UrlMutator.createShareableLink(source)
    const pathname = shareable.toURL().pathname.slice(2)
    const decompressed = decompressFromEncodedURIComponent(pathname)

    if (typeof decompressed !== 'string') {
      expect.fail('Expected decompressed payload')
    }

    const prefix = `${source.code.length}:`
    expect(decompressed.startsWith(prefix + source.code)).toBe(true)
    expect(decompressed.includes('\\n')).toBe(false)

    const metadataRaw = decompressed.slice(prefix.length + source.code.length)
    expect(JSON.parse(metadataRaw)).toEqual([
      source.bookmarkName,
      source.editorVersion.toString(),
      source.libraries
        .map((l) => `${l.name}@${l.version.toString()}`)
        .join(','),
      source.createdOn.getTime(),
    ])
  })
})

describe('UrlMutator commit path', () => {
  test('returns commit from commit-only path', async () => {
    const url = new URL(
      'http://localhost/0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    )

    const commit = await new UrlMutator(url).getCommit()

    expect((commit as Sha256Hash).toHex()).toBe(
      '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    )
  })

  test('returns null when path is empty', async () => {
    const url = new URL('http://localhost/')

    const commit = await new UrlMutator(url).getCommit()

    expect(commit).toBeNull()
  })

  test('returns null for shareable payload path', async () => {
    const url = new URL('http://localhost/~compressed-data')

    const commit = await new UrlMutator(url).getCommit()

    expect(commit).toBeNull()
  })
})
