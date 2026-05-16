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
  const { setColorScheme } = useColorScheme()
  const themeSetting = useSettings('editor.theme')

  useEffect(() => {
    // Set to null for system mode (follows OS preference)
    // or explicitly set 'light' or 'dark'
    if (themeSetting === 'system') {
      setColorScheme(null)
    } else if (themeSetting === 'light' || themeSetting === 'dark') {
      setColorScheme(themeSetting)
    }
  }, [setColorScheme, themeSetting])

  return null
}

export function Theme({ children }: React.PropsWithChildren) {
  return (
    <ThemeProvider theme={muiTheme} disableTransitionOnChange>
      <ThemeSync />
      {children}
    </ThemeProvider>
  )
}
