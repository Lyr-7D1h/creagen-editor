import { Box, Stack, TextField, Chip, Typography } from '@mui/material'
import React, { useState } from 'react'

export function CommitsTab() {
  const [searchText, setSearchText] = useState('')
  const [authorFilter, setAuthorFilter] = useState<string | null>(null)

  // For now, show a placeholder since we need to implement getAllCommits
  // This would require adding a method to VCS to retrieve all commits from storage

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Stack spacing={1} sx={{ mb: 2 }}>
        <TextField
          size="small"
          placeholder="Search by hash, author, or library..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          fullWidth
        />
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
          <Chip
            label="All Authors"
            onClick={() => setAuthorFilter(null)}
            color={authorFilter === null ? 'primary' : 'default'}
            size="small"
          />
          <Chip
            label="local"
            onClick={() => setAuthorFilter('local')}
            color={authorFilter === 'local' ? 'primary' : 'default'}
            size="small"
          />
        </Box>
      </Stack>

      <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
        Commit history feature coming soon. This will show all commits with
        filtering by hash, author, and libraries.
      </Typography>
    </Box>
  )
}
