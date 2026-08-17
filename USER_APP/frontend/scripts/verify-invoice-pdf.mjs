// Verify the invoice PDF end-to-end: build the document definition via the
// real service module, render with pdfmake, then extract the actual text from
// the PDF (per-font CID decoding via each font's ToUnicode CMap) and assert
// every invoice field is present.
import { writeFileSync, readFileSync, rmSync } from 'node:fs'
import zlib from 'node:zlib'
import { buildInvoiceDocument } from '../src/services/invoice.js'
import pdfMake from 'pdfmake/build/pdfmake.js'
import vfsLite from '../src/services/vfs-lite.js'

pdfMake.addVirtualFileSystem(vfsLite)

const order = {
  id: 'LA4075',
  statusLabel: 'Delivered',
  pickup: '17 Aug 2026 · 4:00 PM – 6:00 PM',
  createdAt: 'Yesterday · 10:00 AM',
  placedAt: Date.UTC(2026, 7, 17, 4, 30),
  address: 'Home — Null, Underpass, NJP Railway Hospital, Siliguri, West Bengal, 734007',
  payment: 'Cash on delivery',
  total: 425,
  items: [
    { name: 'Mixed laundry', qty: 5, unit: 'kg', amount: 395 },
    { name: 'Iron Only', qty: 2, unit: 'pc', amount: 30 },
  ],
}
const user = { name: 'LaundryMan Customer' }

const run = async () => {
  const doc = buildInvoiceDocument(order, user)
  const buf = await pdfMake.createPdf(doc).getBuffer()
  writeFileSync('invoice-verify.pdf', buf)

  const { text, pageCount } = decodePdfText(buf.toString('latin1'))
  const checks = {
    validPdfHeader: buf.toString('latin1').startsWith('%PDF'),
    singleA4Page: pageCount === 1,
    sizeKB: Math.round(buf.length / 1024),
    invoiceTitle: text.includes('INVOICE'),
    invoiceNo: text.includes('INV-LA4075'),
    brand: text.includes('LaundryMan'),
    billTo: text.includes('BILL TO') && text.includes('LaundryMan Customer'),
    items: text.includes('Mixed laundry') && text.includes('Iron Only'),
    qty: text.includes('5 kg') && text.includes('2 pc'),
    unitPrices: text.includes('79 / kg') && text.includes('15 / pc'),
    totals: text.includes('425'),
    address: text.includes('Siliguri') && text.includes('734007'),
    paid: text.includes('PAID') && text.includes('Delivered'),
    pickup: text.includes('Pickup Window'),
    payment: text.includes('Cash on delivery'),
    thankYou: text.includes('Thank you for choosing LaundryMan'),
    tagline: text.includes('One Call, Clean It All'),
  }
  console.log(JSON.stringify(checks, null, 2))
  const failed = Object.entries(checks).filter(([k, v]) => v === false).map(([k]) => k)
  rmSync('invoice-verify.pdf')
  if (failed.length) {
    console.error('FAILED CHECKS:', failed.join(', '))
    process.exit(1)
  }
  console.log('All invoice PDF checks passed ✔')
}
run().catch((e) => { console.error('VERIFY FAILED:', e); process.exit(1) })

// --- minimal PDF text extraction ---
const inflate = (b) => { try { return zlib.inflateSync(b).toString('latin1') } catch { return null } }

// Extract the raw bytes of a stream from an object body (dict + stream + endstream).
const streamData = (body) => {
  const m = body.match(/stream(?:\r?\n|\r)([\s\S]*?)endstream/)
  return m ? Buffer.from(m[1], 'latin1') : null
}

function parseObjects(pdf) {
  // Split into "N 0 obj ... endobj" blocks, keeping the object number.
  const objs = new Map()
  const re = /(\d+)\s+0\s+obj\s+([\s\S]*?)\s+endobj/g
  let m
  while ((m = re.exec(pdf))) objs.set(Number(m[1]), m[2])
  return objs
}

