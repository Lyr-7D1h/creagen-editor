import {
  compressToEncodedURIComponent,
  decompressFromEncodedURIComponent,
} from 'lz-string'
import { SemVer } from 'semver'
import type { CommitHash } from 'versie'
import { commitHashSchema } from 'versie'
import { z } from 'zod'
import type { Library } from './creagen-editor/CommitMetadata'

export interface SharableLinkData {
  code: string
  bookmarkName: string
  editorVersion: SemVer
  /** libraries used for generating code */
  libraries: Library[]
  createdOn: Date
  /** Author undefined means its a local commit */
  author?: string
}

const sharePayloadMetadataSchema = z.union([
  z.tuple([z.string(), z.string(), z.string(), z.number()]),
  z.tuple([z.string(), z.string(), z.string(), z.number(), z.string()]),
])

function parseSharePayload(payload: string): SharableLinkData | Error {
  const separatorIndex = payload.indexOf(':')
  if (separatorIndex <= 0) {
    return new Error('Shareable link payload has invalid format')
  }

  const codeLengthRaw = payload.slice(0, separatorIndex)
  if (!/^\d+$/.test(codeLengthRaw)) {
    return new Error('Shareable link payload has invalid format')
  }

  const codeLength = Number(codeLengthRaw)
  if (!Number.isSafeInteger(codeLength) || codeLength < 0) {
    return new Error('Shareable link payload has invalid format')
  }

  const codeStartIndex = separatorIndex + 1
  const codeEndIndex = codeStartIndex + codeLength
  if (codeEndIndex > payload.length) {
    return new Error('Shareable link payload has invalid format')
  }

  const code = payload.slice(codeStartIndex, codeEndIndex)
  if (code.length === 0) {
    return new Error('Shareable link is missing code')
  }

  const metadataRaw = payload.slice(codeEndIndex)
  if (metadataRaw.length === 0) {
    return new Error('Shareable link payload has invalid format')
  }

  let parsedMetadata: unknown
  try {
    parsedMetadata = JSON.parse(metadataRaw) as unknown
  } catch {
    return new Error('Shareable link payload has invalid json format')
  }

  const metadata = sharePayloadMetadataSchema.safeParse(parsedMetadata)
  if (!metadata.success) {
    return new Error(
      `Shareable link payload has invalid format: ${metadata.error.message}`,
    )
  }

  const [bookmarkName, editorVersionRaw, librariesRaw, createdOnRaw, author] =
    metadata.data

  const createdOn = new Date(createdOnRaw)
  if (Number.isNaN(createdOn.getTime())) {
    return new Error('Shareable link has invalid created date')
  }

  const libraries: Library[] = []
  for (const item of librariesRaw
    .split(',')
    .filter((entry) => entry.length > 0)) {
    const separatorIndex = item.lastIndexOf('@')
    if (separatorIndex <= 0 || separatorIndex === item.length - 1) {
      return new Error(`Invalid library entry '${item}'`)
    }
    const name = item.slice(0, separatorIndex)
    const versionRaw = item.slice(separatorIndex + 1)
    let version: SemVer
    try {
      version = new SemVer(versionRaw)
    } catch {
      return new Error(`Invalid library entry '${item}'`)
    }
    libraries.push({
      name,
      version,
    })
  }

  let editorVersion: SemVer
  try {
    editorVersion = new SemVer(editorVersionRaw)
  } catch {
    return new Error('Shareable link has invalid editor version')
  }

  return {
    code,
    bookmarkName,
    editorVersion,
    libraries,
    createdOn,
    author,
  }
}

export type UrlVersion =
  | {
      type: 'bookmark'
      username?: string
      bookmark: string
    }
  | {
      type: 'commit'
      commit: CommitHash
    }

/** A standardized way to mutate the url for the creagen editor */
export class UrlMutator {
  constructor(
    private readonly url: URL = new URL(window.location.href),
    /** Base path must start with a `/` */
    private readonly basePath = '/',
  ) {}

  setPath(path: string) {
    if (path.startsWith('/')) path = path.slice(1)
    const base = this.basePath.replace(/\/+$/, '')
    this.url.pathname = path.length > 0 ? `${base}/${path}` : base || '/'
    return this
  }

  /** Return path without trailing `/` or `basePath` */
  getPath() {
    const { pathname } = this.url
    const base = this.basePath.replace(/\/+$/, '')
    if (base.length === 0) return pathname.slice(1)
    if (pathname === base) return ''
    if (pathname.startsWith(`${base}/`)) return pathname.slice(base.length + 1)
    return pathname
  }

  /** returns null if no data link, error if parsing failed otherwise just data */
  getSharableLinkData(): SharableLinkData | null | Error {
    const rawPath = this.getPath()

    if (!rawPath.startsWith('~')) {
      return null
    }

    const compressedPayload = rawPath.slice(1)
    const decompressed = decompressFromEncodedURIComponent(
      compressedPayload,
    ) as unknown
    if (typeof decompressed !== 'string') {
      return new Error('Failed to decompress shareable link data')
    }

    return parseSharePayload(decompressed)
  }

