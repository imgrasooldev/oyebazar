/**
 * Markdown → PDF (Playwright se, jo repo mein pehle se hai).
 *
 * Kis liye: ACCESS.md team ko bhejni parti hai — nayi joining, accountant, ya koi
 * bahar ka banda jise GitHub ka access nahi. Markdown un ke liye kaam ka nahi.
 *
 * Koi nayi dependency nahi: converter chhota hai kyunke input hamara apna hai (hum
 * jaante hain is markdown mein kya aata hai). Aam markdown parser banane ki koshish
 * yahan nahi ki gayi — wo alag kaam hai.
 *
 * Chalayen:
 *   pnpm --filter @oyebazar/worker docs:pdf
 *   pnpm --filter @oyebazar/worker docs:pdf -- docs/ARCHITECTURE.md
 *
 * `PDF_PREVIEW=1` ek PNG bhi bana deta hai — PDF khole baghair dekhne ke liye ke
 * layout aur Urdu theek chhap rahi hai ya nahi.
 */
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { chromium } from 'playwright'

const REPO_ROOT = resolve(process.cwd(), '..', '..')
const input = process.argv[2] ?? 'docs/ACCESS.md'
const output = input.replace(/\.md$/, '.pdf')

/** HTML mein daalne se pehle — naam ya pate mein `<` aa sakta hai. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Ek line ke andar ka markdown: **bold**, `code`, [link](url). */
function inline(text: string): string {
  return escapeHtml(text)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
}

function tableRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\||\|$/g, '')
    .split('|')
    .map((cell) => cell.trim())
}

/** Sirf wo markdown jo hamari docs mein waqai istemal hoti hai. */
function toHtml(markdown: string): string {
  const lines = markdown.split('\n')
  const out: string[] = []

  let inCode = false
  let inTable = false
  let inList = false

  const closeList = () => {
    if (inList) {
      out.push('</ul>')
      inList = false
    }
  }
  const closeTable = () => {
    if (inTable) {
      out.push('</tbody></table>')
      inTable = false
    }
  }

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]!

    if (line.startsWith('```')) {
      closeList()
      closeTable()
      out.push(inCode ? '</pre>' : '<pre>')
      inCode = !inCode
      continue
    }
    if (inCode) {
      out.push(escapeHtml(line))
      continue
    }

    // Table: header, phir |---|---|, phir rows
    if (line.trim().startsWith('|')) {
      const next = lines[i + 1]?.trim() ?? ''
      if (!inTable && /^\|[\s:|-]+\|$/.test(next)) {
        closeList()
        const cells = tableRow(line).map((cell) => `<th>${inline(cell)}</th>`)
        out.push(`<table><thead><tr>${cells.join('')}</tr></thead><tbody>`)
        inTable = true
        i += 1 // separator line skip
        continue
      }
      if (inTable) {
        const cells = tableRow(line).map((cell) => `<td>${inline(cell)}</td>`)
        out.push(`<tr>${cells.join('')}</tr>`)
        continue
      }
    } else {
      closeTable()
    }

    if (/^#{1,4} /.test(line)) {
      closeList()
      const level = line.match(/^#+/)![0].length
      out.push(`<h${level}>${inline(line.replace(/^#+ /, ''))}</h${level}>`)
      continue
    }

    if (/^[-*] /.test(line)) {
      if (!inList) {
        out.push('<ul>')
        inList = true
      }
      out.push(`<li>${inline(line.replace(/^[-*] /, ''))}</li>`)
      continue
    }
    closeList()

    if (/^\d+\. /.test(line)) {
      out.push(`<p class="numbered">${inline(line)}</p>`)
      continue
    }

    if (line.trim() === '---') {
      out.push('<hr />')
      continue
    }

    if (line.trim() === '') {
      out.push('')
      continue
    }

    out.push(`<p>${inline(line)}</p>`)
  }

  closeList()
  closeTable()

  // Khali line par toote hue paragraph dobara jorna — markdown mein ek jumla
  // kai lines par likha hota hai
  return out
    .join('\n')
    .replace(/<\/p>\n<p>/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
}

