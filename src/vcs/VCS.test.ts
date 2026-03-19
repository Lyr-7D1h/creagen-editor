import { describe, test, expect } from 'vitest'
import { VCS } from './VCS'
import { JsonValue, Storage, VCSImport } from './Storage'
import { Bookmark } from './Bookmarks'
import { BlobHash, Commit, CommitHash } from './Commit'

/** Simple in-memory Storage implementation for testing */
class MemoryStorage implements Storage<undefined> {
  private readonly bookmarks = new Map<string, JsonValue>()
  private readonly commits = new Map<string, JsonValue>()
  private readonly blobs = new Map<string, Uint8Array>()
  private readonly deltas = new Map<string, Uint8Array>()

  getBookmark(id: string): Promise<JsonValue | null> {
    return Promise.resolve(this.bookmarks.get(id) ?? null)
  }

  getCommit(id: CommitHash): Promise<JsonValue | null> {
    return Promise.resolve(this.commits.get(id.toHex()) ?? null)
  }

  getBlob(id: BlobHash): Promise<Uint8Array | null> {
    return Promise.resolve(this.blobs.get(id.toHex()) ?? null)
  }

  getDelta(id: BlobHash): Promise<Uint8Array | null> {
    return Promise.resolve(this.deltas.get(id.toHex()) ?? null)
  }

  setBookmark(bookmark: Bookmark): Promise<void> {
    this.bookmarks.set(bookmark.name, bookmark.toJson())
    return Promise.resolve()
  }

  setCommit(commit: Commit<undefined>): Promise<void> {
    this.commits.set(commit.hash.toHex(), commit.toJson())
    return Promise.resolve()
  }

  setBlob(id: BlobHash, value: Uint8Array): Promise<void> {
    this.blobs.set(id.toHex(), value)
    return Promise.resolve()
  }

  setDelta(id: BlobHash, value: Uint8Array): Promise<void> {
    this.deltas.set(id.toHex(), value)
    return Promise.resolve()
  }

  removeBookmark(id: string): Promise<void> {
    this.bookmarks.delete(id)
    return Promise.resolve()
  }

  getAllBookmarks(): Promise<JsonValue[]> {
    return Promise.resolve([...this.bookmarks.values()])
  }

  getAllCommits(): Promise<JsonValue[]> {
    return Promise.resolve([...this.commits.values()])
  }

  getAllBlobs(): Promise<JsonValue[]> {
    return Promise.resolve([...this.blobs.values()] as unknown as JsonValue[])
  }

  getAllDeltas(): Promise<JsonValue[]> {
    return Promise.resolve([...this.deltas.values()] as unknown as JsonValue[])
  }

  export(): Promise<VCSImport> {
    const toBase64 = (bytes: Uint8Array): string => {
      let binary = ''
      for (const byte of bytes) binary += String.fromCharCode(byte)
      return btoa(binary)
    }
    return Promise.resolve({
      version: 1,
      bookmarks: [...this.bookmarks.entries()].map(([key, value]) => ({
        key,
        value,
      })),
      commits: [...this.commits.entries()].map(([key, value]) => ({
        key,
        value,
      })),
      blobs: [...this.blobs.entries()].map(([key, value]) => ({
        key,
        value: toBase64(value),
      })),
      delta: [...this.deltas.entries()].map(([key, value]) => ({
        key,
        value: toBase64(value),
      })),
    })
  }

  import(data: VCSImport): Promise<void> {
    const fromBase64 = (s: string): Uint8Array => {
      const binary = atob(s)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
      return bytes
    }
    for (const { key, value } of data.bookmarks) this.bookmarks.set(key, value)
    for (const { key, value } of data.commits) this.commits.set(key, value)
    for (const { key, value } of data.blobs)
      this.blobs.set(key, fromBase64(value as string))
    for (const { key, value } of data.delta)
      this.deltas.set(key, fromBase64(value as string))
    return Promise.resolve()
  }
}

const parseMetadata = (_raw: unknown): undefined => undefined

