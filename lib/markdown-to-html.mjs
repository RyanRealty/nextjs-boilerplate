/**
 * Ryan Realty — lightweight Markdown-to-HTML converter.
 *
 * Handles: h1/h2/h3, **bold**, *italic*, [links](url), `code`, ```code blocks```,
 * > blockquotes, ![images](url), numbered lists, bulleted lists, blank-line
 * paragraphs, <!-- html comments --> pass-through, raw <html> blocks.
 *
 * This is intentionally NOT a full CommonMark implementation. It covers exactly
 * the markdown patterns produced by build-blog-post.mjs. No external deps.
 *
 * Usage:
 *   import { markdownToHtml } from './lib/markdown-to-html.mjs'
 *   const html = markdownToHtml(markdownString)
 */

/**
 * Convert a markdown string to HTML.
 *
 * @param {string} markdown
 * @returns {string} html
 */
export function markdownToHtml(markdown) {
  if (!markdown || typeof markdown !== 'string') return ''

  // Normalise line endings
  let text = markdown.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

  // Split into blocks (blank-line-separated) but preserve fenced code blocks
  // so their internal newlines don't get split.
  const blocks = splitBlocks(text)
  const htmlParts = blocks.map(block => processBlock(block.trim())).filter(Boolean)
  return htmlParts.join('\n')
}

// ---------------------------------------------------------------------------
// Block splitting
// ---------------------------------------------------------------------------

