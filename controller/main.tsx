import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  Box,
  CircularProgress,
} from '@mui/material'
import { logger } from '../src/logs/logger'
import { Messages } from '../src/logs/Messages'
import { ParamsViewPresentation } from '../src/params/ParamsViewPresentation'
import { ParamConfig, storeToQueryParam } from '../src/params/Params'
import { ErrorBoundary } from '../src/creagen-editor/ErrorBoundary'
import { Controller } from '../src/controller/Controller'
import { generateRandomValue } from '../src/params/params-util'

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
  },
})

let initialized = false

export function ControllerApp() {
  const [controller, setController] = useState<Controller | null>(null)
  const [configs, setConfigs] = useState(new Map<string, ParamConfig>())
  const [values, setValues] = useState(new Map<string, unknown>())
  const [compactLayout, setCompactLayout] = useState(false)
  const [regenInterval, setRegenInterval] = useState<number>(0)

  useEffect(() => {
    if (CREAGEN_EDITOR_CONTROLLER_URL == null) return
    const controller = new Controller(CREAGEN_EDITOR_CONTROLLER_URL)
    const parts = window.location.pathname.split('/')
    const id = parts[parts.length - 1]
    if (id == null || id.length === 0) {
      logger.error(`No id ${id}`)
      return
    }
    controller
      .connect(id)
      .then(() => {
        controller.onMessage((msg) => {
          switch (msg.type) {
            case 'editor:param-delete': {
              if (!initialized) return
              setConfigs((prev) => {
                const next = new Map(prev)
                next.delete(msg.key)
                return next
              })
              return
            }
            case 'editor:param-add': {
              if (!initialized) return
              setConfigs((prev) => {
                const next = new Map(prev)
                next.set(msg.key, msg.config)
                return next
              })
              return
            }
            case 'editor:param-value': {
              if (!initialized) return
              setValues((prev) => {
                const next = new Map(prev)
                next.set(msg.key, msg.value)
                return next
              })
              return
            }
            case 'editor:param-regen-interval': {
              if (!initialized) return
              setRegenInterval(msg.value)
              return
            }
            case 'editor:state': {
              if (initialized) return
              initialized = true
              setController(controller)
              setValues(new Map(msg.values))
              setConfigs(new Map(msg.configs))
              setRegenInterval(msg.regenInterval)
              return
            }
            case 'client:param-value':
            case 'client:statereq':
            case 'client:param-regen-interval':
            case 'connection':
            case 'disconnection':
              return
            case 'error': {
              logger.error(msg.error)
            }
          }
        })
        controller.send({ type: 'client:statereq' })
      })
      .catch(logger.error)
  }, [])

  useEffect(() => {
    if (values.size === 0) return
    const url = new URL(window.location.href)
    const queryParam = storeToQueryParam(values)
    url.searchParams.set('param', queryParam)
    window.history.replaceState(null, '', url)
  }, [values, configs])

  if (controller === null) {
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
      </Box>
    )
  }

  return (
    <div style={{ padding: '20px', height: '100vh', overflow: 'auto' }}>
      <ParamsViewPresentation
        configs={configs}
        values={values}
        compactLayout={compactLayout}
        regenIntervalMs={regenInterval}
        onValueChange={function (key: string, value: unknown): void {
          controller.send({ type: 'client:param-value', key, value })
        }}
        onRandomizeAll={function (): void {
          configs.forEach((config, key) => {
            const value = generateRandomValue(config)
            controller.send({ type: 'client:param-value', key, value })
          })
        }}
        onResetToDefaults={function (): void {
          configs.forEach((config, key) => {
            let defaultValue: unknown = config.default
            if (typeof config.default === 'function') {
              defaultValue = (config.default as () => unknown)()
            }
            controller.send({
              type: 'client:param-value',
              key,
              value: defaultValue,
            })
          })
        }}
        onRegenIntervalChange={function (ms: number): void {
          controller.send({ type: 'client:param-regen-interval', interval: ms })
        }}
        onCompactLayoutChange={function (compact: boolean): void {
          setCompactLayout(compact)
        }}
      />
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <ThemeProvider theme={darkTheme}>
    <CssBaseline />
    <ErrorBoundary>
      <ControllerApp />
    </ErrorBoundary>
    <Messages />
  </ThemeProvider>,
)
