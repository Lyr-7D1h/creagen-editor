import { createTheme, ThemeProvider, useColorScheme } from '@mui/material'
import type React from 'react'
import { useEffect } from 'react'
import { useSettings } from '../events/useEditorEvents'

const muiTheme = createTheme({
  colorSchemes: {
    light: {
      palette: {
        primary: {
          light: '#4ca3fb',
          main: '#3486eb',
          dark: '#2e63c5',
          contrastText: '#fff',
        },
        secondary: {
          light: '#f1b65f',
          main: '#eb9934',
          dark: '#d87229',
          contrastText: '#000',
        },
      },
    },
    dark: {
      palette: {
        primary: {
          light: '#4ca3fb',
          main: '#3486eb',
          dark: '#2e63c5',
          contrastText: '#fff',
        },
        secondary: {
          light: '#f1b65f',
          main: '#eb9934',
          dark: '#d87229',
          contrastText: '#000',
        },
        text: {
          primary: 'rgba(255, 255, 255, 0.87)',
          secondary: 'rgba(255, 255, 255, 0.6)',
        },
      },
    },
  },
})

// Inner component that uses useColorScheme hook
function ThemeSync() {
  const { mode, setColorScheme } = useColorScheme()
  const themeSetting = useSettings('editor.theme')

  useEffect(() => {
    // Set explicit themes directly; everything else (null, 'system')
    // maps to null so MUI follows the OS.
    if (themeSetting === 'light' || themeSetting === 'dark') {
      setColorScheme(themeSetting)
    } else {
      setColorScheme(null)
    }
  }, [setColorScheme, themeSetting])

  // Sync with Tailwind CSS via data-theme attribute.
  // We rely on `themeSetting` and a media query listener directly,
  // avoiding MUI's `mode` value which appears to expose 'system' as a
  // string instead of the resolved preference.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')

    const apply = () => {
      if (themeSetting === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark')
      } else if (themeSetting === 'light') {
        document.documentElement.setAttribute('data-theme', 'light')
      } else {
        document.documentElement.setAttribute(
          'data-theme',
          mq.matches ? 'dark' : 'light'
        )
      }
    }

    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [themeSetting])

  return null
}

export function Theme({
  children,
  colorScheme,
}: React.PropsWithChildren & {
  sync?: boolean
  colorScheme?: 'light' | 'dark'
}) {
  return (
    <ThemeProvider
      theme={muiTheme}
      defaultMode={colorScheme}
      disableTransitionOnChange
    >
      {!colorScheme && <ThemeSync />}
      {children}
    </ThemeProvider>
  )
}
