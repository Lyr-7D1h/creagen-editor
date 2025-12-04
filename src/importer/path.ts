/**
 * Normalize a path by resolving . and .. segments
 * @param p
 */
function normalizePath(path: string): string {
  const parts = path.split('/')
  const result: string[] = []

  for (const part of parts) {
    if (part === '' || part === '.') {
      // Skip empty parts and current directory references
      continue
    } else if (part === '..') {
      // Go up one directory
      if (result.length > 0 && result[result.length - 1] !== '..') {
        result.pop()
      } else {
        result.push('..')
      }
    } else {
      result.push(part)
    }
  }

  return result.join('/')
}

export class Path {
  private readonly parts: string[]

  constructor(path: string) {
    // Normalize and split the path
    const normalized = normalizePath(path)
    this.parts = normalized.split('/').filter((p) => p !== '')
  }

  /**
   * Get the filename (last part of the path)
   * @returns The filename or null if path is empty
   */
  filename(): string | null {
    if (this.parts.length === 0) return null
    return this.parts[this.parts.length - 1]!
  }

  /**
   * Get the parent directory path
   * @returns Parent Path instance or null if at root
   */
  parent(): Path | null {
    if (this.parts.length === 0) return null
    if (this.parts.length === 1) return new Path('')
    return new Path(this.parts.slice(0, this.parts.length - 1).join('/'))
  }

  /**
   * Remove the last part of the path (go to parent directory)
   * @returns New Path instance with the last segment removed
   */
  pop(): Path {
    return this.parent() ?? new Path('')
  }

  /**
   * Add a segment to the end of the path
   * @param segment The path segment to add (should not contain '/')
   * @returns New Path instance with the segment added
   */
  push(segment: string): Path {
    if (segment.includes('/')) {
      throw new Error('push() expects a single segment without "/"')
    }
    const newPath =
      this.parts.length === 0 ? segment : this.parts.join('/') + '/' + segment
    return new Path(newPath)
  }

  /**
   * Join this path with another path, resolving relative references
   * @param path Path to join (can be relative like "./file", "../other", or just "..")
   * @returns New Path instance with the joined path
   */
  join(path: string): Path {
    // If path is absolute (starts with /), use it directly
    if (path.startsWith('/')) {
      return new Path(path)
    }

    // Special case: joining just ".." means go to parent
    if (path === '..') {
      const parentPath = this.parent()
      if (parentPath === null) {
        return new Path('')
      }
      return parentPath
    }

    // Join the paths and normalize
    const combined = this.parts.join('/') + '/' + path
    return new Path(combined)
  }

  /**
   * Create a copy of this Path instance
   * @returns New Path instance with the same path
   */
  clone(): Path {
    return new Path(this.toString())
  }

  /**
   * Get the string representation of the path
   */
  toString(): string {
    return this.parts.join('/')
  }

  /**
   * Get the path parts as an array
   */
  getParts(): string[] {
    return [...this.parts]
  }
}
