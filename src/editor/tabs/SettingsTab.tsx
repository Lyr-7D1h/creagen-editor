import React from 'react'
import { Entry, ParamKey } from '../../settings/SettingsConfig'
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Checkbox,
  FormLabel,
  Typography,
  TextField,
  Button,
  Box,
} from '@mui/material'
import { ExpandMore } from '@mui/icons-material'
import { useSettingsAll } from '../../events/useEditorEvents'
import { useCreagenEditor } from '../../creagen-editor/CreagenEditorView'

export function SettingsTab() {
  const settings = useCreagenEditor().settings
  const values = useSettingsAll()
  const [expanded, setExpanded] = React.useState<string>('general')

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
    <Box p={2}>
      <Typography variant="h5" gutterBottom>
        Settings
      </Typography>

      {Object.entries(folders).map(([folderKey, entries]) => (
        <Accordion
          key={folderKey}
          expanded={expanded === folderKey}
          onChange={(_, isExpanded) => {
            setExpanded(isExpanded ? folderKey : '')
          }}
        >
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography>{(settings.config as any)[folderKey].title}</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'max-content auto',
                gap: 2,
                alignItems: 'center',
              }}
            >
              {entries.map(([paramKey, e]) => {
                const entry = e as Entry
                const value = values[paramKey as ParamKey]

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

                if (typeof entry.render !== 'undefined') {
                  return (
                    <React.Fragment key={paramKey}>
                      <FormLabel>{entry.label}</FormLabel>
                      {entry.render(value)}
                    </React.Fragment>
                  )
                }

                return (
                  <React.Fragment key={paramKey}>
                    <FormLabel>{entry.label}</FormLabel>
                    {typeof value === 'boolean' ? (
                      <Checkbox
                        checked={value}
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
                        type={typeof value === 'number' ? 'number' : 'text'}
                        disabled={entry.readonly}
                        defaultValue={value}
                        size="small"
                        fullWidth
                      />
                    )}
                  </React.Fragment>
                )
              })}
            </Box>
          </AccordionDetails>
        </Accordion>
      ))}
    </Box>
  )
}
