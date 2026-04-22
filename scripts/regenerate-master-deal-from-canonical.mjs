#!/usr/bin/env node
/**
 * Regenerates the Ryan Realty Master Deal File (.docx) from TRANSACTION COORDINATOR
 * canonical_data/v3/transactions.v3.json (schema 3.0).
 *
 * This is a Cursor-side path when the Cowork INDEX build_v20 pipeline is not on disk.
 * Output is readable in Word; layout is intentionally simple (stacked label/value blocks).
 *
 * Env:
 *   MASTER_DEAL_TC_ROOT — folder containing canonical_data/v3/ (default: ~/Documents/Claude/Projects/TRANSACTION COORDINATOR)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from 'docx';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const TC_ROOT =
  process.env.MASTER_DEAL_TC_ROOT ||
  path.join(process.env.HOME, 'Documents/Claude/Projects/TRANSACTION COORDINATOR');

const CANON = path.join(TC_ROOT, 'canonical_data/v3/transactions.v3.json');
const OUT = path.join(
  TC_ROOT,
  `Ryan_Realty_Master_Deal_File_v22_from_canonical_${new Date().toISOString().slice(0, 10)}.docx`,
);

const STATUS_ORDER = [
  'UNDER_CONTRACT',
  'CLOSED',
  'EXPIRED',
  'REJECTED',
  'TERMINATED',
  'UNKNOWN',
];

function money(n) {
  if (n == null || n === '') return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Number(n));
}

function trunc(s, max) {
  if (s == null) return '';
  const t = String(s);
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`;
}

function pBlank() {
  return new Paragraph({ children: [new TextRun({ text: '', size: 20 })] });
}

function pBody(text, { bold = false, italic = false } = {}) {
  return new Paragraph({
    spacing: { after: 120, line: 300, lineRule: 'auto' },
    children: [
      new TextRun({
        text,
        font: 'Calibri',
        size: 24,
        bold,
        italics: italic,
      }),
    ],
  });
}

function pLabelValue(label, value) {
  const v = value == null || value === '' ? '—' : String(value);
  return new Paragraph({
    spacing: { after: 140, line: 300, lineRule: 'auto' },
    children: [
      new TextRun({ text: `${label}: `, font: 'Calibri', size: 24, bold: true }),
      new TextRun({ text: v, font: 'Calibri', size: 24 }),
    ],
  });
}

function buildDealAddressIndex(data) {
  const m = new Map();
  for (const row of data.listings || []) {
    if (row.deal_id) m.set(row.deal_id, row.address || row.deal_id);
  }
  for (const row of data.buyer_agreements || []) {
    if (row.deal_id) m.set(row.deal_id, row.address || row.deal_id);
  }
  return m;
}

function dealIdFromOfferId(offerId) {
  const parts = String(offerId).split('__');
  return parts.length >= 2 ? parts.slice(0, -1).join('__') : offerId;
}

function statusRank(s) {
  const i = STATUS_ORDER.indexOf(s);
  return i === -1 ? STATUS_ORDER.length : i;
}

function main() {
  if (!fs.existsSync(CANON)) {
    console.error(`Missing canonical file: ${CANON}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(CANON, 'utf8');
  const data = JSON.parse(raw);
  const offers = Array.isArray(data.offers) ? [...data.offers] : [];
  const addrByDeal = buildDealAddressIndex(data);

  offers.sort((a, b) => {
    const rs = statusRank(a.terminal_status) - statusRank(b.terminal_status);
    if (rs !== 0) return rs;
    const da = dealIdFromOfferId(a.offer_id);
    const db = dealIdFromOfferId(b.offer_id);
    const aa = (addrByDeal.get(da) || da).localeCompare(addrByDeal.get(db) || db);
    if (aa !== 0) return aa;
    return String(a.offer_id).localeCompare(String(b.offer_id));
  });

  const stats = data.stats || {};
  const children = [];

  children.push(
    new Paragraph({
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: 'Ryan Realty — Master Deal File',
          font: 'Cambria',
          size: 56,
          bold: true,
        }),
      ],
    }),
  );
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [
        new TextRun({
          text: `Regenerated from canonical v3 · generated_at ${data.generated_at || '—'} · ${new Date().toISOString().slice(0, 10)}`,
          font: 'Calibri',
          size: 22,
          italics: true,
        }),
      ],
    }),
  );

  children.push(pBody('Cover statistics (from canonical stats block)', { bold: true }));
  children.push(pLabelValue('Total deals', stats.total_deals));
  children.push(pLabelValue('Listings', stats.total_listings));
  children.push(pLabelValue('Buyer agreements', stats.total_buyer_agreements));
  children.push(pLabelValue('Offers', stats.total_offers));
  if (stats.by_status) {
    children.push(pLabelValue('By status', JSON.stringify(stats.by_status)));
  }
  children.push(pBlank());

  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun({ text: 'Offers (sorted by status, then address)', font: 'Calibri', bold: true })],
    }),
  );
  children.push(
    pBody(
      'Each block is one offer from transactions.v3.json. This file is a data-faithful regeneration; it does not copy INDEX v21 card layout or thumbnails.',
      { italic: true },
    ),
  );

  offers.forEach((o, idx) => {
    const dealId = dealIdFromOfferId(o.offer_id);
    const address = addrByDeal.get(dealId) || dealId;

    if (idx > 0) {
      children.push(
        new Paragraph({
          pageBreakBefore: true,
          children: [new TextRun({ text: '', size: 20 })],
        }),
      );
    }

    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 120, after: 160 },
        children: [
          new TextRun({
            text: `${address} — ${o.offer_id}`,
            font: 'Cambria',
            bold: true,
          }),
        ],
      }),
    );

    children.push(pLabelValue('SA number', o.sa_number));
    children.push(pLabelValue('Terminal status', o.terminal_status));
    children.push(pLabelValue('Terminal date', o.terminal_date));
    children.push(pLabelValue('Offer price', money(o.offer_price)));
    children.push(pLabelValue('Earnest money', money(o.earnest_money)));
    children.push(pLabelValue('Financing', o.financing_type));
    children.push(pLabelValue('Offer date', o.offer_date));
    children.push(pLabelValue('Expiration', o.expiration_date));
    children.push(pLabelValue('COE date', o.coe_date));
    children.push(pLabelValue('Buyers', Array.isArray(o.buyers) ? o.buyers.join('; ') : o.buyers));
    children.push(pLabelValue('Sellers', Array.isArray(o.sellers) ? o.sellers.join('; ') : o.sellers));
    children.push(pLabelValue("Buyer's agent", o.buyers_agent));
    children.push(pLabelValue("Seller's agent", o.sellers_agent));
    children.push(pLabelValue("Buyer's brokerage", o.buyers_brokerage));
    children.push(pLabelValue("Seller's brokerage", o.sellers_brokerage));

    const reason = o.terminal_evidence?.reasoning;
    children.push(pLabelValue('Terminal evidence (summary)', trunc(reason, 1800)));

    const tl = Array.isArray(o.timeline) ? o.timeline.slice(0, 14) : [];
    if (tl.length) {
      children.push(pBody('Timeline (first 14 events)', { bold: true }));
      for (const row of tl) {
        children.push(
          pBody(`${row.date || '—'} — ${trunc(row.event, 500)}`, { italic: false }),
        );
      }
    }
  });

  children.push(
    new Paragraph({
      pageBreakBefore: true,
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun({ text: 'Active listings (snapshot)', font: 'Calibri', bold: true })],
    }),
  );
  for (const L of data.listings || []) {
    if (String(L.listing_status || '').toLowerCase() !== 'active') continue;
    children.push(
      pBody(`${L.address || L.deal_id} · MLS ${L.mls_number || '—'} · list ${money(L.list_price)}`),
    );
  }

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: 'Calibri',
            size: 24,
          },
        },
      },
    },
    sections: [{ children }],
  });

  return Packer.toBuffer(doc).then((buf) => {
    fs.writeFileSync(OUT, buf);
    console.log(`Wrote ${OUT}`);
    console.log(`Bytes: ${buf.length}`);
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
