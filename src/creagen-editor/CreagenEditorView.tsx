import React, { useRef, useEffect } from 'react'
import { VerticalSplitResizer } from './VerticalSplitResizer'
import { Editor } from '../editor/Editor'
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

const creagenEditor = new CreagenEditor()

export function CreagenEditorView() {
  const editorRef = useRef<Editor>(null)
  const sandboxRef = useRef<Sandbox>(null)

  useEffect(() => {
    creagenEditor.updateStorageUsage()
  }, [])

  // if (loaded) {
  //   return (
  //     <Box
  //       sx={{
  //         display: 'flex',
  //         flexDirection: 'column',
  //         alignItems: 'center',
  //         justifyContent: 'center',
  //         height: '100vh',
  //         width: '100vw',
  //         bgcolor: 'background.paper',
  //         color: 'text.primary',
  //       }}
  //     >
  //       <Logs />
  //       <CircularProgress size={60} thickness={4} sx={{ mb: 3 }} />
  //       <Typography variant="h6">Loading Editor...</Typography>
  //     </Box>
  //   )
  // }

  return (
    <SettingsProvider settings={creagenEditor.settings}>
      <VerticalSplitResizer>
        <EditorView
          height={'100vh'}
          onLoad={(editor) => {
            editorRef.current = editor
            creagenEditor.setEditor(editor)
          }}
        />
        <SandboxView
          onLoad={(sandbox) => {
            sandboxRef.current = sandbox
            creagenEditor.setSandbox(sandbox)
            sandbox.addEventListener('analysisResult', (result) => {
              updateExportSettings(
                creagenEditor.settings,
                result.analysisResult,
                sandbox,
              )
            })
          }}
        />
      </VerticalSplitResizer>
      <SettingsView />
      <Logs />
    </SettingsProvider>
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
