import { Box, Button, Typography, Alert, Stack } from '@mui/material'
import DownloadIcon from '@mui/icons-material/Download'
import UploadIcon from '@mui/icons-material/Upload'
import React, { useState, useRef } from 'react'
import { useCreagenEditor } from '../../creagen-editor/CreagenContext'
import { logger } from '../../logs/logger'

export function ImportTab() {
  const creagenEditor = useCreagenEditor()
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [message, setMessage] = useState<{
    type: 'success' | 'error' | 'info'
    text: string
  } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleExport = () => {
    setIsExporting(true)
    setMessage(null)
    creagenEditor.storage
      .export()
      .then((data) => {
        // Create a JSON blob with the exported data
        const blob = new Blob([JSON.stringify(data, null, 2)], {
          type: 'application/json',
        })

        // Create download link
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `creagen-export-${new Date().toISOString().split('T')[0]}.json`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)

        const commits = data.commits as unknown[]
        const blobs = data.blobs as unknown[]
        setMessage({
          type: 'success',
          text: `Exported ${commits.length} commits and ${blobs.length} blobs`,
        })
      })
      .catch((error) => {
        logger.error('Export failed:', error)
        setMessage({
          type: 'error',
          text: `Export failed: ${error instanceof Error ? error.message : String(error)}`,
        })
      })
      .finally(() => {
        setIsExporting(false)
      })
  }

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsImporting(true)
    setMessage(null)

    file
      .text()
      .then((text) => {
        const data = JSON.parse(text) as unknown

        // Validate the data structure
        if (
          typeof data !== 'object' ||
          data === null ||
          !('commits' in data) ||
          !('blobs' in data)
        ) {
          throw new Error('Invalid export file: missing commits or blobs')
        }

        const { commits, blobs } = data as { commits: unknown; blobs: unknown }

        if (!Array.isArray(commits) || !Array.isArray(blobs)) {
          throw new Error(
            'Invalid export file: commits and blobs must be arrays',
          )
        }

        return creagenEditor.storage.import({
          commits: commits as Array<{ key: string; value: unknown }>,
          blobs: blobs as Array<{ key: string; value: unknown }>,
        })
      })
      .then(() => {
        setMessage({
          type: 'success',
          text: 'Successfully imported data',
        })
      })
      .catch((error) => {
        logger.error('Import failed:', error)
        setMessage({
          type: 'error',
          text: `Import failed: ${error instanceof Error ? error.message : String(error)}`,
        })
      })
      .finally(() => {
        setIsImporting(false)
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      })
  }

  return (
    <Box sx={{ padding: 2 }}>
      <Typography variant="h6" gutterBottom>
        Import/Export Data
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Export your commits and blobs, <b>not bookmarks</b> to a JSON file, or
        import previously exported data.
      </Typography>

      <Stack spacing={2}>
        <Button
          variant="contained"
          startIcon={<DownloadIcon />}
          onClick={handleExport}
          disabled={isExporting || isImporting}
          fullWidth
        >
          {isExporting ? 'Exporting...' : 'Export Data'}
        </Button>

        <Button
          variant="outlined"
          startIcon={<UploadIcon />}
          onClick={handleImportClick}
          disabled={isExporting || isImporting}
          fullWidth
        >
          {isImporting ? 'Importing...' : 'Import Data'}
        </Button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          style={{ display: 'none' }}
          onChange={handleFileSelected}
        />

        {message && (
          <Alert severity={message.type} onClose={() => setMessage(null)}>
            {message.text}
          </Alert>
        )}

        <Box sx={{ mt: 2 }}>
          <Typography variant="caption" color="text.secondary">
            <strong>Note:</strong> Imported commits and blobs will be added to
            your existing data. Duplicate entries (with the same hash) will be
            skipped automatically.
          </Typography>
        </Box>
      </Stack>
    </Box>
  )
}