function splitBlocks(text) {
  const blocks = []
  let current = []
  let inFence = false

  for (const line of text.split('\n')) {
    const fenceMatch = line.match(/^```/)
    if (fenceMatch) {
      inFence = !inFence
      current.push(line)
      if (!inFence) {
        blocks.push(current.join('\n'))
        current = []
      }
      continue
    }

    if (inFence) {
      current.push(line)
      continue
    }

    if (line.trim() === '') {
      if (current.length > 0) {
        blocks.push(current.join('\n'))
        current = []
      }
    } else {
      current.push(line)
    }
  }

  if (current.length > 0) blocks.push(current.join('\n'))
  return blocks.filter(b => b.trim())
}

// ---------------------------------------------------------------------------
// Block-level processing
// ---------------------------------------------------------------------------

function processBlock(block) {
  // Pass through raw HTML blocks (including <!-- comments --> and <script> blocks)
  if (/^<!--/.test(block) || /^<[a-z]/.test(block) || /^<\/[a-z]/.test(block)) {
    return block
  }

  // Fenced code block ``` ... ```
  const fenceMatch = block.match(/^```(\w*)\n?([\s\S]*?)\n?```$/)
  if (fenceMatch) {
    const lang = fenceMatch[1] ? ` class="language-${escapeHtml(fenceMatch[1])}"` : ''
    return `<pre><code${lang}>${escapeHtml(fenceMatch[2])}</code></pre>`
  }

  // Headings
  const h1Match = block.match(/^# (.+)$/)
  if (h1Match) return `<h1>${inlineMarkdown(h1Match[1])}</h1>`

  const h2Match = block.match(/^## (.+)$/)
  if (h2Match) return `<h2>${inlineMarkdown(h2Match[1])}</h2>`

  const h3Match = block.match(/^### (.+)$/)
  if (h3Match) return `<h3>${inlineMarkdown(h3Match[1])}</h3>`

  const h4Match = block.match(/^#### (.+)$/)
  if (h4Match) return `<h4>${inlineMarkdown(h4Match[1])}</h4>`

  // Horizontal rule
  if (/^---+$/.test(block) || /^\*\*\*+$/.test(block)) {
    return '<hr>'
  }

  // Blockquote
  if (/^> /.test(block)) {
    const content = block.split('\n').map(line => line.replace(/^> ?/, '')).join('\n')
    return `<blockquote>${markdownToHtml(content)}</blockquote>`
  }

  // Numbered list
  if (/^\d+\. /.test(block)) {
    return buildList(block, 'ol', /^\d+\. /)
  }

  // Unordered list (-, *, +)
  if (/^[-*+] /.test(block)) {
    return buildList(block, 'ul', /^[-*+] /)
  }

  // Single-line image (standalone, not inline)
  const imgMatch = block.match(/^!\[([^\]]*)\]\(([^)]+)\)$/)
  if (imgMatch) {
    const alt = escapeAttr(imgMatch[1])
    const src = escapeAttr(imgMatch[2])
    return `<figure><img src="${src}" alt="${alt}" loading="lazy"></figure>`
  }

  // Paragraph (default)
  const lines = block.split('\n').map(l => l.trim()).filter(Boolean)
  if (lines.length === 0) return ''
  return `<p>${lines.map(inlineMarkdown).join(' ')}</p>`
}

// ---------------------------------------------------------------------------
// List builder
// ---------------------------------------------------------------------------

function buildList(block, tag, itemPattern) {
  const lines = block.split('\n')
  const items = []
  let current = null

  for (const line of lines) {
    if (itemPattern.test(line)) {
      if (current !== null) items.push(current)
      current = line.replace(itemPattern, '').trim()
    } else if (current !== null) {
      // Continuation line — append to last item
      current += ' ' + line.trim()
    }
  }
  if (current !== null) items.push(current)

  const listItems = items.map(item => `  <li>${inlineMarkdown(item)}</li>`).join('\n')
  return `<${tag}>\n${listItems}\n</${tag}>`
}

// ---------------------------------------------------------------------------
// Inline markdown (applied within a block)
// ---------------------------------------------------------------------------

function inlineMarkdown(text) {
  // Preserve raw HTML inline
  // Process in order: code spans first (so they don't get processed further),
  // then images, links, bold, italic.

  // Code spans
  text = text.replace(/`([^`]+)`/g, (_, code) => `<code>${escapeHtml(code)}</code>`)

  // Images (inline form, e.g. inside a paragraph)
  text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, src) => {
    return `<img src="${escapeAttr(src)}" alt="${escapeAttr(alt)}" loading="lazy">`
  })

  // Links
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, linkText, href) => {
    const isExternal = /^https?:\/\//.test(href) && !href.includes('ryan-realty.com')
    const rel = isExternal ? ' rel="noopener nofollow"' : ''
    const target = isExternal ? ' target="_blank"' : ''
    return `<a href="${escapeAttr(href)}"${target}${rel}>${linkText}</a>`
  })

  // Bold+italic (***text***)
  text = text.replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>')

  // Bold (**text**)
  text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')

  // Italic (*text* or _text_) — avoid matching already-replaced **
  text = text.replace(/\*([^*\n]+)\*/g, '<em>$1</em>')
  text = text.replace(/_([^_\n]+)_/g, '<em>$1</em>')

  // Line breaks: two trailing spaces + newline → <br>
  text = text.replace(/  \n/g, '<br>\n')

  return text
}

// ---------------------------------------------------------------------------
// Escape helpers
// ---------------------------------------------------------------------------

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function escapeAttr(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

// ---------------------------------------------------------------------------
// CLI self-test
// ---------------------------------------------------------------------------

const isMain = process.argv[1] && (await import('node:url')).fileURLToPath(import.meta.url) === process.argv[1]
if (isMain) {
  const sample = `# Test Heading

This is a **bold** word and an *italic* one.

## Second Heading

A [link to Ryan Realty](https://ryan-realty.com) and an [external site](https://example.com).

\`\`\`js
const x = 1;
console.log(x);
\`\`\`

> Blockquote paragraph here.

- Bullet one
- Bullet two with \`inline code\`
- Bullet three

1. First item
2. Second item **bold**
3. Third item with a [link](https://ryan-realty.com/page)

![Alt text for image](https://ryan-realty.com/wp-content/image.jpg)

<!-- citation: median price — Supabase market_stats_cache, geo_slug=bend, period_start=2026-04-01 -->

Paragraph with units: $699,000 median, 46 days, 98.5% sale-to-list.
`

  const { markdownToHtml } = await import('./markdown-to-html.mjs')
  console.log(markdownToHtml(sample))
}
