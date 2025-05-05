import React, { useEffect, useState } from 'react'
import { Entry, Library } from './SettingsConfig'
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
  IconButton,
  Tooltip,
} from '@mui/material'
import { ExpandMore, ChevronRight, ChevronLeft } from '@mui/icons-material'
import { Importer } from '../creagen-editor/importer'
import { CREAGEN_DEV_VERSION } from '../env'
import { logger } from '../logs/logger'
import { SemVer } from 'semver'
import { useSettings } from './SettingsProvider'

const expendedSettingKey = 'expandedSetting'
const collapseAllSettingsKey = 'collapseAllSettings'

export function SettingsView() {
  const settings = useSettings()
  const [expanded, setExpandedState] = React.useState<string>(
    localStorage.getItem(expendedSettingKey) ?? 'general',
  )
  const [collapsed, setCollapsed] = React.useState<boolean>(
    localStorage.getItem(collapseAllSettingsKey) === 'true',
  )

  function setExpanded(expanded: string) {
    localStorage.setItem(expendedSettingKey, expanded as string)
    setExpandedState(expanded)
  }

  function toggleCollapsed() {
    const newCollapsed = !collapsed
    localStorage.setItem(collapseAllSettingsKey, newCollapsed.toString())
    setCollapsed(newCollapsed)
  }

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
    <div
      style={{
        zIndex: 1002,
        position: 'absolute',
        right: 10,
        top: 10,
        display: settings.values['hide_all'] ? 'none' : 'flex',
        flexDirection: 'row',
        alignItems: 'flex-start',
      }}
    >
      <Tooltip
        title={collapsed ? 'Show settings' : 'Hide settings'}
        placement="left"
      >
        <IconButton
          onClick={toggleCollapsed}
          size="small"
          sx={{
            backgroundColor: 'white',
            border: '1px solid rgba(0, 0, 0, 0.12)',
            borderRight: collapsed ? '1px solid rgba(0, 0, 0, 0.12)' : 'none',
            borderTopRightRadius: collapsed ? 4 : 0,
            borderBottomRightRadius: collapsed ? 4 : 0,
            borderTopLeftRadius: 4,
            borderBottomLeftRadius: 4,
            minWidth: 30,
            width: 30,
            height: 30,
            padding: 0,
            '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.9)' },
            '& .MuiSvgIcon-root': { color: 'rgba(0, 0, 0, 0.54)' },
            position: 'relative',
          }}
        >
          {collapsed ? <ChevronLeft /> : <ChevronRight />}
        </IconButton>
      </Tooltip>

      <div
        style={{
          display: collapsed ? 'none' : 'block',
          boxShadow:
            '0px 2px 1px -1px rgba(0,0,0,0.2), 0px 1px 1px 0px rgba(0,0,0,0.14), 0px 1px 3px 0px rgba(0,0,0,0.12)',
        }}
      >
        {Object.entries(folders).map(([folderKey, entries]) => (
          <Accordion
            disableGutters
            sx={{ width: expanded === '' ? 100 : 300, margin: 0 }}
            key={folderKey}
            expanded={expanded === folderKey}
            onChange={(_, expanded) => {
              setExpanded(expanded ? folderKey : '')
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

                  if (typeof entry.render !== 'undefined') {
                    return (
                      <React.Fragment key={paramKey}>
                        <FormLabel sx={{ fontSize: 12 }}>
                          {entry.label}
                        </FormLabel>
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
                          disabled={entry.readonly}
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
    </div>
  )
}
