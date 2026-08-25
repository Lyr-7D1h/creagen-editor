import { decompressFromEncodedURIComponent } from 'lz-string'
import { SemVer } from 'semver'
import { Sha256Hash, commitHashSchema } from 'versie'
import { beforeEach, describe, expect, test } from 'vitest'
import { UrlMutator } from './UrlMutator'

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

    const shareable = new UrlMutator().createShareableLink(source)
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

    const shareable = new UrlMutator().createShareableLink(source)
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
  test('returns commit from commit-only path', () => {
    const url = new URL(
      'http://localhost/0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    )

    const commit = new UrlMutator(url).getVersion()

    if (commit?.type === 'bookmark') throw Error('Invalid commit')

    expect((commit?.commit as unknown as Sha256Hash).toHex()).toBe(
      '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    )
  })

  test('returns null when path is empty', () => {
    const url = new URL('http://localhost/')

    const commit = new UrlMutator(url).getVersion()

    expect(commit).toBeNull()
  })

  test('returns null for shareable payload path', () => {
    const url = new URL('http://localhost/~compressed-data')

    const commit = new UrlMutator(url).getVersion()

    expect(commit).toBeNull()
  })
})

describe('UrlMutator getVersion bookmark path', () => {
  test('returns null when path has only single segment', () => {
    const url = new URL('http://localhost/my-bookmark')

    const version = new UrlMutator(url).getVersion()

    expect(version).toEqual({ type: 'bookmark', bookmark: 'my-bookmark' })
  })

  test('returns bookmark with username when path has two segments', () => {
    const url = new URL('http://localhost/alice/her-bookmark')

    const version = new UrlMutator(url).getVersion()

    expect(version).toEqual({
      type: 'bookmark',
      username: 'alice',
      bookmark: 'her-bookmark',
    })
  })

  test('returns bookmark with username containing hyphens', () => {
    const url = new URL('http://localhost/john-doe/cool-sketch')

    const version = new UrlMutator(url).getVersion()

    expect(version).toEqual({
      type: 'bookmark',
      username: 'john-doe',
      bookmark: 'cool-sketch',
    })
  })

  test('returns bookmark with special characters in name', () => {
    const url = new URL('http://localhost/user123/my_bookmark_v2')

    const version = new UrlMutator(url).getVersion()

    expect(version).toEqual({
      type: 'bookmark',
      username: 'user123',
      bookmark: 'my_bookmark_v2',
    })
  })

  test('returns null with trailing slash on single segment', () => {
    const url = new URL('http://localhost/my-bookmark/')

    const version = new UrlMutator(url).getVersion()

    expect(version).toEqual({ type: 'bookmark', bookmark: 'my-bookmark' })
  })

  test('ignores trailing slash with two segments', () => {
    const url = new URL('http://localhost/alice/her-bookmark/')

    const version = new UrlMutator(url).getVersion()

    expect(version).toEqual({
      type: 'bookmark',
      username: 'alice',
      bookmark: 'her-bookmark',
    })
  })

  test('returns null when first segment is empty', () => {
    const url = new URL('http://localhost//')

    const version = new UrlMutator(url).getVersion()

    expect(version).toBeNull()
  })

  test('returns null when second segment is empty', () => {
    const url = new URL('http://localhost/alice/')

    const version = new UrlMutator(url).getVersion()

    expect(version).toEqual({ type: 'bookmark', bookmark: 'alice' })
  })

  test('ignores segments beyond the first two', () => {
    const url = new URL('http://localhost/alice/bookmark/extra')

    const version = new UrlMutator(url).getVersion()

    expect(version).toEqual({
      type: 'bookmark',
      username: 'alice',
      bookmark: 'bookmark',
    })
  })

  test('returns bookmark even if username looks like hex', () => {
    const url = new URL('http://localhost/abcdef123456/bookmark')

    const version = new UrlMutator(url).getVersion()

    expect(version).toEqual({
      type: 'bookmark',
      username: 'abcdef123456',
      bookmark: 'bookmark',
    })
  })
})

