import { Plus, ChevronRight } from 'lucide-react'
import { Box, IconButton } from '@mui/material'
import { Actions } from '../creagen-editor/Actions'
import { useCreagenEditor } from '../creagen-editor/CreagenContext'
import { useHistory, useSettings } from '../events/useEditorEvents'
import { logger } from '../logs/logger'
import { KeybindHint } from '../shared/KeybindHint'
import { ActiveBookmark } from './ActiveBookmark'
import { History } from './History'
import { HtmlTooltip } from './HtmlTooltip'
import { LoginButton } from '../user/LoginButton'

export const BAR_HEIGHT = (fullscreen: boolean) => (fullscreen ? 18 : 22)

export function EditorBar({
  menu,
  toggleMenu,
}: {
  menu: boolean
  toggleMenu: () => void
}) {
  const creagenEditor = useCreagenEditor()
  const showActiveBookmark = useSettings('editor.show_active_bookmark')
  const historyEnabled = useSettings('editor.show_history')
  const historyBufferSize = useSettings('editor.history_buffer_size')
  const history = useHistory(historyBufferSize)
  const hasHistory = history.length > 0
  const historyVisible = historyEnabled && hasHistory
  const isFullscreen = useSettings('editor.fullscreen')
  const barHeight = BAR_HEIGHT(isFullscreen)

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        position: 'relative',
        gap: 0,
        backgroundColor: isFullscreen
          ? 'rgba(0, 0, 0, 0.8)'
          : 'background.paper',
        color: isFullscreen ? '#fff' : 'text.secondary',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          // Top bar: fixed to the mode height, content centered.
          height: barHeight,
          width: '100%',
          overflow: 'hidden',
        }}
      >
        <HtmlTooltip
          title={
            menu ? (
              <KeybindHint
                label="Hide editor menu"
                keybind={creagenEditor.getKeybindKeyString('editor.toggleMenu')}
                wrapInParens
              />
            ) : (
              <KeybindHint
                label="Show editor menu"
                keybind={creagenEditor.getKeybindKeyString('editor.toggleMenu')}
                wrapInParens
              />
            )
          }
          placement="right"
        >
          <IconButton
            sx={{
              width: barHeight,
              height: barHeight,
              padding: 0,
              margin: 0,
              color: 'inherit',
            }}
            onClick={() => toggleMenu()}
            size="small"
          >
            <ChevronRight
              style={{
                transform: menu ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.3s',
              }}
            />
          </IconButton>
        </HtmlTooltip>
        <HtmlTooltip
          title={
            <KeybindHint
              label="New sketch"
              keybind={creagenEditor.getKeybindKeyString('new')}
              wrapInParens
            />
          }
          placement="right"
        >
          <IconButton
            sx={{
              width: barHeight,
              height: barHeight,
              padding: 0,
              margin: 0,
              color: 'inherit',
            }}
            onClick={() => {
              creagenEditor
                .new()
                .then((r) => r.onFailure(logger.error))
                .catch(logger.error)
            }}
            size="small"
          >
            <Plus size={16}  />
          </IconButton>
        </HtmlTooltip>
        {creagenEditor.storage.remote && (
          <div style={{ minWidth: 0 }}>
            <LoginButton />
          </div>
        )}
        {showActiveBookmark && (
          <div>
            <ActiveBookmark color={isFullscreen ? '#fff' : undefined} />
          </div>
        )}


        {historyVisible && isFullscreen && (
          <div
            style={{
              flex: 1,
              minWidth: 0,
              display: 'flex',
              alignItems: 'center',
              // Clip so overflowing history can never bleed over the actions.
              overflow: 'hidden',
            }}
          >
            <History items={history} />
          </div>
        )}

        {!(historyVisible && isFullscreen) && <div style={{ flex: 1 }} />}
        {/* Never let the actions shrink away when the bar gets narrow. */}
        <div style={{ flexShrink: 0 }}>
          <Actions
            toggleMenu={toggleMenu}
            sizeVariant="compact"
            orientation="row"
            includeMenuToggle={false}
          />
        </div>
      </div>

      {/* Non-fullscreen: history gets its own bar below the main one. */}
      {historyVisible && !isFullscreen && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            // Same fixed height as the main bar, content centered.
            height: barHeight,
            minWidth: 0,
            overflow: 'hidden',
            width: '100%',
          }}
        >
          <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center' }}>
            <History items={history} />
          </div>
        </div>
      )}
    </Box>
  )
}
