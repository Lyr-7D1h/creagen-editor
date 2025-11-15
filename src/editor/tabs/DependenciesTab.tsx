import {
  ToggleButtonGroup,
  ToggleButton,
  Select,
  MenuItem,
} from '@mui/material'
import React, { useState, useEffect, useMemo } from 'react'
import { SemVer } from 'semver'
import { useCreagenEditor } from '../../creagen-editor/CreagenContext'
import { useLibraries } from '../../events/useEditorEvents'
import { Importer } from '../../importer'
import { logger } from '../../logs/logger'

const supportedLibraries = [
  { name: 'creagen' },
  { name: 'p5' },
  { name: 'three', disabled: true },
]

function isDevBuild(version: SemVer) {
  return version.prerelease.length > 0
}

export function DependenciesTab() {
  const editor = useCreagenEditor()
  const libraries = useLibraries()
  const [versions, setVersions] = useState<Record<string, string[]>>({})
  const [selectedVersion, setSelectedVersion] = useState<
    Record<string, string>
  >({})

  useEffect(() => {
    Promise.allSettled(supportedLibraries.map((l) => Importer.versions(l.name)))
      .then((vers) => {
        const versions: Record<string, string[]> = {}
        const latestVersions: Record<string, string> = {}
        for (let i = 0; i < vers.length; i++) {
          if (typeof supportedLibraries[i] === 'undefined')
            throw Error('library not found')
          const name = supportedLibraries[i]!.name

          const ver = vers[i]!
          if (ver.status === 'rejected') {
            logger.error(ver.reason)
            continue
          }
          versions[name] = ver.value
          const latestIndex = versions[name]
            .map((v) => new SemVer(v))
            .findIndex((v) => !isDevBuild(v))

          latestVersions[name] = versions[name][latestIndex]!

          if (name === 'creagen' && CREAGEN_DEV_VERSION) {
            const devVersion = CREAGEN_DEV_VERSION.toString()
            versions[name].unshift(devVersion)
            latestVersions[name] = devVersion
          }
        }

        setVersions(versions)
        setSelectedVersion((selectedVersions) => ({
          ...latestVersions,
          ...selectedVersions,
        }))
      })
      .catch(logger.error)
  }, [])

  // Merge library versions into selectedVersion
  const mergedSelectedVersion = useMemo(() => {
    const merged = { ...selectedVersion }
    for (const lib of libraries.values()) {
      merged[lib.name] = lib.version.toString()
    }
    return merged
  }, [selectedVersion, libraries])

  const libraryNames = Array.from(libraries.values(), (l) => l.name)
  return (
    <ToggleButtonGroup orientation="vertical" fullWidth={true}>
      {supportedLibraries.map((lib) => (
        <ToggleButton
          key={lib.name}
          value={lib.name}
          aria-label="list"
          size="small"
          disabled={
            typeof versions[lib.name] === 'undefined' ||
            versions[lib.name]?.length === 0 ||
            (lib.disabled ?? false)
          }
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            width: '100%',
          }}
          selected={libraryNames.includes(lib.name)}
          onChange={(_, libName: string) => {
            if (libraries.has(libName)) {
              editor.removeLibrary(libName)
              editor.commit().catch(logger.error)
            } else {
              editor
                .addLibrary({
                  name: libName,
                  version: new SemVer(mergedSelectedVersion[libName]!),
                })
                .then(() => editor.commit())
                .catch(logger.error)
            }
          }}
        >
          <span>{lib.name}</span>
          {versions[lib.name] === undefined ? null : (
            <Select
              value={mergedSelectedVersion[lib.name] ?? versions[lib.name]![0]}
              size="small"
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => {
                if (libraries.has(lib.name)) {
                  // change version of active library
                  const version = new SemVer(e.target.value)
                  editor
                    .addLibrary({
                      name: lib.name,
                      version,
                    })
                    .catch(logger.error)
                }

                setSelectedVersion({
                  ...selectedVersion,
                  [lib.name]: e.target.value,
                })
              }}
            >
              {versions[lib.name]!.map((v, i) => (
                <MenuItem key={i} value={v.toString()}>
                  {v.toString()}
                </MenuItem>
              ))}
            </Select>
          )}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  )
}
