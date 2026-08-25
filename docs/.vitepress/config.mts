import { defineConfig } from 'vitepress'
import { sidebar } from './sidebar'

const SITE_URL = process.env.DOCS_SITE_URL ?? 'https://creagen.dev/docs'
const SITE_TITLE = 'Creagen'
const SITE_DESCRIPTION = 'Documentation for Creagen and its Editor'

function toCanonicalUrl(relativePath: string): string {
  const normalizedPath = relativePath
    .replace(/(^|\/)index\.md$/, '$1')
    .replace(/\.md$/, '')
  const pathname = normalizedPath ? `/${normalizedPath}` : '/'

  return `${SITE_URL}${pathname}`
}

function pageTitle(frontmatterTitle?: string): string {
  if (!frontmatterTitle) {
    return SITE_TITLE
  }

  return `${frontmatterTitle} | ${SITE_TITLE}`
}

export default defineConfig({
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  lang: 'en-US',
  srcDir: '.',
  cleanUrls: true,
  lastUpdated: true,
  sitemap: {
    hostname: SITE_URL,
  },
  head: [
    ['link', { rel: 'icon', href: '/favicon.ico' }],
    ['meta', { name: 'robots', content: 'index,follow' }],
    ['meta', { property: 'og:site_name', content: SITE_TITLE }],
    ['meta', { name: 'twitter:card', content: 'summary' }],
  ],
  transformHead: ({ pageData }) => {
    const title = pageTitle(pageData.frontmatter.title)
    const description = pageData.frontmatter.description || SITE_DESCRIPTION
    const canonicalUrl = toCanonicalUrl(pageData.relativePath)

    return [
      ['link', { rel: 'canonical', href: canonicalUrl }],
      ['meta', { property: 'og:type', content: 'website' }],
      ['meta', { property: 'og:title', content: title }],
      ['meta', { property: 'og:description', content: description }],
      ['meta', { property: 'og:url', content: canonicalUrl }],
      ['meta', { name: 'twitter:title', content: title }],
      ['meta', { name: 'twitter:description', content: description }],
    ]
  },
  themeConfig: {
    logo: '/creagen-icon.png',
    logoLink: new URL(SITE_URL).origin,
    siteTitle: SITE_TITLE,
    nav: [
      {
        text: 'Editor',
        link: 'https://creagen.dev',
      },
    ],
    sidebar,
    socialLinks: [
      { icon: 'github', link: 'https://github.com/lyr-7d1h/creagen-editor' },
    ],
  },
})
