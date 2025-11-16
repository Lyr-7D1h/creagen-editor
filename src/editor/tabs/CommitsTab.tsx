import {
  Box,
  Stack,
  TextField,
  Chip,
  Typography,
  Button,
  Menu,
  MenuItem,
  FormControlLabel,
  Checkbox,
} from '@mui/material'
import React, { useState, useEffect, useRef } from 'react'
import { useCreagenEditor } from '../../creagen-editor/CreagenContext'
import { Commit } from '../../vcs/Commit'
import * as d3 from 'd3'
import { logger } from '../../logs/logger'
import { useForceUpdateOnEditorEvent } from '../../events/useEditorEvents'

type CommitNode = {
  id: string
  commit: Commit | null // null for virtual root node
  bookmarks: string[]
  x: number
  y: number
  fx?: number // Fixed x position (optional)
  fy?: number // Fixed y position (optional)
}

type CommitLink = {
  source: CommitNode
  target: CommitNode
  intermediateCount: number
}

export function CommitsTab() {
  const creagenEditor = useCreagenEditor()
  const hook = useForceUpdateOnEditorEvent([
    'vcs:checkout',
    'vcs:bookmark-update',
    'vcs:commit',
  ])
  const vcs = creagenEditor.vcs
  const svgRef = useRef<SVGSVGElement>(null)
  const [commits, setCommits] = useState<Commit[]>([])
  const [searchText, setSearchText] = useState('')
  const [authorFilter, setAuthorFilter] = useState<string | null>(null)
  const [selectedCommit, setSelectedCommit] = useState<Commit | null>(null)
  const [focusedCommitHash, setFocusedCommitHash] = useState<string | null>(
    () => vcs.activeBookmark.commit?.toHex() ?? null,
  )
  const [checkoutMenuAnchor, setCheckoutMenuAnchor] =
    useState<null | HTMLElement>(null)
  const [minifyGraph, setMinifyGraph] = useState(true)

  useEffect(() => {
    vcs.getAllCommits().then(setCommits).catch(logger.error)
  }, [vcs, hook])

  useEffect(() => {
    if (!svgRef.current || commits.length === 0) return

    // Filter commits based on search and author
    const filteredCommits = commits.filter((commit) => {
      const matchesSearch =
        searchText === '' ||
        commit.hash.toHex().includes(searchText.toLowerCase()) ||
        (commit.author?.toLowerCase().includes(searchText.toLowerCase()) ??
          false) ||
        commit.libraries.some((lib) =>
          lib.name.toLowerCase().includes(searchText.toLowerCase()),
        )

      const matchesAuthor =
        authorFilter === null ||
        (authorFilter === 'local' && (commit.author ?? '') === '') ||
        commit.author === authorFilter

      return matchesSearch && matchesAuthor
    })

    // Apply minify logic if enabled
    let displayCommits = filteredCommits
    if (minifyGraph) {
      // Build parent-child relationships
      const childrenMap = new Map<string, Commit[]>()
      filteredCommits.forEach((commit) => {
        if (commit.parent) {
          const parentKey = commit.parent.toHex()
          if (!childrenMap.has(parentKey)) {
            childrenMap.set(parentKey, [])
          }
          childrenMap.get(parentKey)!.push(commit)
        }
      })

      // Identify commits to keep:
      // 1. Commits with bookmarks (always keep)
      // 2. Leaf nodes (no children)
      // 3. Branch points (multiple children)
      // 4. Root commits (no parent)
      const commitsToKeep = new Set<string>()

      filteredCommits.forEach((commit) => {
        const commitKey = commit.hash.toHex()
        const children = childrenMap.get(commitKey) ?? []
        const bookmarks = vcs.bookmarks.bookmarkLookup(commit.hash)

        // Keep if it has bookmarks
        if (bookmarks && bookmarks.length > 0) {
          commitsToKeep.add(commitKey)
        }
        // Keep if it's a leaf node (no children)
        else if (children.length === 0) {
          commitsToKeep.add(commitKey)
        }
        // Keep if it's a branch point (multiple children)
        else if (children.length > 1) {
          commitsToKeep.add(commitKey)
        }
        // Keep if it's a root commit (no parent)
        else if (!commit.parent) {
          commitsToKeep.add(commitKey)
        }
      })

      displayCommits = filteredCommits.filter((commit) =>
        commitsToKeep.has(commit.hash.toHex()),
      )
    }

    const width = svgRef.current.clientWidth
    const height = svgRef.current.clientHeight

    // Create a map for quick lookup
    const commitMap = new Map<string, CommitNode>()

    // Create virtual root node (fixed at center)
    const rootNode: CommitNode = {
      id: '__root__',
      commit: null,
      bookmarks: [],
      x: width / 2,
      y: height / 2,
      fx: width / 2, // Fix x position
      fy: height / 2, // Fix y position
    }
    commitMap.set(rootNode.id, rootNode)

    // Add all display commits
    displayCommits.forEach((commit) => {
      const bookmarks = vcs.bookmarks.bookmarkLookup(commit.hash)
      commitMap.set(commit.hash.toHex(), {
        id: commit.hash.toHex(),
        commit,
        bookmarks: bookmarks?.map((b) => b.name) ?? [],
        x: 0,
        y: 0,
      })
    })

    // Create links based on parent relationships
    const links: CommitLink[] = []
    const childrenByParent = new Map<string, CommitNode[]>()

    // Helper function to find the nearest visible ancestor
    const findNearestVisibleAncestor = (
      commit: Commit,
    ): { node: CommitNode; intermediateCount: number } | null => {
      let current = commit.parent
      let count = 0

      while (current) {
        const ancestorNode = commitMap.get(current.toHex())
        if (ancestorNode) {
          return { node: ancestorNode, intermediateCount: count }
        }

        // Find the parent of this intermediate commit
        const intermediateCommit = filteredCommits.find(
          (c) => c.hash.toHex() === current!.toHex(),
        )
        if (!intermediateCommit?.parent) {
          break
        }

        current = intermediateCommit.parent
        count++
      }

      return null
    }

    displayCommits.forEach((commit) => {
      const childNode = commitMap.get(commit.hash.toHex())
      if (!childNode) return

      if (commit.parent) {
        const parentNode = commitMap.get(commit.parent.toHex())
        if (parentNode) {
          // Direct parent is visible
          links.push({
            source: parentNode,
            target: childNode,
            intermediateCount: 0,
          })

          // Track children for radial positioning
          const parentId = commit.parent.toHex()
          if (!childrenByParent.has(parentId)) {
            childrenByParent.set(parentId, [])
          }
          childrenByParent.get(parentId)!.push(childNode)
        } else {
          // Parent is not visible, find the nearest visible ancestor
          const ancestorResult = findNearestVisibleAncestor(commit)
          if (ancestorResult) {
            links.push({
              source: ancestorResult.node,
              target: childNode,
              intermediateCount: ancestorResult.intermediateCount,
            })

            // Track children for radial positioning
            if (!childrenByParent.has(ancestorResult.node.id)) {
              childrenByParent.set(ancestorResult.node.id, [])
            }
            childrenByParent.get(ancestorResult.node.id)!.push(childNode)
          } else {
            // No visible ancestor, connect to root
            links.push({
              source: rootNode,
              target: childNode,
              intermediateCount: 0,
            })

            if (!childrenByParent.has(rootNode.id)) {
              childrenByParent.set(rootNode.id, [])
            }
            childrenByParent.get(rootNode.id)!.push(childNode)
          }
        }
      } else {
        // Connect commits without parents to the virtual root
        links.push({
          source: rootNode,
          target: childNode,
          intermediateCount: 0,
        })

        // Track root children
        if (!childrenByParent.has(rootNode.id)) {
          childrenByParent.set(rootNode.id, [])
        }
        childrenByParent.get(rootNode.id)!.push(childNode)
      }
    })

    const nodes = Array.from(commitMap.values())

    // Clear previous SVG content
    d3.select(svgRef.current).selectAll('*').remove()

    const svg = d3
      .select(svgRef.current)
      .attr('width', width)
      .attr('height', height)

    // Create arrow marker for links
    svg
      .append('defs')
      .append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '-0 -5 10 10')
      .attr('refX', 20)
      .attr('refY', 0)
      .attr('orient', 'auto')
      .attr('markerWidth', 8)
      .attr('markerHeight', 8)
      .append('svg:path')
      .attr('d', 'M 0,-5 L 10,0 L 0,5')
      .attr('fill', '#999')

    const g = svg.append('g')

    // Helper function to calculate depth from root
    const calculateDepth = (d: CommitNode): number => {
      if (d.id === '__root__') return 0
      let depth = 1
      let current = d
      const visited = new Set<string>()

      while (current.id !== '__root__' && !visited.has(current.id)) {
        visited.add(current.id)
        const parentLink = links.find((l) => l.target.id === current.id)
        if (!parentLink) break
        current = parentLink.source
        depth++
      }

      return depth
    }

    // Use radial force to push nodes outward from root
    const simulation = d3
      .forceSimulation(nodes)
      .force(
        'link',
        d3
          .forceLink<CommitNode, CommitLink>(links)
          .id((d) => d.id)
          .distance(minifyGraph ? 80 : 10)
          .strength(1.8)
          .iterations(3), // Multiple constraint iterations for better satisfaction
      )
      .force(
        'charge',
        d3
          .forceManyBody()
          .strength(-300) // Increased repulsion to spread nodes more
          .distanceMax(200), // Increased range of repulsion
      )
      .force('x', d3.forceX(width / 2).strength(0.02)) // Weaker centering
      .force('y', d3.forceY(height / 2).strength(0.02)) // Weaker centering
      .force(
        'radial',
        d3
          .forceRadial<CommitNode>(
            (d) => calculateDepth(d) * 120, // Increased from 80 to 120 pixels per level
            width / 2,
            height / 2,
          )
          .strength(1.2), // Stronger radial force to push nodes outward
      )
      .force(
        'charge',
        d3
          .forceManyBody()
          .strength(-300) // Increased repulsion to spread nodes more
          .distanceMax(200), // Increased range of repulsion
      )
      .force('x', d3.forceX(width / 2).strength(0.02)) // Weaker centering
      .force('y', d3.forceY(height / 2).strength(0.02)) // Weaker centering
      .force(
        'radial',
        d3
          .forceRadial<CommitNode>(
            (d) => calculateDepth(d) * 120, // Increased from 80 to 120 pixels per level
            width / 2,
            height / 2,
          )
          .strength(1.2), // Stronger radial force to push nodes outward
      )
      .force(
        'collision',
        d3
          .forceCollide()
          .radius((d) => {
            const node = d as CommitNode
            if (node.commit === null) return 15
            if (node.bookmarks.length > 0) return 20
            return 20
          })
          .strength(0.8),
      )
      .alpha(1)
      // .alphaDecay(0.003)
      .velocityDecay(0.5) // High damping to reduce oscillations
      .stop()

    // Run the simulation to completion without animation
    // More iterations for better convergence and equal spacing
    for (let i = 0; i < 100; ++i) simulation.tick()

    // Add zoom behavior
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 8])
      .on('zoom', (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
        g.attr('transform', event.transform.toString())
      })

    svg.call(zoom)

    // Set initial transform to center on focused commit or root
    let initialTransform = d3.zoomIdentity

    if (focusedCommitHash !== null) {
      const focusedNode = nodes.find((n) => n.id === focusedCommitHash)
      if (focusedNode) {
        // Zoom in and center on the focused commit
        const scale = 1.5
        initialTransform = d3.zoomIdentity
          .translate(width / 2, height / 2)
          .scale(scale)
          .translate(-focusedNode.x, -focusedNode.y)
      }
    }

    svg
      .transition()
      .duration(focusedCommitHash !== null ? 750 : 0)
      .call(zoom.transform.bind(zoom), initialTransform)

    // Draw links
    const link = g
      .append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', '#999')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', (d) => (d.intermediateCount > 0 ? 1 : 2))
      .attr('stroke-dasharray', (d) => (d.intermediateCount > 0 ? '5,5' : '0'))

    // Draw nodes
    const node = g
      .append('g')
      .selectAll('circle')
      .data(nodes)
      .join('circle')
      .attr('r', (d) => {
        if (d.commit === null) return 11
        if (d.bookmarks.length > 0) return 9
        return 10
      })
      .attr('fill', (d) => {
        if (d.commit === null) return '#000' // gray for virtual root
        if (d.bookmarks.length > 0) return '#fff'
        if (vcs.head?.hash.toHex() === d.id) return '#2196f3' // blue for HEAD
        if ((d.commit.author ?? '') !== '') return '#4caf50' // green for authored
        return '#ff9800' // orange for local
      })
      .attr('stroke', (d) => {
        if (d.commit === null) return '#fff'
        if (d.bookmarks.length > 0) {
          // Use appropriate color for bookmarked commits
          if (vcs.head?.hash.toHex() === d.id) return '#2196f3' // blue for HEAD
          if ((d.commit.author ?? '') !== '') return '#4caf50' // green for authored
          return '#ff9800' // orange for local
        }
        return '#fff'
      })
      .attr('stroke-width', (d) => (d.bookmarks.length > 0 ? 4 : 2))
      .style('cursor', (d) => (d.commit === null ? 'default' : 'pointer'))
      .on('click', (_event, d) => {
        if (d.commit) setSelectedCommit(d.commit)
      })

    // Add labels
    const label = g
      .append('g')
      .selectAll('text')
      .data(nodes)
      .join('text')
      .text((d) => {
        if (d.commit === null) return ''
        if (d.bookmarks.length > 0) return d.bookmarks[0]!
        return d.commit.hash.toHex().substring(0, 7)
      })
      .attr('font-size', 10)
      .attr('dx', 12)
      .attr('dy', 4)
      .style('pointer-events', 'none')
      .style('user-select', 'none')

    // Add link labels for intermediate counts
    const linkLabel = g
      .append('g')
      .selectAll('text')
      .data(links.filter((d) => d.intermediateCount > 0))
      .join('text')
      .text((d) => `+${d.intermediateCount}`)
      .attr('font-size', 9)
      .attr('fill', '#666')
      .attr('text-anchor', 'middle')
      .style('pointer-events', 'none')
      .style('user-select', 'none')

    // Set initial positions after simulation completes
    link
      .attr('x1', (d) => d.source.x)
      .attr('y1', (d) => d.source.y)
      .attr('x2', (d) => d.target.x)
      .attr('y2', (d) => d.target.y)

    node.attr('cx', (d) => d.x).attr('cy', (d) => d.y)

    label.attr('x', (d) => d.x).attr('y', (d) => d.y)

    linkLabel
      .attr('x', (d) => (d.source.x + d.target.x) / 2)
      .attr('y', (d) => (d.source.y + d.target.y) / 2)
  }, [
    commits,
    searchText,
    authorFilter,
    focusedCommitHash,
    minifyGraph,
    hook,
    vcs.bookmarks,
    vcs.head?.hash,
  ])

  const uniqueAuthors = Array.from(
    new Set(commits.map((c) => c.author).filter((a) => (a ?? '') !== '')),
  )

  const handleCheckout = async (commit: Commit) => {
    await creagenEditor.new(commit.hash)
    logger.info('Successfully checked out commit', {
      hash: commit.hash.toHex(),
    })
  }

  const handleCheckoutBookmark = async (bookmark: string) => {
    const bm = vcs.bookmarks.getBookmark(bookmark)
    if (bm) {
      await creagenEditor.checkout(bm)
      logger.info('Successfully checked out bookmark', { bookmark })
      // Set the focused commit to the bookmark's commit
      setFocusedCommitHash(bm.commit.toHex())
    }
  }

  const handleCheckoutCommitWithActiveBookmark = async (commit: Commit) => {
    await creagenEditor.checkout(commit.hash)
    logger.info('Successfully checked out commit with active bookmark', {
      hash: commit.hash.toHex(),
      bookmark: vcs.activeBookmark.name,
    })
  }

  const handleCheckoutCommitAsBookmark = async (
    commit: Commit,
    bookmarkName: string,
  ) => {
    const bookmark = vcs.bookmarks.getBookmark(bookmarkName)
    if (bookmark) {
      await creagenEditor.checkout(bookmark)
      logger.info('Successfully checked out commit as bookmark', {
        hash: commit.hash.toHex(),
        bookmark: bookmarkName,
      })
      setFocusedCommitHash(commit.hash.toHex())
    }
    setCheckoutMenuAnchor(null)
  }

  const handleOpenCheckoutMenu = (
    event: React.MouseEvent<HTMLButtonElement>,
  ) => {
    setCheckoutMenuAnchor(event.currentTarget)
  }

  const handleCloseCheckoutMenu = () => {
    setCheckoutMenuAnchor(null)
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Stack spacing={1} sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <TextField
            size="small"
            placeholder="Search by hash, author, or library..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            fullWidth
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={minifyGraph}
                onChange={(e) => setMinifyGraph(e.target.checked)}
                size="small"
              />
            }
            label="Minify"
            sx={{ whiteSpace: 'nowrap' }}
          />
        </Box>
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
          {uniqueAuthors.map((author) => (
            <Chip
              key={author}
              label={author}
              onClick={() => setAuthorFilter(author!)}
              color={authorFilter === author ? 'primary' : 'default'}
              size="small"
            />
          ))}
        </Box>
      </Stack>

      {/* Bookmarks section */}
      {vcs.bookmarks.getBookmarks().length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Bookmarks
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            {vcs.bookmarks.getBookmarks().map((bookmark) => (
              <Chip
                key={bookmark.name}
                label={bookmark.name}
                onClick={() => {
                  handleCheckoutBookmark(bookmark.name).catch(console.error)
                }}
                color={
                  vcs.activeBookmark.name === bookmark.name
                    ? 'primary'
                    : 'default'
                }
                size="small"
                sx={{ cursor: 'pointer' }}
              />
            ))}
          </Box>
        </Box>
      )}

      {commits.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
          No commits found. Start creating commits to see the graph.
        </Typography>
      ) : (
        <Box sx={{ flex: 1, position: 'relative', minHeight: 0 }}>
          <svg
            ref={svgRef}
            style={{
              width: '100%',
              height: '100%',
              border: '1px solid #ccc',
              borderRadius: 4,
            }}
          />
        </Box>
      )}

      {selectedCommit && (
        <Box
          sx={{
            mt: 2,
            p: 2,
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 1,
            }}
          >
            <Typography variant="subtitle2">Selected Commit</Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              {(() => {
                const commitBookmarks = vcs.bookmarks.bookmarkLookup(
                  selectedCommit.hash,
                )
                if (commitBookmarks && commitBookmarks.length > 0) {
                  return (
                    <>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={handleOpenCheckoutMenu}
                        disabled={
                          vcs.head?.hash.toHex() === selectedCommit.hash.toHex()
                        }
                      >
                        Checkout as...
                      </Button>
                      <Menu
                        anchorEl={checkoutMenuAnchor}
                        open={Boolean(checkoutMenuAnchor)}
                        onClose={handleCloseCheckoutMenu}
                      >
                        <MenuItem
                          onClick={() => {
                            handleCheckoutCommitWithActiveBookmark(
                              selectedCommit,
                            ).catch(console.error)
                            handleCloseCheckoutMenu()
                          }}
                        >
                          {vcs.activeBookmark.name} (active)
                        </MenuItem>
                        {commitBookmarks.map((bookmark) => (
                          <MenuItem
                            key={bookmark.name}
                            onClick={() => {
                              handleCheckoutCommitAsBookmark(
                                selectedCommit,
                                bookmark.name,
                              ).catch(console.error)
                            }}
                          >
                            {bookmark.name}
                          </MenuItem>
                        ))}
                      </Menu>
                    </>
                  )
                } else {
                  return (
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => {
                        handleCheckoutCommitWithActiveBookmark(
                          selectedCommit,
                        ).catch(console.error)
                      }}
                      disabled={
                        vcs.head?.hash.toHex() === selectedCommit.hash.toHex()
                      }
                    >
                      Checkout as {vcs.activeBookmark.name}
                    </Button>
                  )
                }
              })()}
              <Button
                variant="contained"
                size="small"
                onClick={() => {
                  handleCheckout(selectedCommit).catch(console.error)
                }}
                disabled={
                  vcs.head?.hash.toHex() === selectedCommit.hash.toHex()
                }
              >
                {vcs.head?.hash.toHex() === selectedCommit.hash.toHex()
                  ? 'Current'
                  : 'Checkout'}
              </Button>
            </Box>
          </Box>
          <Typography variant="body2">
            <strong>Hash:</strong> {selectedCommit.hash.toHex()}
          </Typography>
          <Typography variant="body2">
            <strong>Author:</strong> {selectedCommit.author ?? 'local'}
          </Typography>
          <Typography variant="body2">
            <strong>Created:</strong>{' '}
            {selectedCommit.createdOn.toLocaleString()}
          </Typography>
          <Typography variant="body2">
            <strong>Editor Version:</strong>{' '}
            {selectedCommit.editorVersion.toString()}
          </Typography>
          <Typography variant="body2">
            <strong>Libraries:</strong>{' '}
            {selectedCommit.libraries.map((l) => l.name).join(', ') || 'None'}
          </Typography>
          {selectedCommit.parent && (
            <Typography variant="body2">
              <strong>Parent:</strong> {selectedCommit.parent.toHex()}
            </Typography>
          )}
          {(() => {
            const commitBookmarks = vcs.bookmarks.bookmarkLookup(
              selectedCommit.hash,
            )
            if (commitBookmarks && commitBookmarks.length > 0) {
              return (
                <Typography variant="body2">
                  <strong>Bookmarks:</strong>{' '}
                  {commitBookmarks.map((b) => b.name).join(', ')}
                </Typography>
              )
            }
            return null
          })()}
        </Box>
      )}
    </Box>
  )
}
