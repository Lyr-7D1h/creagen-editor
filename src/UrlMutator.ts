export class UrlMutator {
  private readonly url: URL

  constructor(url?: URL) {
    this.url = url ?? new URL(window.location.href)
  }

  setPath(path: string) {
    this.url.pathname = path.startsWith('/') ? path : `/${path}`
    return this
  }

  setCommit(commit: string) {
    this.url.pathname = `/${commit}`
    return this
  }

  setData(data: string) {
    const path = this.url.pathname.replace(/^\//, '')
    const commit = path.split(':')[0]
    if (commit == null || commit.length === 0) return this
    this.url.pathname = `/${commit}:${data}`
    return this
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

  static params(): Map<string, unknown> {
    return UrlMutator.paramsFromHash(window.location.hash)
  }

  setParams(store: Map<string, unknown>) {
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

  replaceState(state: unknown = null, title = '') {
    window.history.replaceState(state, title, this.url)
  }

  pushState(state: unknown = null, title = '') {
    window.history.pushState(state, title, this.url)
  }
}
