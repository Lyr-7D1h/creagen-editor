import { Entry, Folder, ParamKey } from '../../settings/SettingsConfig'
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

type NonFolderEntry = Exclude<Entry, Folder>
type ConfigEntry = [string, Entry]
type FolderConfigEntry = [string, Folder]

export function SettingsTab() {
  const settings = useCreagenEditor().settings
  const values = useSettingsAll()
  const [hidden, setHidden] = useLocalStorage('menu-settings-hidden', [])

  const configEntries = Object.keys(settings.config)
    .map((key): [string, Entry | null] => [key, settings.getEntry(key)])
    .filter((entry): entry is ConfigEntry => entry[1] !== null)

  const folders = configEntries
    .filter((entry): entry is FolderConfigEntry => entry[1].type === 'folder')
    .reduce<Record<string, [string, NonFolderEntry][]>>((acc, [key]) => {
      acc[key] = []
      return acc
    }, {})

  for (const [key, entry] of configEntries) {
    switch (entry.type) {
      case 'folder':
        continue
      case 'param':
        if (entry.hidden ?? false) continue
        break
      case 'button':
        break
    }

    const folderKey = key.split('.').slice(0, -1).join('.')
    folders[folderKey]?.push([key, entry])
  }

  const sections = Object.entries(folders).flatMap(([folderKey, entries]) => {
    const folderEntry = settings.getEntry(folderKey)
    if (folderEntry?.type !== 'folder' || (folderEntry.hidden ?? false)) {
      return []
    }

    return [{ folderKey, folderEntry, entries }]
  })

  return (
    <>
      {sections.map(({ folderKey, folderEntry, entries }) => (
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
                    if (entry.type === 'button') {
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
                    }

                    const settingsKey = paramKey as ParamKey
                    const value = values[settingsKey]

                    if (entry.render) {
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

                                settings.set(settingsKey, v)
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
