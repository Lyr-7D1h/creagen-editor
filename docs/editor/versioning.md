# Versioning

Creagen Editor uses a commit-based version model designed for quick sketch iteration.

Every saved state is represented by a commit hash, and bookmarks are human-readable names that point to commits.

## How Versioning Works

1. You write code and choose libraries.
2. A commit stores:
	- code
	- editor version
	- dependency versions
	- author
3. A bookmark points to a commit and can move as you continue iterating.

## URL Version Types

Creagen supports three main URL styles:

1. Commit URL
	- `/<commitHash>`
	- Opens that exact commit with an uncommitted bookmark name automatically generated.

2. Bookmark URL
	- `/<username>/<bookmarkName>`
	- Opens the bookmark, which resolves to its current commit.

3. Share Payload URL
	- `/~<compressedPayload>`
	- Self-contained share link with code + metadata.
	- On open, the editor reconstructs this into a local commit/bookmark state.

## Public and Shareable by Default

All version URLs are shareable and publicly available by default.

- Commit metadata and commit blob data are served from public read endpoints.
- User bookmark read endpoints are public.
- Anyone with the link can open it.

There is currently no private-link mode for version URLs.

## Notes

- Creating cloud-persisted commits/bookmarks requires login, but reading shared version URLs does not.
