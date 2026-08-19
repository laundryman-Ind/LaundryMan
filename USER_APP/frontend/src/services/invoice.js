import { formatPrice } from '../data/mockData.js'
import { registerPlugin } from '@capacitor/core'

// A4 LaundryMan invoice rendered as a REAL PDF (selectable text, print-ready)
// via pdfmake. Only reachable for DELIVERED orders. pdfmake itself is loaded
// lazily (dynamic import) so the app's main bundle stays small.

// Design tokens — matches the A4 invoice design.
const C = {
  blue: '#3048ff',
  blueLight: '#eef1ff',
  blueLine: '#d9dfff',
  black: '#17191f',
  dark: '#0d1015',
  gray: '#6f747e',
  line: '#dedfe3',
  soft: '#f4f5f7',
  green: '#15744b',
  greenBg: '#d8f3e5',
  labelOnBlue: '#d3d9ff',
}

// Load the app icon (public/logo.png) and downscale it to a small square data
// URL so the PDF stays lightweight. Falls back to '' (plain "L" tile).
const loadLogo = () =>
  new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const size = 96
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')
        const s = Math.min(canvas.width / img.width, canvas.height / img.height)
        const w = img.width * s
        const h = img.height * s
        ctx.drawImage(img, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h)
        resolve(canvas.toDataURL('image/png'))
      } catch {
        resolve('')
      }
    }
    img.onerror = () => resolve('')
    img.src = '/logo.png'
  })

