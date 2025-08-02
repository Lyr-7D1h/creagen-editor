import React, { Component, ErrorInfo, ReactNode } from 'react'
import { logger } from '../logs/logger'
import { Box, Typography } from '@mui/material'
import { MenuLinks } from '../components/IconLinks'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
  errorInfo?: ErrorInfo
}

class ErrorBoundaryComponent extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error(error, errorInfo.componentStack, React.captureOwnerStack())
    this.setState({ errorInfo })
  }

  override render() {
    if (this.state.hasError) {
      return (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
            textAlign: 'center',
            p: 2,
            backgroundColor: '#fcefee',
            color: '#d32f2f',
          }}
        >
          <Typography variant="h4" gutterBottom>
            Oops! Something went wrong.
          </Typography>
          <Typography variant="subtitle1" sx={{ mb: 2 }}>
            An unexpected error has occurred. Please try again or report the
            bug.
          </Typography>
          <Box
            sx={{
              textAlign: 'left',
              backgroundColor: 'white',
              p: 2,
              borderRadius: 1,
              maxWidth: '800px',
              overflowX: 'auto',
              mb: 2,
            }}
          >
            <Typography variant="h6" color="error">
              {this.state.error?.name}: {this.state.error?.message}
            </Typography>
            <Typography
              component="pre"
              sx={{ mt: 1, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}
            >
              {this.state.error?.stack}
            </Typography>
            {this.state.errorInfo && (
              <Typography
                component="pre"
                sx={{ mt: 2, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}
              >
                Component Stack:
                {this.state.errorInfo.componentStack}
              </Typography>
            )}
          </Box>
          <Box sx={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '10px 20px',
                fontSize: '16px',
                cursor: 'pointer',
                border: '1px solid #d32f2f',
                borderRadius: '4px',
                backgroundColor: '#d32f2f',
                color: 'white',
              }}
            >
              Try again
            </button>
            <button
              onClick={() => {
                const { error, errorInfo } = this.state
                const body = `
**Error:** ${error?.name}: ${error?.message}
**Stack Trace:**
\`\`\`
${error?.stack}
\`\`\`
**Component Stack:**
\`\`\`
${errorInfo?.componentStack}
\`\`\`
`
                const url = `https://github.com/Lyr-7D1h/creagen-editor/issues/new?body=${encodeURIComponent(
                  body,
                )}&title=Bug Report from Error Page`
                window.open(url, '_blank')
              }}
              style={{
                padding: '10px 20px',
                fontSize: '16px',
                cursor: 'pointer',
                border: '1px solid #d32f2f',
                borderRadius: '4px',
                backgroundColor: 'transparent',
                color: '#d32f2f',
              }}
            >
              Report Bug
            </button>
          </Box>
          <MenuLinks />
        </Box>
      )
    }

    return this.props.children
  }
}

export const ErrorBoundary = ErrorBoundaryComponent
