import React, { useEffect, useState } from 'react'
import { Library, useSettings, Entry } from '../../SettingsProvider'
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Checkbox,
  FormLabel,
  Typography,
  TextField,
  Button,
  ToggleButtonGroup,
  ToggleButton,
  Select,
  MenuItem,
} from '@mui/material'
import { ExpandMore } from '@mui/icons-material'
import { Importer } from '../../importer'
import { CREAGEN_DEV_VERSION } from '../../env'
import { logger } from '../../logger'
import { SemVer } from 'semver'

const expendedSettingKey = 'expandedSetting'

export function Settings() {
  const settings = useSettings()
  const [expanded, setExpandedState] = React.useState<string | false>(
    localStorage.getItem(expendedSettingKey) ?? 'general',
  )

  function setExpanded(expanded: string | false) {
    localStorage.setItem(expendedSettingKey, expanded as string)
    setExpandedState(expanded)
  }

  const folders: Record<string, any[]> = Object.entries(settings.config)
    .filter(([_, entry]) => (entry as Entry).type === 'folder')
    .reduce((a, [key]) => ({ ...a, [key]: [] }), {})

  for (const [key, entry] of Object.entries(settings.config)) {
    switch ((entry as Entry).type) {
      case 'folder':
        continue
      case 'button':
      case 'param': {
        const parts = key.split('.')
        const folder = parts.splice(0, parts.length - 1).join('.')
        folders[folder]!.push([key, entry])
      }
    }
  }

  return (
    <div style={{ zIndex: 1002, position: 'absolute', right: 10, top: 10 }}>
      {Object.entries(folders).map(([folderKey, entries]) => (
        <Accordion
          disableGutters
          sx={{ width: expanded === false ? 100 : 300, margin: 0 }}
          key={folderKey}
          expanded={expanded === folderKey}
          onChange={(_, expanded) => {
            setExpanded(expanded ? folderKey : false)
          }}
          slotProps={{ transition: { timeout: 0 } }}
        >
          <AccordionSummary
            sx={{ minHeight: 30, maxHeight: 30 }}
            expandIcon={<ExpandMore />}
          >
            <Typography component={'span'} fontSize={12}>
              {(settings.config as any)[folderKey].title}
            </Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ p: 1 }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'max-content auto',
                gap: '8px',
                alignItems: 'center',
              }}
            >
              {entries.map(([paramKey, e]) => {
                const entry = e as Entry

                if (entry.type === 'button')
                  return (
                    <React.Fragment key={paramKey}>
                      <div />
                      <Button
                        variant="contained"
                        onClick={() => entry.onClick()}
                      >
                        {entry.title}
                      </Button>
                    </React.Fragment>
                  )
                if (entry.type !== 'param') return

                if (paramKey === 'general.libraries')
                  return (
                    <React.Fragment key={paramKey}>
                      <FormLabel sx={{ fontSize: 12 }}>Libraries</FormLabel>
                      <LibrarySetting />
                    </React.Fragment>
                  )

                if (typeof entry.render !== 'undefined') {
                  return (
                    <React.Fragment key={paramKey}>
                      <FormLabel sx={{ fontSize: 12 }}>{entry.label}</FormLabel>
                      {entry.render(entry.value)}
                    </React.Fragment>
                  )
                }

                return (
                  <React.Fragment key={paramKey}>
                    <FormLabel sx={{ fontSize: 12 }}>{entry.label}</FormLabel>
                    {typeof entry.value === 'boolean' ? (
                      <Checkbox
                        sx={{
                          height: 10,
                          '&:hover': {
                            backgroundColor: 'transparent',
                          },
                          '&:click': {
                            backgroundColor: 'transparent',
                          },
                        }}
                        disableRipple={true}
                        checked={entry.value}
                        onChange={(e) =>
                          settings.set(paramKey, e.target.checked)
                        }
                      />
                    ) : (
                      <TextField
                        type={
                          typeof entry.value === 'number' ? 'number' : 'text'
                        }
                        disabled={entry.opts?.readonly}
                        defaultValue={entry.value}
                        size="small"
                      />
                    )}
                  </React.Fragment>
                )
              })}
            </div>
          </AccordionDetails>
        </Accordion>
      ))}
    </div>
  )
}

const supportedLibraries = [
  { name: 'creagen' },
  { name: 'p5' },
  { name: 'three', disabled: true },
]

function isDevBuild(version: SemVer) {
  return version.prerelease.length > 0
}

function LibrarySetting() {
  const settings = useSettings()
  const [versions, setVersions] = useState<Record<string, string[]>>({})
  const [selectedVersion, setSelectedVersion] = useState<
    Record<string, string>
  >({})

  const libraries = settings.values['general.libraries'] as Library[]

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
