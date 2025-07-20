import {
  ToggleButtonGroup,
  ToggleButton,
  Select,
  MenuItem,
} from '@mui/material'
import React, { useState, useEffect } from 'react'
import { SemVer } from 'semver'
import { useCreagenEditor } from '../../creagen-editor/CreagenEditorView'
import { CREAGEN_DEV_VERSION } from '../../env'
import { useSettings } from '../../events/useEditorEvents'
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
  const settings = useCreagenEditor().settings
  const libraries = useSettings('general.libraries')
  const [versions, setVersions] = useState<Record<string, string[]>>({})
  const [selectedVersion, setSelectedVersion] = useState<
    Record<string, string>
  >({})

  useEffect(() => {
    Promise.all(supportedLibraries.map((l) => Importer.versions(l.name)))
      .then((vers) => {
        const versions: Record<string, string[]> = {}
        const latestVersions: Record<string, string> = {}
        for (let i = 0; i < vers.length; i++) {
          if (typeof supportedLibraries[i] === 'undefined')
            throw Error('library not found')
          const name = supportedLibraries[i]!.name

          versions[name] = vers[i]!
          const latestIndex = vers[i]!.map((v) => new SemVer(v)).findIndex(
            (v) => !isDevBuild(v),
          )

          latestVersions[name] = vers[i]![latestIndex]!

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

  // update selected version when libraries change
  useEffect(() => {
    setSelectedVersion((versions) => {
      const newVersions = { ...versions }
      for (const lib of libraries) {
        newVersions[lib.name] = lib.version.toString()
      }
      return newVersions
    })
  }, [libraries])

  return (
    <ToggleButtonGroup orientation="vertical" fullWidth={true}>
      {supportedLibraries.map((lib) => (
        <ToggleButton
          key={lib.name}
          value={lib.name}
          aria-label="list"
          size="small"
          disabled={lib?.disabled ?? false}
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            width: '100%',
          }}
          selected={libraries.map((l) => l.name).includes(lib.name)}
          onChange={(_, libraryName) => {
            const enabled =
              typeof libraries.find((l) => l.name === libraryName) !==
              'undefined'

            if (enabled) {
              settings.set(
                'general.libraries',
                libraries.filter((l) => l.name !== libraryName),
              )
              return
            }

            settings.set('general.libraries', [
              ...libraries.filter((l) => l.name !== libraryName),
              { name: libraryName, version: selectedVersion[libraryName]! },
            ])
          }}
        >
          <span>{lib.name}</span>
          {versions[lib.name] === undefined ? null : (
            <Select
              value={selectedVersion[lib.name] ?? versions[lib.name]![0]}
              size="small"
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => {
                const enabled =
                  typeof libraries.find((l) => l.name === lib.name) !==
                  'undefined'

                if (enabled) {
                  settings.set(
                    'general.libraries',
                    libraries.map((l) => {
                      if (l.name !== lib.name) return l
                      return { ...l, version: e.target.value }
                    }),
                  )
                  return
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
