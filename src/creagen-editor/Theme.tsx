import { createTheme, ThemeProvider } from '@mui/material'
import type React from 'react'

const theme = createTheme({
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

export function Theme({ children }: React.PropsWithChildren) {
  return (
    <ThemeProvider theme={theme} disableTransitionOnChange>
      {children}
    </ThemeProvider>
  )
}
