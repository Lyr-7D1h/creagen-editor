import { ExpandMore, InfoOutline } from '@mui/icons-material'
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Checkbox,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import { useEffect, useState } from 'react'
import { useCreagenEditor } from '../../creagen-editor/CreagenContext'
import { logger } from '../../logs/logger'
import type { ParamSetting } from '../../settings/SettingsConfig'
import {
  FOLDERS,
  SETTINGS_CONFIG,
  type SettingsConfigKey,
  type SettingsEntryType,
} from '../../settings/SettingsConfig'
import { useLocalStorage } from '../../storage/useLocalStorage'
import { HtmlTooltip } from '../HtmlTooltip'

const SECTIONS = Object.values(
  Object.entries(SETTINGS_CONFIG).reduce(
    (acc, [key, entry]) => {
      if (entry.type !== 'param') return acc
      const folder = key.split('.')[0]! as keyof typeof FOLDERS
      if (!(folder in acc)) {
        const folderEntry = FOLDERS[folder]
        if (!folderEntry) return acc
        acc[folder] = {
          folderKey: folder,
          folderEntry,
          entries: [],
        }
      }
      acc[folder]!.entries.push([key, entry as ParamSetting])
      return acc
    },
    {} as Record<
      string,
      {
        folderKey: string
        folderEntry: { title: string }
        entries: [string, ParamSetting][]
      }
    >,
  ),
)

/**
 * Hook that forces re-render whenever any setting changes
 */
function useForceUpdateOnSettingsChange() {
  const settings = useCreagenEditor().settings
  const [, forceUpdate] = useState({})

  useEffect(() => {
    return settings.onAny(() => {
      forceUpdate({})
    })
  }, [settings])
}

export function SettingsTab() {
  const settings = useCreagenEditor().settings
  useForceUpdateOnSettingsChange()
  const [hidden, setHidden] = useLocalStorage('menu-settings-hidden', [])

  return (
    <>
      {SECTIONS.map(({ folderKey, folderEntry, entries }) => (
        <Accordion
          key={folderKey}
          expanded={!hidden.includes(folderKey)}
          onChange={() => {
            if (hidden.includes(folderKey)) {
              setHidden(hidden.filter((k) => k !== folderKey))
            } else {
              setHidden([...hidden, folderKey])
            }
          }}
        >
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography>{folderEntry.title}</Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ padding: 0 }}>
            <TableContainer component={Paper} elevation={0}>
              <Table size="small">
                <TableBody>
                  {entries.map(([paramKey, entry]) => {
                    const settingsKey = paramKey as SettingsConfigKey
                    const value = settings.get(settingsKey)

                    if (entry.render) {
                      return (
                        <TableRow key={paramKey}>
                          <TableCell sx={{ border: 0, paddingLeft: 2 }}>
                            <Typography variant="body2">
                              {entry.label}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ border: 0, paddingRight: 2 }}>
                            {entry.render(value, (newValue) => {
                              settings.set(
                                settingsKey,
                                newValue as SettingsEntryType<
                                  typeof settingsKey
                                >,
                              )
                            })}
                          </TableCell>
                        </TableRow>
                      )
                    }

                    return (
                      <TableRow key={paramKey}>
                        <TableCell sx={{ border: 0, paddingLeft: 2 }}>
                          <HtmlTooltip
                            title={entry.details}
                            arrow
                            placement="right"
                            slotProps={{
                              tooltip: {
                                sx: {
                                  maxWidth: 300,
                                },
                              },
                            }}
                          >
                            <Typography
                              variant="body2"
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.5,
                              }}
                            >
                              {entry.label}
                              {(entry.details?.length ?? 0) > 0 ? (
                                <InfoOutline
                                  sx={{
                                    fontSize: 16,
                                    color: 'text.secondary',
                                  }}
                                />
                              ) : null}
                            </Typography>
                          </HtmlTooltip>
                        </TableCell>
                        <TableCell sx={{ border: 0, paddingRight: 2 }}>
                          {typeof value === 'boolean' ? (
                            <Checkbox
                              checked={value}
                              size="small"
                              sx={{
                                '&:hover': {
                                  backgroundColor: 'transparent',
                                },
                              }}
                              onChange={(e) =>
                                settings.set(settingsKey, e.target.checked)
                              }
                            />
                          ) : (
                            <TextField
                              type={
                                typeof value === 'number' ? 'number' : 'text'
                              }
                              disabled={entry.readonly}
                              defaultValue={value}
                              size="small"
                              fullWidth
                              variant="outlined"
                              onChange={(e) => {
                                let v: number | string

                                if (typeof value === 'number') {
                                  v = Number(e.target.value)
                                  if (Number.isNaN(v)) {
                                    logger.error(
                                      `Invalid number given: ${e.target.value}`,
                                    )
                                    return
                                  }
                                } else {
                                  v = e.target.value
                                }

                                if (entry.validate) {
                                  const error = entry.validate(v)
                                  if (typeof error === 'string') {
                                    logger.error(error)
                                    return
                                  }
                                }

                                settings.set(
                                  settingsKey,
                                  v as SettingsEntryType<typeof settingsKey>,
                                )
                              }}
                            />
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </AccordionDetails>
        </Accordion>
      ))}
    </>
  )
}
