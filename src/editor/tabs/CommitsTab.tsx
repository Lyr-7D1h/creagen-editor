import { Box, Stack, TextField, Chip, Typography, Button } from '@mui/material'
import React, { useState, useEffect, useRef } from 'react'
import { useCreagenEditor } from '../../creagen-editor/CreagenEditorView'
import { Commit } from '../../vcs/Commit'
import * as d3 from 'd3'
import { logger } from '../../logs/logger'

type CommitNode = {
  id: string
  commit: Commit
  x: number
  y: number
}

type CommitLink = {
  source: CommitNode
  target: CommitNode
  intermediateCount: number
}

export function CommitsTab() {
  const creagenEditor = useCreagenEditor()
  const vcs = creagenEditor.vcs
  const svgRef = useRef<SVGSVGElement>(null)
  const [commits, setCommits] = useState<Commit[]>([])
  const [searchText, setSearchText] = useState('')
  const [authorFilter, setAuthorFilter] = useState<string | null>(null)
  const [selectedCommit, setSelectedCommit] = useState<Commit | null>(null)

  useEffect(() => {
    vcs.getAllCommits().then(setCommits).catch(console.error)
  }, [vcs])

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

    // Build child count map to identify branch points and leaf nodes
    const childrenMap = new Map<string, string[]>()
    filteredCommits.forEach((commit) => {
      if (commit.parent) {
        const parentHash = commit.parent.toHex()
        if (!childrenMap.has(parentHash)) {
          childrenMap.set(parentHash, [])
        }
        childrenMap.get(parentHash)!.push(commit.hash.toHex())
      }
    })

    // Filter to only show endpoint commits:
    // - HEAD (current commit)
    // - Leaf commits (no children)
    // - Root commits (no parent)
    // - Branch points (multiple children)
    const endpointCommits = filteredCommits.filter((commit) => {
      const hash = commit.hash.toHex()
      const isHead = vcs.head?.hash.toHex() === hash
      const isLeaf =
        !childrenMap.has(hash) || childrenMap.get(hash)!.length === 0
      const isRoot = !commit.parent
      const isBranchPoint =
        childrenMap.has(hash) && childrenMap.get(hash)!.length > 1

      return isHead || isLeaf || isRoot || isBranchPoint
    })

    // Create a map for quick lookup
    const commitMap = new Map<string, CommitNode>()
    endpointCommits.forEach((commit) => {
      commitMap.set(commit.hash.toHex(), {
        id: commit.hash.toHex(),
        commit,
        x: 0,
        y: 0,
      })
    })

    // Create links based on parent relationships, but connect through intermediate commits
    const links: CommitLink[] = []
    endpointCommits.forEach((commit) => {
      if (commit.parent) {
        // Find the nearest ancestor that's also an endpoint
        let currentParent = commit.parent.toHex()
        let ancestorCommit = filteredCommits.find(
          (c) => c.hash.toHex() === currentParent,
        )
        let intermediateCount = 0

        while (ancestorCommit && !commitMap.has(currentParent)) {
          intermediateCount++
          if (ancestorCommit.parent) {
            currentParent = ancestorCommit.parent.toHex()
            ancestorCommit = filteredCommits.find(
              (c) => c.hash.toHex() === currentParent,
            )
          } else {
            break
          }
        }

        const parentNode = commitMap.get(currentParent)
        const childNode = commitMap.get(commit.hash.toHex())
        if (parentNode && childNode) {
          links.push({
            source: parentNode,
            target: childNode,
            intermediateCount,
          })
        }
      }
    })

    const nodes = Array.from(commitMap.values())

    // Clear previous SVG content
    d3.select(svgRef.current).selectAll('*').remove()

    const width = svgRef.current.clientWidth
    const height = svgRef.current.clientHeight

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

    // Create force simulation
    const simulation = d3
      .forceSimulation(nodes)
      .force(
        'link',
        d3
          .forceLink<CommitNode, CommitLink>(links)
          .id((d) => d.id)
          .distance(100),
      )
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(30))

    // Add zoom behavior
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform)
      })

    svg.call(zoom as any)

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
      .attr('marker-end', 'url(#arrowhead)')

    // Add labels for links with intermediate commits
    const linkLabel = g
      .append('g')
      .selectAll('text')
      .data(links.filter((d) => d.intermediateCount > 0))
      .join('text')
      .text((d) => `+${d.intermediateCount}`)
      .attr('font-size', 10)
      .attr('fill', '#666')
      .attr('text-anchor', 'middle')
      .attr('dy', -5)
      .style('pointer-events', 'none')
      .style('user-select', 'none')

    // Draw nodes
    const node = g
      .append('g')
      .selectAll('circle')
      .data(nodes)
      .join('circle')
      .attr('r', 8)
      .attr('fill', (d) => {
        if (vcs.head?.hash.toHex() === d.id) return '#2196f3' // blue for HEAD
        if ((d.commit.author ?? '') !== '') return '#4caf50' // green for authored
        return '#ff9800' // orange for local
      })
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .on('click', (_event, d) => {
        setSelectedCommit(d.commit)
      })
      .call(
        d3
          .drag<SVGCircleElement, CommitNode>()
          .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart()
            d.x = event.x
            d.y = event.y
          })
          .on('drag', (event, d) => {
            d.x = event.x
            d.y = event.y
          })
          .on('end', (event) => {
            if (!event.active) simulation.alphaTarget(0)
          }) as any,
      )

    // Add labels
    const label = g
      .append('g')
      .selectAll('text')
      .data(nodes)
      .join('text')
      .text((d) => d.commit.hash.toHex().substring(0, 7))
      .attr('font-size', 10)
      .attr('dx', 12)
      .attr('dy', 4)
      .style('pointer-events', 'none')
      .style('user-select', 'none')

    // Update positions on simulation tick
    simulation.on('tick', () => {
      link
        .attr('x1', (d) => d.source.x)
        .attr('y1', (d) => d.source.y)
        .attr('x2', (d) => d.target.x)
        .attr('y2', (d) => d.target.y)

      linkLabel
        .attr('x', (d) => (d.source.x + d.target.x) / 2)
        .attr('y', (d) => (d.source.y + d.target.y) / 2)

      node.attr('cx', (d) => d.x).attr('cy', (d) => d.y)

      label.attr('x', (d) => d.x).attr('y', (d) => d.y)
    })

    return () => {
      simulation.stop()
    }
  }, [commits, searchText, authorFilter, vcs])

  const uniqueAuthors = Array.from(
    new Set(commits.map((c) => c.author).filter((a) => (a ?? '') !== '')),
  )

  const handleCheckout = async (commit: Commit) => {
    await creagenEditor.checkout(commit.hash)
    logger.info('Successfully checked out commit', {
      hash: commit.hash.toHex(),
    })
  }

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
            <Button
              variant="contained"
              size="small"
              onClick={() => {
                handleCheckout(selectedCommit).catch(console.error)
              }}
              disabled={vcs.head?.hash.toHex() === selectedCommit.hash.toHex()}
            >
              {vcs.head?.hash.toHex() === selectedCommit.hash.toHex()
                ? 'Current'
                : 'Checkout'}
            </Button>
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
        </Box>
      )}
    </Box>
  )
}