const formatDate = (ts) => {
  if (!ts) return ''
  try {
    return new Date(ts).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch {
    return ''
  }
}

// Build the pdfmake document definition for one order.
export const buildInvoiceDocument = (order, user, logo = '') => {
  const placed = order.placedAt ? formatDate(order.placedAt) : (order.createdAt || '')
  const items = order.items || []
  const subtotal = items.reduce((s, it) => s + (Number(it.amount) || 0), 0)
  const total = Number(order.total ?? subtotal) || 0

  // Address: "Home — line one, line two" → label + remaining lines
  const addressParts = String(order.address || '').split('—').map((p) => p.trim()).filter(Boolean)

  const brandLogo = logo
    ? { image: logo, width: 44, height: 44, alignment: 'center' }
    : { text: 'L', color: '#ffffff', fontSize: 22, bold: true, alignment: 'center', margin: [0, 9, 0, 0], width: 44, height: 44, background: C.blue }

  const itemRows = items.map((it) => {
    const qty = it.qty || 1
    const unitPrice = qty > 0 ? (Number(it.amount) || 0) / qty : 0
    const qtyLabel = it.unit ? `${qty} ${it.unit}` : String(qty)
    return [
      { stack: [
        { text: String(it.name || ''), bold: true, fontSize: 11 },
        { text: 'Laundry washing & processing service', fontSize: 8.5, color: C.gray, margin: [0, 3, 0, 0] },
      ] },
      { text: qtyLabel, alignment: 'right' },
      { text: `${formatPrice(unitPrice)}${it.unit ? ` / ${it.unit}` : ''}`, alignment: 'right' },
      { text: formatPrice(it.amount), alignment: 'right', bold: true },
    ]
  })

  return {
    pageSize: 'A4',
    pageMargins: [48, 48, 48, 74],
    defaultStyle: { font: 'Roboto', color: C.black, fontSize: 10 },

    footer: (currentPage, pageCount) => ({
      columns: [
        { stack: [
          { text: 'LaundryMan', bold: true, fontSize: 10, color: C.black },
          { text: 'One Call, Clean It All', fontSize: 8.5, color: C.gray, margin: [0, 2, 0, 0] },
          { text: 'Siliguri, West Bengal, India', fontSize: 8.5, color: C.gray, margin: [0, 2, 0, 0] },
        ] },
        { stack: [
          { text: 'Invoice Reference', bold: true, fontSize: 10, color: C.black, alignment: 'right' },
          { text: `#${order.id}`, fontSize: 8.5, color: C.gray, alignment: 'right', margin: [0, 2, 0, 0] },
          { text: `Generated: ${placed}`, fontSize: 8.5, color: C.gray, alignment: 'right', margin: [0, 2, 0, 0] },
        ] },
      ],
      margin: [48, 22, 48, 0],
    }),

    content: [
      // ---------- HEADER ----------
      {
        columns: [
          {
            columns: [
              brandLogo,
              { stack: [
          { text: 'LaundryMan', bold: true, fontSize: 25, color: C.black },
          { text: 'One Call, Clean It All', fontSize: 9, color: C.gray, margin: [0, 4, 0, 0] },
              ] },
            ],
            columnGap: 12,
          },
          { stack: [
            { text: 'INVOICE', bold: true, fontSize: 32, color: C.black, alignment: 'right' },
            { text: `Completed order · #${order.id}`, fontSize: 10, color: C.gray, alignment: 'right', margin: [0, 5, 0, 0] },
          ] },
        ],
        columnGap: 16,
      },
      { canvas: [{ type: 'rect', x: 0, y: 0, w: 499, h: 2.5, color: C.blue }], margin: [0, 16, 0, 0] },

      // ---------- BILL TO / INVOICE META ----------
      {
        columns: [
          {
            width: '*',
            stack: [
              { text: 'BILL TO', fontSize: 9, bold: true, color: C.gray, margin: [0, 0, 0, 7] },
              { text: user.name || 'LaundryMan Customer', bold: true, fontSize: 15, color: C.black, margin: [0, 0, 0, 5] },
              ...addressParts.map((p, i) => ({ text: p, fontSize: 10, color: '#42454b', margin: [0, 1.5, 0, 0] })),
            ],
          },
          {
            width: '*',
            table: {
              widths: ['*', '*'],
              body: [
                [{ text: 'Invoice No.', fontSize: 10, color: C.gray }, { text: `INV-${order.id}`, fontSize: 10, bold: true, alignment: 'right' }],
                [{ text: 'Order No.', fontSize: 10, color: C.gray }, { text: String(order.id), fontSize: 10, bold: true, alignment: 'right' }],
                [{ text: 'Invoice Date', fontSize: 10, color: C.gray }, { text: placed, fontSize: 10, bold: true, alignment: 'right' }],
                [{ text: 'Pickup Window', fontSize: 10, color: C.gray }, { text: order.pickup || placed, fontSize: 10, bold: true, alignment: 'right' }],
              ],
            },
            layout: { paddingTop: () => 4.5, paddingBottom: () => 4.5 },
          },
        ],
        columnGap: 55,
        margin: [0, 22, 0, 0],
      },

      // ---------- SUMMARY (4 boxes) ----------
      {
        table: {
          widths: ['*', '*', '*', '*'],
          body: [[
            { stack: [
              { text: 'INVOICE NO.', fontSize: 8, bold: true, color: C.labelOnBlue, margin: [0, 0, 0, 5] },
              { text: `INV-${order.id}`, fontSize: 13, bold: true, color: '#ffffff' },
            ], fillColor: C.blue, margin: [12, 11, 12, 11] },
            { stack: [
              { text: 'ORDER DATE', fontSize: 8, bold: true, color: C.labelOnBlue, margin: [0, 0, 0, 5] },
              { text: placed, fontSize: 13, bold: true, color: '#ffffff' },
            ], fillColor: C.blue, margin: [12, 11, 12, 11] },
            { stack: [
              { text: 'STATUS', fontSize: 8, bold: true, color: C.labelOnBlue, margin: [0, 0, 0, 5] },
              { text: 'Delivered', fontSize: 13, bold: true, color: '#ffffff' },
            ], fillColor: C.blue, margin: [12, 11, 12, 11] },
            { stack: [
              { text: 'TOTAL', fontSize: 8, bold: true, color: '#9aa0b4', margin: [0, 0, 0, 5] },
              { text: formatPrice(total), fontSize: 13, bold: true, color: '#ffffff' },
            ], fillColor: C.dark, margin: [12, 11, 12, 11] },
          ]],
        },
        layout: {
          paddingLeft: () => 0,
          paddingRight: () => 0,
          paddingTop: () => 0,
          paddingBottom: () => 0,
          hLineWidth: () => 0,
          vLineWidth: () => 0,
        },
        margin: [0, 20, 0, 0],
      },

      // ---------- SERVICES ----------
      { text: 'Services', bold: true, fontSize: 14, color: C.black, margin: [0, 18, 0, 8] },
      {
        table: {
          headerRows: 1,
          widths: ['*', 60, 85, 75],
          body: [
            [
              { text: 'DESCRIPTION', bold: true, fontSize: 9, color: '#373a40' },
              { text: 'QUANTITY', bold: true, fontSize: 9, color: '#373a40', alignment: 'right' },
              { text: 'UNIT PRICE', bold: true, fontSize: 9, color: '#373a40', alignment: 'right' },
              { text: 'AMOUNT', bold: true, fontSize: 9, color: '#373a40', alignment: 'right' },
            ],
            ...itemRows,
          ],
        },
        layout: {
          hLineColor: () => C.line,
          hLineWidth: () => 0.7,
          vLineWidth: () => 0,
          fillColor: (rowIndex) => (rowIndex === 0 ? C.soft : null),
          paddingTop: () => 10,
          paddingBottom: () => 10,
          paddingLeft: () => 8,
          paddingRight: () => 8,
        },
      },

      // ---------- TOTALS ----------
      {
        columns: [
          { width: '*', text: '' },
          {
            width: 240,
            table: {
              widths: ['*', '*'],
              body: [
                [{ text: 'Subtotal', fontSize: 11, color: C.gray }, { text: formatPrice(subtotal), fontSize: 11, bold: true, alignment: 'right' }],
                [{ text: 'Pickup & delivery', fontSize: 11, color: C.gray }, { text: 'Included', fontSize: 11, bold: true, alignment: 'right' }],
                [{ text: 'Total', fontSize: 17, bold: true, color: C.black }, { text: formatPrice(total), fontSize: 17, bold: true, color: C.black, alignment: 'right' }],
              ],
            },
            layout: {
              hLineColor: (i, node) => (i === node.table.body.length - 1 || i === node.table.body.length ? C.black : 'transparent'),
              hLineWidth: (i, node) => (i === node.table.body.length - 1 || i === node.table.body.length ? 1.5 : 0),
              vLineWidth: () => 0,
              paddingTop: () => 6,
              paddingBottom: () => 6,
              paddingLeft: () => 0,
              paddingRight: () => 0,
            },
            margin: [0, 10, 0, 0],
          },
        ],
      },

      // ---------- PAYMENT ----------
      {
        table: {
          widths: ['*', 'auto'],
          body: [[
            { text: [{ text: 'Payment Method: ', fontSize: 11, color: C.gray }, { text: String(order.payment || ''), fontSize: 11, bold: true, color: C.black }], margin: [14, 12, 14, 12] },
            { stack: [
              { text: 'AMOUNT PAID', fontSize: 9, bold: true, color: C.gray, alignment: 'right' },
              { text: formatPrice(total), fontSize: 17, bold: true, color: C.black, alignment: 'right', margin: [0, 3, 0, 0] },
            ], margin: [14, 12, 14, 12] },
          ]],
        },
        layout: {
          fillColor: () => C.blueLight,
          hLineColor: () => C.blueLine,
          hLineWidth: () => 0.8,
          vLineWidth: () => 0,
          paddingTop: () => 0,
          paddingBottom: () => 0,
          paddingLeft: () => 0,
          paddingRight: () => 0,
        },
        margin: [0, 18, 0, 0],
      },

      // ---------- COMPLETED ----------
      {
        table: {
          widths: ['auto', '*', 'auto'],
          body: [[
            { canvas: [
              // Vector check icon (drawn, not a font glyph — fonts lack '✓' and
              // render a tofu box in the PDF). Green circle + check mark.
              { type: 'circle', x: 0, y: 0, r1: 13, r2: 13, fillColor: C.greenBg, lineColor: C.greenBg },
              { type: 'line', x1: 7, y1: 13, x2: 11, y2: 17, lineWidth: 2.6, lineColor: C.green, lineCap: 'round' },
              { type: 'line', x1: 11, y1: 17, x2: 19, y2: 7, lineWidth: 2.6, lineColor: C.green, lineCap: 'round' },
            ], width: 30, margin: [8, 6, 8, 6] },
            { stack: [
              { text: 'Order delivered successfully', bold: true, fontSize: 11, color: C.black },
              { text: 'This invoice was generated after delivery was completed.', fontSize: 9, color: C.gray, margin: [0, 3, 0, 0] },
            ], margin: [0, 8, 0, 8] },
            { text: 'PAID', color: C.green, bold: true, fontSize: 9, background: C.greenBg, margin: [8, 9, 8, 9], alignment: 'center', width: 52 },
          ]],
        },
        layout: {
          hLineColor: () => '#d9dfe0',
          hLineWidth: () => 0.8,
          vLineWidth: () => 0,
          paddingTop: () => 0,
          paddingBottom: () => 0,
          paddingLeft: () => 0,
          paddingRight: () => 0,
        },
        margin: [0, 14, 0, 0],
      },

      // ---------- THANK YOU ----------
      { text: 'Thank you for choosing LaundryMan.', alignment: 'center', fontSize: 10, bold: true, color: C.gray, margin: [0, 20, 0, 2] },
      { text: 'Your neighborhood laundry partner.', alignment: 'center', fontSize: 10, bold: true, color: C.gray, margin: [0, 2, 0, 0] },
    ],
  }
}

// Helper to safely extract base64 from pdfmake document across all environments
const getPdfBase64 = async (pdf) => {
  try {
    const res = await pdf.getBase64()
    if (typeof res === 'string' && res.length > 0) return res
  } catch (e) {
    console.warn('pdf.getBase64() failed, trying getBlob() fallback:', e)
  }

  try {
    const blob = await pdf.getBlob()
    return await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        const dataUrl = reader.result || ''
        const base64 = String(dataUrl).split(',')[1] || ''
        if (base64) resolve(base64)
        else reject(new Error('FileReader returned empty base64'))
      }
      reader.onerror = (err) => reject(err || new Error('FileReader failed'))
      reader.readAsDataURL(blob)
    })
  } catch (e) {
    console.error('Failed to get PDF base64:', e)
    throw e
  }
}

