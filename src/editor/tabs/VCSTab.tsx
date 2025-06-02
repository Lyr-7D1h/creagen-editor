import React from 'react'
import { useCreagenEditor } from '../../creagen-editor/CreagenEditorView'
import { Typography, Box } from '@mui/material'

export function VCSTab() {
  const creagenEditor = useCreagenEditor()
  const refs = creagenEditor.vcs.refs?.getRefs() ?? []

  const groupedRefs = refs.reduce(
    (groups, ref) => {
      const groupName = ref.name.startsWith('refs/heads/')
        ? 'Branches'
        : ref.name.startsWith('refs/tags/')
          ? 'Tags'
          : 'Remotes'
      if (!groups[groupName]) {
        groups[groupName] = []
      }
      groups[groupName].push(ref)
      return groups
    },
    {} as Record<string, any[]>,
  )

  const handleRefClick = (ref: any) => {
    console.log('Clicked ref:', ref.name, 'SHA:', ref.sha)
    // TODO: Add navigation or checkout functionality
  }

  return (
    <>
      <Typography variant="h5" textAlign={'center'}>
        References
      </Typography>
      {Object.entries(groupedRefs).map(([groupName, refsInGroup]) => (
        <React.Fragment key={groupName}>
          <Typography variant="h6" sx={{ marginTop: 2 }}>
            {groupName}
          </Typography>
          {refsInGroup.map((ref) => {
            const displayName = ref.name
              .replace(/^refs\/heads\//, '')
              .replace(/^refs\/tags\//, '')
              .replace(/^refs\/remotes\//, '')
            return (
              <Box
                key={ref.name}
                onClick={() => handleRefClick(ref)}
                sx={{
                  marginLeft: 2,
                  padding: 1,
                  cursor: 'pointer',
                  borderRadius: 1,
                  '&:hover': {
                    backgroundColor: 'action.hover',
                  },
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Typography component="span">{displayName}</Typography>
                <Typography
                  component="span"
                  variant="body2"
                  sx={{
                    fontFamily: 'monospace',
                    color: 'text.secondary',
                    backgroundColor: 'grey.100',
                    padding: '2px 6px',
                    borderRadius: '4px',
                  }}
                >
                  {ref.sha?.substring(0, 7)}
                </Typography>
              </Box>
            )
          })}
        </React.Fragment>
      ))}
    </>
  )
}
