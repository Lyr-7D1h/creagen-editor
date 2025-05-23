import React, { createContext, useContext, useEffect, useState } from 'react'
import { VerticalSplitResizer } from './VerticalSplitResizer'
import { logger } from '../logs/logger'
import { Sandbox, AnalyzeContainerResult } from '../sandbox/Sandbox'
import { SettingsContextType } from '../settings/Settings'
import { Svg } from './svg'
import { CreagenEditor } from './CreagenEditor'
import { SettingsProvider } from '../settings/SettingsProvider'
import { Logs } from '../logs/Logs'
import { SettingsView } from '../settings/SettingsView'
import { EditorView } from '../editor/EditorView'
import { SandboxView } from '../sandbox/SandboxView'
import { Box, CircularProgress } from '@mui/material'

const CreagenEditorContext = createContext<CreagenEditor>(null!)

export const useCreagenEditor = (): CreagenEditor => {
  const context = useContext(CreagenEditorContext)
  if (context === null) {
    throw new Error(
      'useCreagenEditor must be used within a CreagenEditorProvider and after editor initialization',
    )
  }
  return context
}

export function CreagenEditorView() {
  const [creagenEditor, setCreagenEditor] = useState<CreagenEditor | null>(null)

  useEffect(() => {
    CreagenEditor.create()
      .then((creagenEditor) => {
        setCreagenEditor(creagenEditor)
        creagenEditor.sandbox.addEventListener('analysisResult', (result) => {
          updateExportSettings(
            creagenEditor.settings,
            result.analysisResult,
            creagenEditor.sandbox,
          )
        })
      })
      .catch((e) => logger.error(e))
  }, [])

  if (creagenEditor === null) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
        }}
      >
        <CircularProgress />
        <Logs />
      </Box>
    )
  }

  return (
    <CreagenEditorContext.Provider value={creagenEditor}>
      <SettingsProvider settings={creagenEditor.settings}>
        <VerticalSplitResizer>
          <EditorView height={'100vh'} />
          <SandboxView />
        </VerticalSplitResizer>
        <SettingsView />
        <Logs />
      </SettingsProvider>
    </CreagenEditorContext.Provider>
  )
}

async function updateExportSettings(
  settings: SettingsContextType,
  result: AnalyzeContainerResult,
  link: Sandbox,
) {
  settings.remove('export')
  for (const svgResult of result.svgs) {
    const { paths, circles, rects } = svgResult
    settings.add('export', {
      type: 'folder',
      title: 'Export',
    })
    settings.add('export.paths', {
      type: 'param',
      label: 'Paths',
      value: paths,
      readonly: true,
    })
    settings.add('export.circles', {
      type: 'param',
      label: 'Circles',
      value: circles,
      readonly: true,
    })
    settings.add('export.rects', {
      type: 'param',
      label: 'Rects',
      value: rects,
      readonly: true,
    })
    settings.add('export.name', {
      type: 'param',
      label: 'Name',
      value: settings.values['general.name'],
      readonly: true,
    })
    settings.add('export.optimize', {
      type: 'param',
      label: 'Optimize',
      value: true,
      readonly: true,
    })
    settings.add('export.download', {
      type: 'button',
      title: 'Download',
      onClick: async () => {
        const svgString = await link.svgExport(0)
        if (svgString === null) {
          logger.error('No svg found')
          return
        }
        const parser = new DOMParser()
        const doc = parser.parseFromString(svgString, 'image/svg+xml')
        const svgInstance = new Svg(
          doc.documentElement as unknown as SVGElement,
        )
        svgInstance.export(
          settings.values['general.name'],
          settings.values['general.libraries'],
        )
      },
    })
  }
}