describe('UrlMutator getVersion edge cases', () => {
  test('returns commit for single segment valid commit hash', () => {
    const url = new URL(
      'http://localhost/0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    )

    const version = new UrlMutator(url).getVersion()

    expect(version).toEqual({
      type: 'commit',
      commit: Sha256Hash.fromHex(
        '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
      ),
    })
  })

  test('returns commit when valid 64-char hex with username segment', () => {
    const url = new URL(
      'http://localhost/0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef/ignored',
    )

    const version = new UrlMutator(url).getVersion()

    expect(version?.type).toBe('commit')
  })

  test('returns null when path is only slash', () => {
    const url = new URL('http://localhost/')

    const version = new UrlMutator(url).getVersion()

    expect(version).toBeNull()
  })

  test('returns null for single segment bookmark', () => {
    const url = new URL('http://localhost/my-bookmark')

    const version = new UrlMutator(url).getVersion()

    expect(version).toEqual({ type: 'bookmark', bookmark: 'my-bookmark' })
  })

  test('returns null for path with shareable link prefix', () => {
    const url = new URL('http://localhost/~abc123')

    const version = new UrlMutator(url).getVersion()

    expect(version).toBeNull()
  })

  test('preserves case in bookmark names with username', () => {
    const url = new URL('http://localhost/John/MyBookmark')

    const version = new UrlMutator(url).getVersion()

    expect(version).toEqual({
      type: 'bookmark',
      username: 'John',
      bookmark: 'MyBookmark',
    })
  })

  test('handles URL-encoded segments in pathname', () => {
    const url = new URL('http://localhost/alice/my%20bookmark')

    const version = new UrlMutator(url).getVersion()

    expect(version).toEqual({
      type: 'bookmark',
      username: 'alice',
      bookmark: 'my bookmark',
    })
  })

  test('returns null when second segment is empty', () => {
    const url = new URL('http://localhost/alice//')

    const version = new UrlMutator(url).getVersion()

    expect(version).toEqual({ type: 'bookmark', bookmark: 'alice' })
  })

  test('treats non-commit first segment as username', () => {
    const url = new URL('http://localhost/user-name/sketch-name')

    const version = new UrlMutator(url).getVersion()

    expect(version).toEqual({
      type: 'bookmark',
      username: 'user-name',
      bookmark: 'sketch-name',
    })
  })

  test('handles numbers and underscores in bookmark path', () => {
    const url = new URL('http://localhost/user123/my_sketch_v2')

    const version = new UrlMutator(url).getVersion()

    expect(version).toEqual({
      type: 'bookmark',
      username: 'user123',
      bookmark: 'my_sketch_v2',
    })
  })
})

describe('UrlMutator with a base path', () => {
  const BASE = '/editor'
  const HEX = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'

  test('setBookmark writes path under the base path', () => {
    const url = new UrlMutator(new URL('http://localhost/'), BASE)
      .setBookmark('my-bookmark', 'alice')
      .toURL()

    expect(url.pathname).toBe('/editor/alice/my-bookmark')
  })

  test('setBookmark without username writes under the base path', () => {
    const url = new UrlMutator(new URL('http://localhost/'), BASE)
      .setBookmark('my-bookmark')
      .toURL()

    expect(url.pathname).toBe('/editor/my-bookmark')
  })

  test('setCommit writes commit under the base path', () => {
    const url = new UrlMutator(new URL('http://localhost/'), BASE)
      .setCommit(commitHashSchema.parse(HEX))
      .toURL()

    expect(url.pathname).toBe(`/editor/${HEX}`)
  })

  test('setCommit with no commit resets to the base path', () => {
    const url = new UrlMutator(new URL(`http://localhost/editor/${HEX}`), BASE)
      .setCommit()
      .toURL()

    expect(url.pathname).toBe('/editor')
  })

  test('setPath ignores a leading slash', () => {
    const url = new UrlMutator(new URL('http://localhost/'), BASE)
      .setPath('/foo')
      .toURL()

    expect(url.pathname).toBe('/editor/foo')
  })

  test('basePath with trailing slash is normalized', () => {
    const url = new UrlMutator(new URL('http://localhost/'), '/editor/')
      .setBookmark('my-bookmark')
      .toURL()

    expect(url.pathname).toBe('/editor/my-bookmark')
  })

  test('getPath strips the base path', () => {
    const mutator = new UrlMutator(
      new URL('http://localhost/editor/alice/my-bookmark'),
      BASE,
    )

    expect(mutator.getPath()).toBe('alice/my-bookmark')
  })

  test.each(['http://localhost/editor', 'http://localhost/editor/'])(
    'getPath returns empty string for the bare base path %s',
    (href) => {
      const mutator = new UrlMutator(new URL(href), BASE)

      expect(mutator.getPath()).toBe('')
    },
  )

  test('getPath does not strip an unrelated path that merely shares the prefix', () => {
    const mutator = new UrlMutator(
      new URL('http://localhost/editorial/foo'),
      BASE,
    )

    expect(mutator.getPath()).toBe('/editorial/foo')
  })

  test('getVersion parses bookmark under the base path', () => {
    const url = new URL('http://localhost/editor/alice/her-bookmark')

    expect(new UrlMutator(url, BASE).getVersion()).toEqual({
      type: 'bookmark',
      username: 'alice',
      bookmark: 'her-bookmark',
    })
  })

  test('getVersion parses commit under the base path', () => {
    const url = new URL(`http://localhost/editor/${HEX}`)

    expect(new UrlMutator(url, BASE).getVersion()).toEqual({
      type: 'commit',
      commit: Sha256Hash.fromHex(HEX),
    })
  })

  test('getVersion returns null for the bare base path', () => {
    const url = new URL('http://localhost/editor/')

    expect(new UrlMutator(url, BASE).getVersion()).toBeNull()
  })

  test('getVersion returns null for shareable payload under the base path', () => {
    const url = new URL('http://localhost/editor/~compressed-data')

    expect(new UrlMutator(url, BASE).getVersion()).toBeNull()
  })

  test('roundtrips shareable link under the base path', () => {
    const source = {
      code: 'draw("hello")\n',
      bookmarkName: 'base path trail',
      editorVersion: new SemVer('1.2.3'),
      libraries: [{ name: 'math', version: new SemVer('1.0.0') }],
      createdOn: new Date('2024-01-03T10:20:30.000Z'),
      author: 'lyr',
    }

    const shareable = new UrlMutator(undefined, BASE).createShareableLink(
      source,
    )
    expect(shareable.toURL().pathname).toMatch(/^\/editor\/~.+/)

    window.history.replaceState(null, '', shareable.toString())
    const parsed = new UrlMutator(undefined, BASE).getSharableLinkData()

    if (parsed instanceof Error) {
      expect.fail(parsed.message)
    }
    if (parsed === null) {
      expect.fail('Should contain data')
    }
    expect(parsed.code).toBe(source.code)
    expect(parsed.bookmarkName).toBe(source.bookmarkName)
    expect(parsed.author).toBe('lyr')
  })

  test('query params are readable under the base path', () => {
    const url = new URL('http://localhost/editor/?hide_all=true&show_qr=false')
    const entries: Array<[string, string]> = []

    new UrlMutator(url, BASE).forEachQueryParam((value, key) => {
      entries.push([key, value])
    })

    expect(entries).toEqual([
      ['hide_all', 'true'],
      ['show_qr', 'false'],
    ])
  })

  test('setParams preserves the base path and writes into the hash', () => {
    const store = new Map<string, unknown>([
      ['play', false],
      ['rotation', 135],
    ])

    const url = new UrlMutator(
      new URL('http://localhost/editor/alice/bm'),
      BASE,
    )
      .setParams(store)
      .toURL()

    expect(url.pathname).toBe('/editor/alice/bm')
    expect(decodeURIComponent(url.hash)).toBe('#/play:false/rotation:135')
  })
})
