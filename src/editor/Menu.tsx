import React, { RefAttributes, useEffect } from 'react'
import { Box, Button, ButtonGroup, Typography } from '@mui/material'
import KeyboardIcon from '@mui/icons-material/Keyboard'
import { AccountTree, Settings } from '@mui/icons-material'
import { BookmarksTab } from './tabs/BookmarksTab'
import { useCreagenEditor } from '../creagen-editor/CreagenEditorView'
import { SettingsTab } from './tabs/SettingsTab'
import { KeybindingsTab } from './tabs/KeybindingsTab'
import { useLocalStorage } from '../storage/useLocalStorage'
import AutoStoriesIcon from '@mui/icons-material/AutoStories'
import { DependenciesTab } from './tabs/DependenciesTab'
import { StorageBar } from './StorageBar'
import { MenuLinks } from '../shared/IconLinks'
import { CommitsTab } from './tabs/CommitsTab'
import { logger } from '../logs/logger'
import BookmarkIcon from '@mui/icons-material/Bookmark'
import CommitIcon from '@mui/icons-material/Commit'

export type MenuProps = {
  width?: string
}

interface TabConfig {
  icon: React.ReactElement
  title?: string
  content?: React.ReactElement
  parent?: string
  sub?: Record<string, TabConfig>
}

const tabs: Record<string, TabConfig> = {
  vcs: {
    icon: <AccountTree />,
    title: 'VCS',
  },
  'vcs-bookmarks': {
    title: 'Bookmarks',
    content: <BookmarksTab />,
    icon: <BookmarkIcon />,
    parent: 'vcs',
  },
  'vcs-commits': {
    title: 'Commits (WIP)',
    content: <CommitsTab />,
    icon: <CommitIcon />,
    parent: 'vcs',
  },
  dependencies: {
    icon: <AutoStoriesIcon />,
    title: 'Dependencies',
    content: <DependenciesTab />,
  },
  keybinds: {
    icon: <KeyboardIcon />,
    title: 'Keybindings',
    content: <KeybindingsTab />,
  },
  settings: {
    icon: <Settings />,
    title: 'Settings',
    content: <SettingsTab />,
  },
}
export type TabKey = keyof typeof tabs

const defaultKey = 'vcs-bookmarks'

const parentTabs = Object.entries(tabs).filter(
  ([_, c]) => typeof c.parent === 'undefined',
)
const childTabs = Object.entries(tabs).filter(
  ([_, c]) => typeof c.parent !== 'undefined',
)

export function Menu<T>({ ref, width }: MenuProps & RefAttributes<T>) {
  const creagenEditor = useCreagenEditor()
  const [selectedTabKey, setSelectedTabKey] = useLocalStorage(
    'menu-view-tab',
    defaultKey,
  )

  // reset in case of invalid key
  useEffect(() => {
    if (typeof tabs[selectedTabKey]?.content === 'undefined') {
      setSelectedTabKey(defaultKey)
    }
  }, [selectedTabKey, setSelectedTabKey])

  const setTab = (tab: string) => {
    creagenEditor.storage
      .set('menu-view-tab', selectedTabKey)
      .catch(logger.error)
    setSelectedTabKey(tab)
  }

  const selectedTab = tabs[selectedTabKey]!

  return (
    <Box
      ref={ref}
      sx={{
        width: width ?? '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'scroll',
        backgroundColor: 'white',
      }}
    >
      <Box
        sx={{
          padding: 1,
          paddingTop: 0,
          backgroundColor: 'background.default',
          borderBottom: 1,
          borderColor: 'divider',
          containerType: 'inline-size',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
            <Typography sx={{ fontWeight: 'bold' }}>Creagen Editor</Typography>
            <Typography variant="caption" color="text.secondary">
              {CREAGEN_EDITOR_VERSION}{' '}
              {CREAGEN_EDITOR_COMMIT_HASH != null &&
                `(${CREAGEN_EDITOR_COMMIT_HASH.substring(0, 7)})`}
            </Typography>
          </Box>
          <MenuLinks />
        </Box>
        <StorageBar />
        <ButtonGroup
          variant="outlined"
          size="small"
          fullWidth
          sx={{
            marginTop: '5px',
            '& .MuiButton-root': {
              flex: 1,
              minWidth: 0,
              padding: '4px 8px',
            },
          }}
        >
          {parentTabs.map(([key, tab]) => {
            const selected =
              selectedTabKey === key ||
              (selectedTab.parent != null ? selectedTab.parent === key : false)
            return (
              <Button
                key={key}
                variant={selected ? 'contained' : 'outlined'}
                onClick={() => setTab(key)}
                startIcon={tab.icon}
                sx={{
                  textTransform: 'none',
                  fontWeight: selected ? 600 : 400,
                  '& .MuiButton-startIcon': {
                    marginRight: 0.5,
                    marginLeft: -0.5,
                    '@container (max-width: 480px)': {
                      marginRight: 0,
                      marginLeft: 0,
                    },
                  },
                }}
              >
                <Box
                  component="span"
                  sx={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    '@container (max-width: 480px)': {
                      display: 'none',
                    },
                  }}
                >
                  {tab.title}
                </Box>
              </Button>
            )
          })}
        </ButtonGroup>
        {typeof selectedTab.parent !== 'undefined' && (
          <ButtonGroup
            variant="outlined"
            size="small"
            fullWidth
            sx={{
              '& .MuiButton-root': {
                flex: 1,
                minWidth: 0,
                padding: '4px 8px',
              },
            }}
          >
            {childTabs.map(([key, tab]) => {
              const selected = key === selectedTabKey
              return (
                <Button
                  key={key}
                  variant={selected ? 'contained' : 'outlined'}
                  onClick={() => setTab(key)}
                  startIcon={tab.icon}
                  sx={{
                    textTransform: 'none',
                    fontWeight: selected ? 600 : 400,
                    '& .MuiButton-startIcon': {
                      marginRight: 0.5,
                      marginLeft: -0.5,
                      '@container (max-width: 480px)': {
                        marginRight: 0,
                        marginLeft: 0,
                      },
                    },
                  }}
                >
                  <Box
                    component="span"
                    sx={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      '@container (max-width: 480px)': {
                        display: 'none',
                      },
                    }}
                  >
                    {tab.title}
                  </Box>
                </Button>
              )
            })}
          </ButtonGroup>
        )}
      </Box>

      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        {selectedTab.title != null ? (
          <Typography variant="h5" gutterBottom textAlign={'center'}>
            {selectedTab.title}
          </Typography>
        ) : (
          ''
        )}
        {selectedTab.content ?? selectedTab.content}
      </Box>
    </Box>
  )
}
