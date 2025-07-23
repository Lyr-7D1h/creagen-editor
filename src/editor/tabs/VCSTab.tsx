import React from 'react'
import { useCreagenEditor } from '../../creagen-editor/CreagenEditorView'
import { Typography, Box } from '@mui/material'

export function VCSTab() {
  const creagenEditor = useCreagenEditor()
  const vcs = creagenEditor.vcs
  const refs = vcs.refs.getRefs()

  refs.sort((a, b) => b.createdOn.getTime() - a.createdOn.getTime())

  return (
    <>
      {refs.map((ref) => (
        <React.Fragment key={ref.id + ref.name}>
          <Box
            onClick={() => creagenEditor.loadCode(ref)}
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
            <Typography component="span">{ref.name}</Typography>
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
              {ref.id.hash.substring(0, 7)}
            </Typography>
          </Box>
        </React.Fragment>
      ))}
    </>
  )
}