const CSS = `
  /* Urdu ke liye Windows/Chromium ke apne fonts — koi CDN nahi, PDF har jagah ek jaisa */
  @page { size: A4; margin: 18mm 16mm; }
  body {
    font-family: 'Segoe UI', system-ui, sans-serif;
    color: #191A1D;
    line-height: 1.65;
    font-size: 10.5pt;
  }
  h1 { font-size: 20pt; margin: 0 0 4mm; color: #AE3F06; }
  h2 { font-size: 14pt; margin: 8mm 0 3mm; padding-top: 2mm; border-top: 1px solid #eee; }
  h3 { font-size: 11.5pt; margin: 5mm 0 2mm; }
  p { margin: 0 0 2.5mm; }
  code {
    font-family: Consolas, monospace;
    background: #F0EEEA;
    padding: 0.5mm 1.2mm;
    border-radius: 1mm;
    font-size: 9.5pt;
  }
  pre {
    background: #191A1D;
    color: #f5f5f5;
    padding: 3mm 4mm;
    border-radius: 2mm;
    font-family: Consolas, monospace;
    font-size: 9pt;
    line-height: 1.5;
    white-space: pre-wrap;
  }
  table { width: 100%; border-collapse: collapse; margin: 2mm 0 4mm; font-size: 9.5pt; }
  th, td { border: 1px solid #e3e0da; padding: 1.8mm 2.5mm; text-align: start; vertical-align: top; }
  th { background: #F7F6F4; font-weight: 700; }
  hr { border: 0; border-top: 1px solid #eee; margin: 6mm 0; }
  a { color: #AE3F06; text-decoration: none; }
  ul { margin: 0 0 3mm; padding-inline-start: 6mm; }
  li { margin-bottom: 1mm; }
  strong { font-weight: 700; }
  /* Table safhe ke beech se na toote */
  tr { break-inside: avoid; }
  h2, h3 { break-after: avoid; }
`

async function main(): Promise<void> {
  const markdown = await readFile(resolve(REPO_ROOT, input), 'utf8')
  const title = markdown.split('\n')[0]?.replace(/^#\s*/, '') ?? 'OyeBazar'

  const html = `<!doctype html>
<html lang="en" dir="ltr">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title)}</title>
    <style>${CSS}</style>
  </head>
  <body>${toHtml(markdown)}</body>
</html>`

  const browser = await chromium.launch()
  // A4 ki chaurai points mein — screenshot bhi wohi shakl dikhaye jo PDF mein jayegi
  const page = await browser.newPage({ viewport: { width: 794, height: 1123 } })
  await page.setContent(html, { waitUntil: 'load' })
  await page.evaluate(() => document.fonts.ready)

  if (process.env.PDF_PREVIEW === '1') {
    const preview = resolve(REPO_ROOT, output.replace(/\.pdf$/, '-preview.png'))
    await page.screenshot({ path: preview, fullPage: true })
    console.log(`  preview: ${preview}`)
  }

  const pdf = await page.pdf({
    format: 'A4',
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: '<span></span>',
    footerTemplate: `
      <div style="width:100%;font-size:8pt;color:#8C8E96;padding:0 16mm;display:flex;justify-content:space-between;">
        <span>OyeBazar — andaruni document</span>
        <span class="pageNumber"></span>
      </div>`,
    margin: { top: '18mm', bottom: '16mm', left: '16mm', right: '16mm' },
  })

  await browser.close()

  const target = resolve(REPO_ROOT, output)
  await writeFile(target, pdf)
  console.log(`✓ ${output} (${Math.round(pdf.byteLength / 1024)}KB)`)
}

main().catch((error: unknown) => {
  console.error('PDF nahi bana:', error)
  process.exit(1)
})