// Decode one CMap stream into a CID -> unicode map.
function parseCmap(text) {
  const map = new Map()
  const hexVal = (h) => {
    const bytes = h.match(/.{1,4}/g).map((x) => parseInt(x, 16))
    return String.fromCodePoint(...bytes)
  }
  let mm
  const reChar = /beginbfchar([\s\S]*?)endbfchar/g
  while ((mm = reChar.exec(text))) {
    for (const p of mm[1].matchAll(/(<[0-9a-fA-F]+>)\s*(<[0-9a-fA-F]+>)/g)) {
      map.set(parseInt(p[1].slice(1, -1), 16), hexVal(p[2].slice(1, -1)))
    }
  }
  const reRange = /beginbfrange([\s\S]*?)endbfrange/g
  while ((mm = reRange.exec(text))) {
    // Form A: <lo> <hi> <dst>      Form B: <lo> <hi> [<d1> <d2> ...]
    // Single pass: Form B entries end with a '[' array, Form A with a single <hex>.
    for (const t of mm[1].matchAll(/(<[0-9a-fA-F]+>)\s*(<[0-9a-fA-F]+>)\s*(?:\[([\s\S]*?)\]|(<[0-9a-fA-F]+>))/g)) {
      const lo = parseInt(t[1].slice(1, -1), 16)
      const hi = parseInt(t[2].slice(1, -1), 16)
      if (t[3] !== undefined) {
        // Form B
        const vals = [...t[3].matchAll(/<([0-9a-fA-F]+)>/g)].map((v) => v[1])
        for (let i = 0; i <= hi - lo; i++) if (vals[i]) map.set(lo + i, hexVal(vals[i]))
      } else {
        // Form A
        const base = hexVal(t[4].slice(1, -1))
        for (let i = 0; i <= hi - lo; i++) map.set(lo + i, String.fromCodePoint(base.codePointAt(0) + i))
      }
    }
  }
  return map
}

function decodePdfText(pdf) {
  const objs = parseObjects(pdf)

  // Resource dictionaries: pure dicts listing /Font << /F1 <ref> /F2 <ref> >>
  const resources = new Map() // object num -> [[name, fontObjNum], ...]
  for (const [num, body] of objs) {
    const fm = body.match(/\/Font\s*<<([\s\S]*?)>>/)
    if (!fm || body.includes('stream')) continue
    const names = [...fm[1].matchAll(/\/F(\d+)\s+(\d+)\s+0\s+R/g)].map((x) => [`F${x[1]}`, Number(x[2])])
    if (names.length) resources.set(num, names)
  }

  // Font objects (Type0 with /ToUnicode): BaseFont -> cmap
  const fontCmaps = new Map()
  for (const body of objs.values()) {
    if (!body.includes('/Type /Font') || !body.includes('/ToUnicode')) continue
    const base = body.match(/\/BaseFont\s+\/([^\s/]+)/)?.[1]
    const toU = body.match(/\/ToUnicode\s+(\d+)\s+0\s+R/)
    if (!base || !toU) continue
    const cmapObj = objs.get(Number(toU[1]))
    const cmapStream = cmapObj ? inflate(streamData(cmapObj)) : null
  if (cmapStream) fontCmaps.set(base, parseCmap(cmapStream))
  }

  const pages = [] // decoded text per page, in order
  let out = ''
  for (const body of objs.values()) {
    if (!body.match(/\/Type \/Page(?:\s|$)/)) continue // real page, not /Type /Pages
    const resRef = body.match(/\/Resources\s+(\d+)\s+0\s+R/)
    const contRef = body.match(/\/Contents\s+(\d+)\s+0\s+R/)
    if (!resRef || !contRef) continue
    const fonts = new Map() // resource name -> cmap
    for (const [name, fontObjNum] of resources.get(Number(resRef[1])) || []) {
      const fBody = objs.get(fontObjNum)
      const base = fBody?.match(/\/BaseFont\s+\/([^\s/]+)/)?.[1]
      if (base && fontCmaps.has(base)) fonts.set(name, fontCmaps.get(base))
    }
    const cObj = objs.get(Number(contRef[1]))
    const stream = cObj ? streamData(cObj) : null
    if (!stream) continue
    const decoded = inflate(stream) ?? stream.toString('latin1')
    const pageText = decodeContent(decoded, fonts)
    pages.push(pageText)
    out += pageText
  }
  return { text: out, pageCount: pages.length }
}

function decodeContent(content, fonts) {
  let out = ''
  let font = null
  let i = 0
  const n = content.length
  while (i < n) {
    const c = content[i]
    if (c === '/' && content.slice(i, i + 3).match(/^\/F\d/)) {
      const m = content.slice(i).match(/^\/F(\d+)\s+([\d.]+)\s+Tf/)
      if (m) { font = `F${m[1]}`; i += m[0].length; continue }
    }
    if (c === '[') {
      const end = content.indexOf(']', i)
      if (end === -1) break
      const run = content.slice(i + 1, end)
      let s = ''
      for (const m of run.matchAll(/<([0-9a-fA-F]+)>/g)) {
        // pdfmake packs multiple 2-byte CIDs into one <hex> token — split it.
        for (let k = 0; k + 4 <= m[1].length; k += 4) {
          const cid = parseInt(m[1].slice(k, k + 4), 16)
          s += (font && fonts.get(font))?.get(cid) ?? ''
        }
      }
      if (s) out += s
      i = end + 1
      continue
    }
    if (c === '(') {
      // simple string text
      let j = i + 1
      let s = ''
      while (j < n && content[j] !== ')') {
        if (content[j] === '\\') { j += 2; continue }
        s += content[j]
        j++
      }
      out += s
      i = j + 1
      continue
    }
    i++
  }
  return out
}
