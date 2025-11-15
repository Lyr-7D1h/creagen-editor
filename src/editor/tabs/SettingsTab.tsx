import React from 'react'
import { Entry, ParamKey } from '../../settings/SettingsConfig'
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Checkbox,
  Typography,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Paper,
} from '@mui/material'
import { ExpandMore, InfoOutline } from '@mui/icons-material'
import { useSettingsAll } from '../../events/useEditorEvents'
import { useCreagenEditor } from '../../creagen-editor/CreagenContext'
import { useLocalStorage } from '../../storage/useLocalStorage'
import { HtmlTooltip } from '../HtmlTooltip'
import { logger } from '../../logs/logger'

export function SettingsTab() {
  const settings = useCreagenEditor().settings
  const values = useSettingsAll()
  const [hidden, setHidden] = useLocalStorage('menu-settings-hidden', [])

  const folders: Record<string, any[]> = Object.entries(settings.config)
    .filter(([_, entry]) => (entry as Entry).type === 'folder')
    .reduce((a, [key]) => ({ ...a, [key]: [] }), {})

  for (const [key, entry] of Object.entries(settings.config)) {
    switch (entry.type) {
      case 'folder':
        continue
      case 'param': {
        if (entry.hidden) continue
        const parts = key.split('.')
        const folder = parts.splice(0, parts.length - 1).join('.')
        folders[folder]!.push([key, entry])
      }
    }
  }

  return (
    <>
      {Object.entries(folders)
        .filter(([folderKey, _]) => !(settings.config as any)[folderKey].hidden)
        .map(([folderKey, entries]) => (
          <Accordion
            key={folderKey}
            expanded={!hidden.includes(folderKey)}
            onChange={(_) => {
              if (hidden.includes(folderKey)) {
                setHidden(hidden.filter((k) => k !== folderKey))
              } else {
                setHidden([...hidden, folderKey])
              }
            }}
          >
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography>
                {(settings.config as any)[folderKey].title}
              </Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ padding: 0 }}>
              <TableContainer component={Paper} elevation={0}>
                <Table size="small">
                  <TableBody>
                    {entries.map(([paramKey, e]) => {
                      const entry = e as Entry
                      const value = values[paramKey as ParamKey]

                      if (entry.type === 'button')
                        return (
                          <TableRow key={paramKey}>
                            <TableCell sx={{ border: 0, paddingLeft: 2 }}>
                              <Typography variant="body2">
                                {entry.title}
                              </Typography>
                            </TableCell>
                            <TableCell sx={{ border: 0, paddingRight: 2 }}>
                              <Button
                                variant="contained"
                                size="small"
                                onClick={() => entry.onClick()}
                              >
                                {entry.title}
                              </Button>
                            </TableCell>
                          </TableRow>
                        )
                      if (entry.type !== 'param') return null

                      if (typeof entry.render !== 'undefined') {
                        return (
                          <TableRow key={paramKey}>
                            <TableCell sx={{ border: 0, paddingLeft: 2 }}>
                              <Typography variant="body2">
                                {entry.label}
                              </Typography>
                            </TableCell>
                            <TableCell sx={{ border: 0, paddingRight: 2 }}>
                              {entry.render(value)}
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
                                {(entry.details?.length ?? 0 > 0) ? (
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
                                  settings.set(paramKey, e.target.checked)
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
                                  settings.set(paramKey, v)
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