// Generate and download the A4 PDF for a delivered order.
// In the browser, triggers a normal file download.
// In the Capacitor APK, saves the PDF into Documents/LaundryMan/invoice/
// (creating folders automatically) and posts a "Download complete" notification.
export const generateInvoicePdf = async (order, user) => {
  const logo = await loadLogo()
  // pdfmake + its trimmed font set (Roboto + Roboto Medium only)
  const [{ default: pdfMake }, { default: vfsLite }] = await Promise.all([
    import('pdfmake/build/pdfmake.js'),
    import('./vfs-lite.js'),
  ])
  pdfMake.addVirtualFileSystem(vfsLite)
  const doc = buildInvoiceDocument(order, user, logo)
  const pdf = pdfMake.createPdf(doc)

  const filename = `LaundryMan_Invoice_${order.id}.pdf`

  // Capacitor native app (APK) — save into Documents/LaundryMan/invoice/
  if (window.Capacitor?.isNativePlatform?.()) {
    const InvoiceDownloader = registerPlugin('InvoiceDownloader')

    // Show a "Saving invoice…" notification while the PDF generates (best effort)
    try {
      await InvoiceDownloader.showDownloading({ fileName: filename })
    } catch { /* ignore */ }

    const base64 = await getPdfBase64(pdf)

    try {
      const res = await InvoiceDownloader.savePdf({ data: base64, fileName: filename })
      return res
    } catch (err) {
      console.error('InvoiceDownloader.savePdf failed:', err)
      throw new Error('Failed to save invoice: ' + (err?.message || err))
    }
  }

  // Browser — normal download
  await pdf.download(filename)
  return { success: true, fileName: filename }
}
