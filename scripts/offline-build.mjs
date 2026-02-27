import fs from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { readMarkdown, walkMarkdownFiles } from "./lib/frontmatter.mjs"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, "..")
const contentDir = path.join(rootDir, "content")
const publicDir = path.join(rootDir, "public")

const NAV = [
  ["홈", "/"],
  ["공지", "/notices/"],
  ["수업자료", "/lessons/"],
  ["과제", "/assignments/"],
  ["일정", "/schedule/"],
  ["가정통신문", "/newsletters/"],
  ["FAQ", "/faq/"],
  ["자료실", "/resources/"],
  ["AI 수업도우미", "/ai-assistant/"],
]

await fs.rm(publicDir, { recursive: true, force: true })
await fs.mkdir(publicDir, { recursive: true })
await fs.writeFile(path.join(publicDir, "styles.css"), getCss(), "utf8")

const files = await walkMarkdownFiles(contentDir)
let builtCount = 0

for (const mdPath of files) {
  const relative = path.relative(contentDir, mdPath).replaceAll("\\", "/")
  const { frontmatter, body } = await readMarkdown(mdPath)

  if (!frontmatter || frontmatter.published === false) {
    continue
  }

  const htmlBody = markdownToHtml(body)
  const title = frontmatter.title ?? "학급 홈페이지"
  const currentRoute = toRoute(relative)
  const page = renderPage({
    title,
    htmlBody,
    frontmatter,
    currentRoute,
    isIndexPage: relative.endsWith("index.md"),
  })

  const outputPath = toOutputPath(relative)
  const outputDir = path.dirname(outputPath)
  await fs.mkdir(outputDir, { recursive: true })
  await fs.writeFile(outputPath, page, "utf8")
  builtCount += 1
}

console.log(`Offline build complete: ${builtCount} pages -> ${publicDir}`)

if (process.argv.includes("--watch")) {
  console.log("Watch mode is not implemented in offline scaffold. Re-run npm run build after edits.")
}

function toOutputPath(relative) {
  if (relative.endsWith("index.md")) {
    const dir = relative.slice(0, -"index.md".length)
    return path.join(publicDir, dir, "index.html")
  }
  return path.join(publicDir, relative.replace(/\.md$/, ".html"))
}

function toRoute(relative) {
  if (relative === "index.md") {
    return "/"
  }
  if (relative.endsWith("/index.md")) {
    const dir = relative.slice(0, -"index.md".length)
    return `/${dir}`
  }
  return `/${relative.replace(/\.md$/, ".html")}`
}

