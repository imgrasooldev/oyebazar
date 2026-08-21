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

  /*
   * Blockquote — wo khaana jis mein sab se ahem baat likhi jati hai.
   *
   * Pehle converter ise samajhta hi nahi tha: `>` wali lines saada paragraph ban kar
   * chhap jati thin, `>` ke nishan samet. Yani jo baat sab se numaya honi chahiye thi wo
   * sab se ganda dikh rahi thi.
   */
  let inQuote = false
  const closeQuote = () => {
    if (inQuote) {
      out.push('</blockquote>')
      inQuote = false
    }
  }

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]!

    if (!inCode && line.startsWith('>')) {
      closeList()
      closeTable()
      if (!inQuote) {
        out.push('<blockquote>')
        inQuote = true
      }

      const body = line.replace(/^>\s?/, '')
      if (!body.trim()) continue

      // Quote ke andar bhi unwan chal sakte hain
      if (/^#{1,4} /.test(body)) {
        const level = body.match(/^#+/)![0].length
        out.push(`<h${level}>${inline(body.replace(/^#+ /, ''))}</h${level}>`)
      } else {
        out.push(`<p>${inline(body)}</p>`)
      }
      continue
    }
    if (inQuote && !line.startsWith('>')) closeQuote()

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
  closeQuote()

  // Khali line par toote hue paragraph dobara jorna — markdown mein ek jumla
  // kai lines par likha hota hai
  return out
    .join('\n')
    .replace(/<\/p>\n<p>/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
}

const CSS = `
  /*
   * Urdu ke liye Windows/Chromium ke apne fonts — koi CDN nahi, PDF har jagah ek jaisa.
   *
   * Ye kaghaz par parha jata hai, screen par nahi: is liye numbers, jadwal aur unwan
   * screen wale andaz se alag bartay gaye hain. Chhapne ke baad "kaunsa number kis ka
   * hai" ek nazar mein pata chalna chahiye.
   */
  @page { size: A4; margin: 18mm 16mm; }

  body {
    font-family: 'Segoe UI', system-ui, sans-serif;
    color: #1B1830;
    line-height: 1.6;
    font-size: 10.5pt;
  }

  /* Pehla unwan — kaghaz ka sarwarq */
  h1 {
    font-size: 22pt;
    margin: 0 0 2mm;
    color: #AE3F06;
    letter-spacing: -0.2pt;
  }

  /*
   * Har bara unwan naye safhe par.
   * Kaghaz par section ka aadha hissa pichhle safhe par aur aadha agle par sab se buri
   * shakl hai — dhoondte waqt banda usay do jagah parhta hai.
   */
  h2 {
    font-size: 14pt;
    margin: 0 0 4mm;
    padding: 0 0 2mm;
    border-bottom: 2px solid #AE3F06;
    break-before: page;
    break-after: avoid;
  }
  h2:first-of-type { break-before: auto; }

  h3 {
    font-size: 11.5pt;
    margin: 6mm 0 2mm;
    color: #AE3F06;
    break-after: avoid;
  }

  p { margin: 0 0 2.5mm; }

  /* Number, phone aur code — hamesha ek jaisi chaurai, taake qatar mein mel khayen */
  code {
    font-family: Consolas, monospace;
    background: #FBF1E9;
    color: #8A3305;
    padding: 0.4mm 1.4mm;
    border-radius: 1mm;
    font-size: 9.5pt;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  pre {
    background: #1B1830;
    color: #F3F1FA;
    padding: 3mm 4mm;
    border-radius: 2mm;
    font-family: Consolas, monospace;
    font-size: 9pt;
    line-height: 1.5;
    white-space: pre-wrap;
    break-inside: avoid;
  }
  pre code { background: none; color: inherit; padding: 0; }

  table {
    width: 100%;
    border-collapse: collapse;
    margin: 2mm 0 5mm;
    font-size: 9.5pt;
    break-inside: avoid;
  }
  th, td { padding: 2mm 2.5mm; text-align: start; vertical-align: top; }
  th {
    background: #2A1B63;
    color: #fff;
    font-weight: 600;
    font-size: 9pt;
  }
  /* Ek qatar chhori, ek rangeen — bees qataron wali jadwal mein aankh nahi phisalti */
  tbody tr:nth-child(even) { background: #F7F6FB; }
  td { border-bottom: 1px solid #E7E4EF; }

  /* Nuqta-e-nazar wala khaana (blockquote) — kaghaz par sab se numaya cheez */
  blockquote {
    margin: 0 0 5mm;
    padding: 3.5mm 4mm;
    background: #FBF1E9;
    border-inline-start: 3pt solid #AE3F06;
    border-radius: 0 2mm 2mm 0;
    break-inside: avoid;
  }
  blockquote h3 { margin-top: 0; }
  blockquote p:last-child { margin-bottom: 0; }

  hr { border: 0; margin: 5mm 0; }
  a { color: #AE3F06; text-decoration: none; }
  ul, ol { margin: 0 0 3mm; padding-inline-start: 6mm; }
  li { margin-bottom: 1.2mm; }
  strong { font-weight: 700; }
  tr { break-inside: avoid; }
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
