import type { SandboxMessageByType } from '../src/sandbox/SandboxMessageHandler'

export async function syncPreloadedLibraries(
  preloadedLibraries: SandboxMessageByType<'render'>['preloadedLibraries'],
  loadedLibraries: string[],
): Promise<string[]> {
  for (const [name, lib] of preloadedLibraries) {
    if (loadedLibraries.includes(name)) continue
    loadedLibraries.push(name)

    for (const path of lib) {
      switch (path.type) {
        case 'main': {
          const script = document.createElement('script')
          script.dataset['libname'] = name
          script.src = path.path
          await new Promise((resolve, reject) => {
            script.onload = resolve
            script.onerror = reject
            document.head.appendChild(script)
          })
          break
        }
        case 'module': {
          const link = document.createElement('link')
          link.dataset['libname'] = name
          link.rel = 'modulepreload'
          link.href = path.path
          document.head.appendChild(link)
          break
        }
      }
    }
  }

  return loadedLibraries.filter((name) => {
    for (const [libraryName] of preloadedLibraries) {
      if (name === libraryName) {
        return true
      }
    }

    const elements = document.querySelectorAll(`[data-libname="${name}"]`)
    elements.forEach((element) => element.remove())
    return false
  })
}
