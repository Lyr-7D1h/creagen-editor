import React from 'react'
import { useCreagenEditor } from './CreagenContext'
import QRCode from 'react-qr-code'
import CircularProgress from '@mui/material/CircularProgress'
import { useForceUpdateOnEditorEvent } from '../events/useEditorEvents'

export function QR() {
  const creagenEditor = useCreagenEditor()

  useForceUpdateOnEditorEvent('controller:connected')

  const activeId = creagenEditor.controller?.activeId
  const url =
    activeId != null ? `${CREAGEN_EDITOR_CONTROLLER_URL}/${activeId}` : null

  const size = 100

  return (
    <div
      style={{
        padding: '10px',
        position: 'absolute',
        right: 0,
        bottom: 0,
        zIndex: 10,
      }}
    >
      {url != null ? (
        <a href={url}>
          <QRCode value={url} size={size} enableBackground={'#ffffff66'} />
        </a>
      ) : (
        <div
          role="status"
          aria-label="Loading QR"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: size,
            height: size,
          }}
        >
          <CircularProgress size={48} />
        </div>
      )}
    </div>
  )
}
