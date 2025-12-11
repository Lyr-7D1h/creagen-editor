import React from 'react'
import { useCreagenEditor } from './CreagenContext'
import QRCode from 'react-qr-code'
import CircularProgress from '@mui/material/CircularProgress'
import {
  useForceUpdateOnEditorEvent,
  useSettings,
} from '../events/useEditorEvents'

export function QR() {
  const creagenEditor = useCreagenEditor()
  useForceUpdateOnEditorEvent('controller:connected')
  useForceUpdateOnEditorEvent('params:config')

  const controllerEnabled = useSettings('controller.enabled')
  const showQR = useSettings('show_qr')
  const size = useSettings('controller.qr_size')

  const activeId = creagenEditor.controller?.activeId
  const url =
    activeId != null ? `${window.location.origin}/controller/${activeId}` : null

  if (
    !controllerEnabled ||
    CREAGEN_EDITOR_CONTROLLER_URL == null ||
    !showQR ||
    creagenEditor.params.length === 0
  )
    return <></>

  return (
    <div
      style={{
        padding: '8px',
        position: 'absolute',
        right: 0,
        bottom: 0,
        zIndex: 10,
      }}
    >
      {url != null ? (
        <a href={url}>
          <div
            style={{
              padding: '10px',
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              transition: 'transform 0.2s, box-shadow 0.2s',
              backdropFilter: 'blur(8px)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)'
              e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.15)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)'
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)'
            }}
          >
            <QRCode value={url} size={size} />
          </div>
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