function renderPage({ title, htmlBody, frontmatter, currentRoute, isIndexPage }) {
  const tags = Array.isArray(frontmatter.tags) ? frontmatter.tags.join(", ") : ""
  const meta = [
    `<span>작성일: ${escapeHtml(frontmatter.date ?? "미기재")}</span>`,
    `<span>카테고리: ${escapeHtml(frontmatter.category ?? "미기재")}</span>`,
    tags ? `<span>태그: ${escapeHtml(tags)}</span>` : "",
  ].filter(Boolean).join(" · ")

  const nav = NAV.map(([label, href]) => {
    const active = isNavActive(currentRoute, href)
    const activeClass = active ? "nav-link is-active" : "nav-link"
    const ariaCurrent = active ? ' aria-current="page"' : ""
    return `<a class="${activeClass}" href="${href}"${ariaCurrent}>${escapeHtml(label)}</a>`
  }).join("")

  const pageClass = isIndexPage ? "page-index" : "page-entry"
  const categoryClass = `category-${slugifyClass(frontmatter.category ?? "general")}`

  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <link rel="stylesheet" href="/styles.css" />
</head>
<body class="${pageClass} ${categoryClass}">
  <a class="skip-link" href="#main-content">본문으로 건너뛰기</a>
  <header class="site-header">
    <div class="header-shell">
      <h1 class="site-title"><a href="/">우리 반 학급 홈페이지</a></h1>
      <nav class="site-nav" aria-label="학급 페이지 주요 섹션">${nav}</nav>
    </div>
  </header>
  <main id="main-content" class="site-main">
    <article class="content-sheet">
      <header class="article-header">
        <h2>${escapeHtml(title)}</h2>
        <p class="meta">${meta}</p>
      </header>
      <section class="article-body">
${htmlBody}
      </section>
    </article>
  </main>
</body>
</html>`
}

function isNavActive(currentRoute, href) {
  if (href === "/") {
    return currentRoute === "/"
  }
  return currentRoute === href || currentRoute.startsWith(href)
}

function slugifyClass(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "general"
}

function markdownToHtml(markdown) {
  const lines = markdown.split("\n")
  const html = []
  let listType = null
  let inQuote = false

  const closeList = () => {
    if (!listType) return
    html.push(`</${listType}>`)
    listType = null
  }

  const closeQuote = () => {
    if (!inQuote) return
    html.push("</blockquote>")
    inQuote = false
  }

  for (const line of lines) {
    const trimmed = line.trim()

    if (!trimmed) {
      closeList()
      closeQuote()
      html.push("")
      continue
    }

    const quoteMatch = line.match(/^\s*>\s?(.*)$/)
    if (quoteMatch) {
      closeList()
      if (!inQuote) {
        html.push("<blockquote>")
        inQuote = true
      }
      html.push(`<p>${inline(quoteMatch[1])}</p>`)
      continue
    }
    closeQuote()

    const unorderedMatch = line.match(/^\s*-\s+(.+)$/)
    if (unorderedMatch) {
      if (listType !== "ul") {
        closeList()
        html.push("<ul>")
        listType = "ul"
      }
      html.push(`<li>${inline(unorderedMatch[1])}</li>`)
      continue
    }

    const orderedMatch = line.match(/^\s*\d+\.\s+(.+)$/)
    if (orderedMatch) {
      if (listType !== "ol") {
        closeList()
        html.push("<ol>")
        listType = "ol"
      }
      html.push(`<li>${inline(orderedMatch[1])}</li>`)
      continue
    }

    closeList()

    if (/^###\s+/.test(trimmed)) {
      const headingText = trimmed.replace(/^###\s+/, "")
      html.push(`<h5 id="${escapeHtml(toHeadingId(headingText))}">${inline(headingText)}</h5>`)
      continue
    }

    if (/^##\s+/.test(trimmed)) {
      const headingText = trimmed.replace(/^##\s+/, "")
      html.push(`<h4 id="${escapeHtml(toHeadingId(headingText))}">${inline(headingText)}</h4>`)
      continue
    }

    if (/^#\s+/.test(trimmed)) {
      const headingText = trimmed.replace(/^#\s+/, "")
      html.push(`<h3 id="${escapeHtml(toHeadingId(headingText))}">${inline(headingText)}</h3>`)
      continue
    }

    html.push(`<p>${inline(trimmed)}</p>`)
  }

  closeList()
  closeQuote()

  return html.join("\n")
}

function inline(text) {
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>')
}

function toHeadingId(text) {
  const normalized = String(text)
    .trim()
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")

  return normalized || "section"
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function getCss() {
  return `
:root {
  color-scheme: light;
  --bg-canvas: #f3f7fb;
  --bg-top: #e6eef7;
  --bg-bottom: #edf7f3;
  --surface: #ffffff;
  --surface-muted: #f6fafd;
  --surface-emphasis: #eaf3fb;
  --text-strong: #12263a;
  --text-default: #2f4458;
  --text-muted: #587087;
  --border-soft: #d4e2ef;
  --border-strong: #b9cde0;
  --accent-blue: #1f5fae;
  --accent-blue-strong: #174b8b;
  --accent-blue-soft: #dce9f9;
  --accent-green: #1d7d67;
  --accent-green-strong: #145e4f;
  --accent-green-soft: #dbf0e8;
  --focus-ring: #0f766e;
  --focus-shadow: rgba(15, 118, 110, 0.3);
  --header-bg: rgba(243, 247, 251, 0.9);
  --shadow-sheet: 0 12px 30px rgba(18, 38, 58, 0.12);
  --shadow-card: 0 4px 14px rgba(18, 38, 58, 0.08);
}

@media (prefers-color-scheme: dark) {
  :root {
    color-scheme: dark;
    --bg-canvas: #0d1624;
    --bg-top: #102138;
    --bg-bottom: #102523;
    --surface: #122033;
    --surface-muted: #15263d;
    --surface-emphasis: #19314a;
    --text-strong: #e7f0fb;
    --text-default: #c2d4e7;
    --text-muted: #97aec4;
    --border-soft: #2a425f;
    --border-strong: #3d5878;
    --accent-blue: #8db7ff;
    --accent-blue-strong: #b2ceff;
    --accent-blue-soft: #1d3654;
    --accent-green: #72cfb2;
    --accent-green-strong: #9de4cf;
    --accent-green-soft: #173b35;
    --focus-ring: #6cdbc2;
    --focus-shadow: rgba(108, 219, 194, 0.34);
    --header-bg: rgba(13, 22, 36, 0.9);
    --shadow-sheet: 0 14px 38px rgba(3, 8, 15, 0.58);
    --shadow-card: 0 4px 14px rgba(4, 10, 18, 0.5);
  }
}

*,
*::before,
*::after {
  box-sizing: border-box;
}

html,
body {
  min-height: 100%;
}

body {
  margin: 0;
  font-family: "Pretendard Variable", "SUIT Variable", "Noto Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif;
  color: var(--text-default);
  line-height: 1.72;
  letter-spacing: 0.005em;
  background:
    radial-gradient(circle at 0% 0%, rgba(31, 95, 174, 0.12), transparent 38%),
    radial-gradient(circle at 100% 0%, rgba(29, 125, 103, 0.1), transparent 35%),
    linear-gradient(180deg, var(--bg-top) 0%, var(--bg-canvas) 32%, var(--bg-bottom) 100%);
}

.skip-link {
  position: fixed;
  left: 0.8rem;
  top: 0.8rem;
  z-index: 40;
  padding: 0.56rem 0.82rem;
  border-radius: 10px;
  background: var(--accent-blue);
  color: #ffffff;
  font-size: 0.86rem;
  font-weight: 700;
  text-decoration: none;
  transform: translateY(-180%);
  transition: transform 120ms ease;
}

.skip-link:focus-visible {
  transform: translateY(0);
  outline: 2px solid var(--focus-ring);
  outline-offset: 2px;
  box-shadow: 0 0 0 4px var(--focus-shadow);
}

.site-header {
  position: sticky;
  top: 0;
  z-index: 20;
  border-bottom: 1px solid var(--border-soft);
  backdrop-filter: blur(10px);
  background: var(--header-bg);
}

.header-shell {
  width: min(100%, 72rem);
  margin: 0 auto;
  padding: 0.92rem 0.9rem 1rem;
}

.site-title {
  margin: 0;
  font-size: 1.03rem;
  line-height: 1.3;
  font-weight: 700;
  letter-spacing: 0.01em;
}

.site-title a {
  color: var(--text-strong);
  text-decoration: none;
}

.site-title a:hover {
  color: var(--accent-blue-strong);
}

.site-nav {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.45rem;
  margin-top: 0.78rem;
}

.nav-link {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  min-height: 2.2rem;
  padding: 0.38rem 0.64rem;
  border-radius: 999px;
  border: 1px solid var(--border-soft);
  background: var(--surface-muted);
  color: var(--accent-blue);
  text-decoration: none;
  font-size: 0.88rem;
  font-weight: 600;
  transition: background-color 120ms ease, border-color 120ms ease, color 120ms ease, transform 120ms ease;
}

.nav-link:hover {
  background: var(--accent-blue-soft);
  border-color: var(--accent-blue);
  color: var(--accent-blue-strong);
}

.nav-link.is-active {
  background: var(--accent-green-soft);
  border-color: var(--accent-green);
  color: var(--accent-green-strong);
}

.site-main {
  width: min(100%, 64rem);
  margin: 1.05rem auto 0;
  padding: 0 0.85rem 2.4rem;
}

.content-sheet {
  background: var(--surface);
  border: 1px solid var(--border-soft);
  border-radius: 18px;
  overflow: hidden;
  box-shadow: var(--shadow-sheet);
}

.article-header {
  padding: 1.08rem 1rem 0.9rem;
  border-bottom: 1px solid var(--border-soft);
  background: linear-gradient(135deg, var(--surface-muted) 0%, var(--surface-emphasis) 100%);
}

.article-header h2 {
  margin: 0;
  color: var(--text-strong);
  font-size: clamp(1.2rem, 4.8vw, 1.6rem);
  line-height: 1.34;
  letter-spacing: -0.005em;
}

.meta {
  margin: 0.55rem 0 0;
  color: var(--text-muted);
  font-size: 0.89rem;
}

.article-body {
  padding: 1rem;
  display: grid;
  gap: 0.78rem;
}

.article-body > * {
  margin: 0;
}

.article-body p {
  color: var(--text-default);
  font-size: 0.99rem;
}

.article-body strong {
  color: var(--text-strong);
  font-weight: 700;
}

.article-body h3 {
  margin-top: 0.12rem;
  padding: 0.72rem 0.86rem;
  border: 1px solid var(--border-soft);
  border-radius: 12px;
  background: var(--surface-muted);
  color: var(--text-strong);
  font-size: 1.12rem;
  line-height: 1.42;
}

.article-body h4 {
  margin-top: 0.55rem;
  padding-left: 0.66rem;
  border-left: 4px solid var(--accent-blue);
  color: var(--accent-blue-strong);
  font-size: 1rem;
  font-weight: 700;
  line-height: 1.45;
}

.article-body h5 {
  margin-top: 0.52rem;
  margin-bottom: 0;
  padding: 0.68rem 0.86rem;
  border: 1px solid var(--border-soft);
  border-radius: 12px 12px 0 0;
  background: var(--surface-muted);
  color: var(--accent-green-strong);
  font-size: 0.95rem;
  line-height: 1.45;
}

.article-body h5 + ul,
.article-body h5 + ol {
  margin-top: 0;
  border: 1px solid var(--border-soft);
  border-top: 0;
  border-radius: 0 0 12px 12px;
  background: var(--surface);
  box-shadow: var(--shadow-card);
}

.article-body h4 + ul,
.article-body h4 + ol {
  border: 1px solid var(--border-soft);
  border-radius: 12px;
  background: var(--surface-muted);
}

ul,
ol {
  margin: 0.18rem 0 0.42rem;
  padding: 0.76rem 0.95rem 0.76rem 1.35rem;
  display: grid;
  gap: 0.38rem;
}

li {
  color: var(--text-default);
}

blockquote {
  margin: 0.12rem 0 0.35rem;
  padding: 0.82rem 0.94rem;
  border: 1px solid var(--border-soft);
  border-left: 4px solid var(--accent-green);
  border-radius: 12px;
  background: var(--surface-muted);
}

blockquote p {
  margin: 0;
  color: var(--text-strong);
  font-size: 0.95rem;
}

code {
  font-family: "JetBrains Mono", "D2Coding", "SFMono-Regular", Consolas, monospace;
  font-size: 0.9em;
  padding: 0.08em 0.36em;
  border-radius: 6px;
  color: var(--accent-blue-strong);
  background: var(--accent-blue-soft);
}

a {
  color: var(--accent-blue);
  font-weight: 600;
  text-decoration-thickness: 0.09em;
  text-underline-offset: 0.18em;
}

a:hover {
  color: var(--accent-green);
}

a:focus-visible,
button:focus-visible,
.nav-link:focus-visible {
  outline: 2px solid var(--focus-ring);
  outline-offset: 2px;
  box-shadow: 0 0 0 4px var(--focus-shadow);
}

.page-index .article-body h3 + p {
  padding: 0.8rem 0.86rem;
  border: 1px solid var(--border-soft);
  border-radius: 12px;
  background: var(--surface-muted);
}

@media (min-width: 700px) {
  .header-shell {
    padding: 1rem 1.2rem 1.08rem;
  }

  .site-nav {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .nav-link {
    font-size: 0.9rem;
    padding: 0.42rem 0.78rem;
  }

  .site-main {
    margin-top: 1.4rem;
    padding: 0 1.2rem 2.8rem;
  }

  .article-header {
    padding: 1.3rem 1.3rem 1rem;
  }

  .article-body {
    padding: 1.25rem 1.3rem 1.4rem;
    gap: 0.9rem;
  }

  .article-body h3 {
    font-size: 1.22rem;
  }
}

@media (min-width: 1024px) {
  .site-main {
    margin-top: 1.7rem;
  }

  .article-header h2 {
    font-size: 1.75rem;
  }

  .article-body {
    padding: 1.45rem 1.55rem 1.7rem;
  }
}
`
}
