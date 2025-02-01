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
import log from '../../log'

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
    <div id="settings">
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
              {settings.config[folderKey].title}
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
        for (let i = 0; i < vers.length; i++) {
          if (typeof supportedLibraries[i] === 'undefined')
            throw Error('library not found')
          const name = supportedLibraries[i]!.name
          versions[name] = vers[i]!
          selectedVersion[name] =
            libraries.find((l) => l.name === name)?.version ?? vers[i]![0]!
        }
        setVersions(versions)
        setSelectedVersion(selectedVersion)
      })
      .catch(log.error)
  }, [])

  return (
    <ToggleButtonGroup
      orientation="vertical"
      fullWidth={true}
      value={libraries.map((l) => l.name)}
      onChange={(_, value) => {
        settings.set(
          'general.libraries',
          value.map((name: string) => ({
            name,
            version:
              libraries.find((l) => l.name === name)?.version ??
              selectedVersion[name]!,
          })),
        )
      }}
    >
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
        >
          <span>{lib.name}</span>
          {versions[lib.name] === undefined ? null : (
            <Select
              value={versions[lib.name]![0]}
              size="small"
              onChange={(e) => {
                setSelectedVersion({
                  ...selectedVersion,
                  [lib.name]: e.target.value,
                })
              }}
            >
              {versions[lib.name]!.map((v) => (
                <MenuItem key={v} value={v}>
                  {v}
                </MenuItem>
              ))}
            </Select>
          )}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  )
}