  createShareableLink({
    code,
    bookmarkName,
    editorVersion,
    libraries,
    createdOn,
    author,
  }: SharableLinkData) {
    const metadata: unknown[] = [
      bookmarkName,
      editorVersion.toString(),
      libraries.map((l) => l.name + '@' + l.version.toString()).join(','),
      createdOn.getTime(),
    ]
    if (typeof author !== 'undefined') {
      metadata.push(author)
    }

    const formatted = `${code.length}:${code}${JSON.stringify(metadata)}`
    const url = new UrlMutator(undefined, this.basePath)
    const compressed = compressToEncodedURIComponent(formatted)
    url.setPath(`~${compressed}`)
    return url
  }

  /** Set bookmark in url @username/bookmark */
  setBookmark(bookmark: string, username?: string) {
    this.setPath(username ? `${username}/${bookmark}` : bookmark)
    return this
  }

  setCommit(commit?: CommitHash) {
    this.setPath(commit ? commit.toHex() : '')
    return this
  }

  getVersion(): UrlVersion | null {
    const path = this.getPath()

    if (path.length === 0 || path.startsWith('~')) {
      return null
    }

    const [x1, x2] = decodeURIComponent(path).split('/')

    if (typeof x1 === 'undefined' || x1.length === 0) return null

    const commit = commitHashSchema.safeParse(x1)
    if (commit.success)
      return {
        type: 'commit',
        commit: commit.data,
      }

    if (typeof x2 === 'string' && x2.length > 0) {
      return {
        type: 'bookmark',
        username: x1,
        bookmark: x2,
      }
    } else {
      return {
        type: 'bookmark',
        bookmark: x1,
      }
    }
  }

  getSetting(key: string): unknown {
    const raw = this.url.searchParams.get(key)
    if (raw == null) return null
    try {
      return JSON.parse(raw)
    } catch {
      return raw
    }
  }

  setSetting(key: string, value: unknown) {
    this.url.searchParams.set(key, JSON.stringify(value))
    return this
  }

  removeSetting(key: string) {
    this.url.searchParams.delete(key)
    return this
  }

  forEachQueryParam(callback: (value: string, key: string) => void) {
    this.url.searchParams.forEach((value, key) => {
      callback(value, key)
    })
  }

  static params(): Map<string, unknown> {
    return UrlMutator.paramsFromHash(window.location.hash)
  }

  setParams(store?: Map<string, unknown>) {
    if (typeof store === 'undefined') {
      this.url.hash = ''
      return this
    }
    const hash = Array.from(store.entries())
      .map(
        ([key, value]) =>
          `${encodeURIComponent(String(key))}:${encodeURIComponent(UrlMutator.serializeValue(value))}`,
      )
      .join('/')

    this.url.hash = hash.length > 0 ? `/${hash}` : ''
    return this
  }

  private static paramsFromHash(hash: string): Map<string, unknown> {
    const parsed: Map<string, unknown> = new Map()
    const content = hash.startsWith('#') ? hash.slice(1) : hash
    const normalized = content.startsWith('/') ? content.slice(1) : content
    if (normalized.length === 0) return parsed

    for (const segment of normalized.split('/')) {
      if (segment.length === 0) continue
      const separatorIndex = segment.indexOf(':')
      if (separatorIndex <= 0) continue

      const key = decodeURIComponent(segment.slice(0, separatorIndex))
      const rawValue = decodeURIComponent(segment.slice(separatorIndex + 1))
      parsed.set(key, UrlMutator.deserializeValue(rawValue))
    }

    return parsed
  }

  private static serializeValue(value: unknown): string {
    if (Array.isArray(value)) {
      return value.map((item) => String(item)).join(',')
    }
    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      return String(value)
    }
    return JSON.stringify(value)
  }

  private static deserializeValue(value: string): unknown {
    if (value.includes(',')) {
      return value.split(',').map((item) => UrlMutator.parseScalar(item))
    }

    if (
      value.startsWith('{') ||
      value.startsWith('[') ||
      value.startsWith('"')
    ) {
      try {
        return JSON.parse(value)
      } catch {
        return value
      }
    }

    return UrlMutator.parseScalar(value)
  }

  private static parseScalar(value: string): unknown {
    if (value === 'true') return true
    if (value === 'false') return false

    if (/^-?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/.test(value)) {
      const n = Number(value)
      if (!Number.isNaN(n)) return n
    }

    return value
  }

  toURL() {
    return this.url
  }

  toString() {
    return this.url.toString()
  }

  setWindowTitle(title: string) {
    if (document.title === title) return this
    document.title = title
    return this
  }

  replaceState(state: unknown = null, title = '') {
    if (title.length > 0) {
      this.setWindowTitle(title)
    }
    window.history.replaceState(state, title, this.url)
  }

  pushState(state: unknown = null, title = '') {
    if (title.length > 0) {
      this.setWindowTitle(title)
    }

    // don't update if no changes to url
    if (new URL(window.location.href).toString() === this.url.toString()) {
      return
    }

    window.history.pushState(state, title, this.url)
  }
}