describe('VCS import / export', () => {
  test('export returns a properly structured VCSImport after a commit', async () => {
    const storage = new MemoryStorage()
    const vcsResult = await VCS.create(storage, parseMetadata)
    if (!vcsResult.ok) throw vcsResult.error
    const vcs = vcsResult.value

    const commitResult = await vcs.commit('const x = 1', undefined)
    if (!commitResult.ok) throw commitResult.error
    const commit = commitResult.value
    if (commit === null) throw new Error('No commit made')
    await vcs.addBookmark(new Bookmark('main', commit.hash, new Date()))

    const exportResult = await vcs.export()
    if (!exportResult.ok) throw exportResult.error
    const data = exportResult.value

    expect(data.version).toBe(1)
    expect(data.commits).toHaveLength(1)
    expect(data.bookmarks).toHaveLength(1)
    expect(data.blobs.length + data.delta.length).toBeGreaterThanOrEqual(1)
  })

  test('export includes all commits when multiple commits are made', async () => {
    const storage = new MemoryStorage()
    const vcsResult = await VCS.create(storage, parseMetadata)
    if (!vcsResult.ok) throw vcsResult.error
    const vcs = vcsResult.value

    await vcs.commit('const a = 1', undefined)
    await vcs.commit('const b = 2', undefined)
    await vcs.commit('const c = 3', undefined)

    const exportResult = await vcs.export()
    if (!exportResult.ok) throw exportResult.error

    expect(exportResult.value.commits).toHaveLength(3)
  })

  test('round-trip: code committed in VCS1 is retrievable from VCS2 after import', async () => {
    const code = 'const answer = 42'

    // Commit in VCS1 and export
    const storage1 = new MemoryStorage()
    const vcs1Result = await VCS.create(storage1, parseMetadata)
    if (!vcs1Result.ok) throw vcs1Result.error
    const commitResult = await vcs1Result.value.commit(code, undefined)
    if (!commitResult.ok) throw commitResult.error
    const commit = commitResult.value
    if (commit === null) throw new Error('No commit made')

    await vcs1Result.value.addBookmark(
      new Bookmark('asdf', commit.hash, new Date()),
    )

    const exportResult = await vcs1Result.value.export()
    if (!exportResult.ok) throw exportResult.error

    // Import into a fresh storage and create VCS2 from it
    const storage2 = new MemoryStorage()
    const vcs2TmpResult = await VCS.create(storage2, parseMetadata)
    if (!vcs2TmpResult.ok) throw vcs2TmpResult.error
    const importResult = await vcs2TmpResult.value.import(exportResult.value)
    if (!importResult.ok) throw importResult.error

    // Re-create VCS from storage2 so it picks up the imported bookmarks
    const vcs2Result = await VCS.create(storage2, parseMetadata)
    if (!vcs2Result.ok) throw vcs2Result.error
    const vcs2 = vcs2Result.value

    const bookmarks = vcs2.bookmarks.getBookmarks()
    expect(bookmarks).toHaveLength(1)

    const checkoutResult = await vcs2.checkout(bookmarks[0]!.commit)
    if (!checkoutResult.ok) throw checkoutResult.error
    expect(checkoutResult.value.data).toBe(code)
  })

  test('import rejects malformed data', async () => {
    const storage = new MemoryStorage()
    const vcsResult = await VCS.create(storage, parseMetadata)
    if (!vcsResult.ok) throw vcsResult.error

    const importResult = await vcsResult.value.import({ not: 'valid' })
    expect(importResult.ok).toBe(false)
  })

  test('import rejects data with missing required fields', async () => {
    const storage = new MemoryStorage()
    const vcsResult = await VCS.create(storage, parseMetadata)
    if (!vcsResult.ok) throw vcsResult.error

    const importResult = await vcsResult.value.import({
      version: 1,
      bookmarks: [],
      commits: [],
      // missing blobs and delta
    })
    expect(importResult.ok).toBe(false)
  })
})
