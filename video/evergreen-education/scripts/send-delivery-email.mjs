#!/usr/bin/env node
/**
 * send-delivery-email.mjs
 *
 * Sends the delivery email to Matt via Resend with:
 *   - Inputs summary
 *   - Equity table
 *   - Scorecard summary
 *   - Per-platform post scripts inline
 *   - Music attribution
 *   - Link to the rendered MP4
 *
 * Env required: RESEND_API_KEY
 *
 * Run: node video/evergreen-education/scripts/send-delivery-email.mjs
 *      node video/evergreen-education/scripts/send-delivery-email.mjs --dry-run  # print but don't send
 */

import { readFile } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

const FROM_PRIMARY = 'Ryan Realty Video Pipeline <matt@ryan-realty.com>'
const FROM_FALLBACK = 'Ryan Realty Video Pipeline <onboarding@resend.dev>'
const TO = 'matt@ryan-realty.com'

async function loadOrEmpty(path) {
  try { return await readFile(path, 'utf8') } catch { return '' }
}

async function buildBody() {
  const data = JSON.parse(await readFile(resolve(ROOT, 'data', '4-pillars.json'), 'utf8'))
  const equity = JSON.parse(await readFile(resolve(ROOT, 'data', '4-pillars-equity-by-year.json'), 'utf8'))
  const scorecard = JSON.parse(await readFile(resolve(ROOT, 'out/4-pillars/scorecard.json'), 'utf8'))
  const grokDecisions = await loadOrEmpty(resolve(ROOT, 'out/4-pillars/grok-video-decisions.md'))
  const music = await loadOrEmpty(resolve(ROOT, 'out/4-pillars/music-license.txt'))

  const inputs = data.inputs

  const equityRows = equity.bars.map((b) => `
    <tr>
      <td style="padding:6px 12px;font-family:monospace">${b.year}</td>
      <td style="padding:6px 12px;font-family:monospace;text-align:right">$${b.cashFlow.toLocaleString('en-US')}</td>
      <td style="padding:6px 12px;font-family:monospace;text-align:right">$${b.appreciation.toLocaleString('en-US')}</td>
      <td style="padding:6px 12px;font-family:monospace;text-align:right">$${b.loanPaydown.toLocaleString('en-US')}</td>
      <td style="padding:6px 12px;font-family:monospace;text-align:right">$${b.taxSavings.toLocaleString('en-US')}</td>
      <td style="padding:6px 12px;font-family:monospace;text-align:right;font-weight:bold">$${b.total.toLocaleString('en-US')}</td>
    </tr>`).join('')

  const scoreRows = scorecard.categories.map((c) => `
    <tr>
      <td style="padding:4px 8px">${c.name}</td>
      <td style="padding:4px 8px;text-align:right">${c.score}/${c.weight}</td>
    </tr>`).join('')

  const ig = await loadOrEmpty(resolve(ROOT, 'out/4-pillars/post-scripts/instagram.md'))
  const tt = await loadOrEmpty(resolve(ROOT, 'out/4-pillars/post-scripts/tiktok.md'))
  const fb = await loadOrEmpty(resolve(ROOT, 'out/4-pillars/post-scripts/facebook.md'))
  const yt = await loadOrEmpty(resolve(ROOT, 'out/4-pillars/post-scripts/youtube-shorts.md'))
  const li = await loadOrEmpty(resolve(ROOT, 'out/4-pillars/post-scripts/linkedin.md'))

  return `
<!DOCTYPE html>
<html><body style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 720px; margin: 0 auto; padding: 24px; color: #1A1A1A;">

<h1 style="color:#102742;border-bottom:2px solid #D4AF37;padding-bottom:8px">Evergreen video ready — The 4 Pillars of Real Estate Wealth</h1>

<p>This is the proof build for the new <code>video/evergreen-education/</code> pipeline. Format: 60s vertical (1080×1920), brand palette only, mid-tempo ambient music bed.</p>

<p><strong>Watch:</strong> the rendered MP4 lives at:</p>
<pre style="background:#faf8f4;padding:12px;border-left:3px solid #D4AF37">video/evergreen-education/public/library/4-pillars.mp4</pre>
<p>(After approval and the next push, it'll be served at <code>https://ryanrealty.vercel.app/library/4-pillars.mp4</code> — confirm the static-route mapping at promotion time.)</p>

<h2 style="color:#102742">Locked inputs (illustrative pro-forma)</h2>
<table style="border-collapse:collapse;font-size:14px">
  <tr><td style="padding:4px 12px"><strong>Property</strong></td><td>$500,000 single-family rental (generic location)</td></tr>
  <tr><td style="padding:4px 12px"><strong>Down</strong></td><td>25% / $125,000</td></tr>
  <tr><td style="padding:4px 12px"><strong>Loan</strong></td><td>$375,000 @ 7% / 30yr fixed</td></tr>
  <tr><td style="padding:4px 12px"><strong>Cash flow</strong></td><td>$200/mo (after PITI + reserves)</td></tr>
  <tr><td style="padding:4px 12px"><strong>Appreciation</strong></td><td>3% / yr (long-run national average)</td></tr>
  <tr><td style="padding:4px 12px"><strong>Building basis</strong></td><td>$400,000 → $14,545/yr depreciation</td></tr>
  <tr><td style="padding:4px 12px"><strong>Tax bracket</strong></td><td>24% federal → ~$3,491/yr in tax savings</td></tr>
</table>

<h2 style="color:#102742">Stacked equity (Beat 5 chart)</h2>
<table style="border-collapse:collapse;border:1px solid #102742;font-size:13px">
  <thead style="background:#102742;color:#faf8f4">
    <tr>
      <th style="padding:8px 12px">Year</th>
      <th style="padding:8px 12px;text-align:right">Cash flow</th>
      <th style="padding:8px 12px;text-align:right">Appreciation</th>
      <th style="padding:8px 12px;text-align:right">Loan paydown</th>
      <th style="padding:8px 12px;text-align:right">Tax savings</th>
      <th style="padding:8px 12px;text-align:right">Total</th>
    </tr>
  </thead>
  <tbody>${equityRows}</tbody>
</table>

<h2 style="color:#102742">Scorecard — ${scorecard.totalRaw}/100 (passes ${scorecard.minimumForFormat} minimum: ${scorecard.passes ? 'YES ✓' : 'NO ✗'})</h2>
<table style="border-collapse:collapse;font-size:13px">${scoreRows}</table>

<h3 style="color:#102742">Open items / known gaps</h3>
<ul>
  ${(scorecard.openItems || []).map((x) => `<li>${x}</li>`).join('')}
</ul>

<h2 style="color:#102742">Decisions made at this render</h2>
<ul>
  <li><strong>Grok Video scout (Beat 1 + Beat 6):</strong> both auto-passed file integrity but FAILED manual visual scrub — Grok re-painted the source stills as cartoon clipart and shifted the palette. Both beats fall back to deterministic Remotion motion on the still. Decision log: <code>out/4-pillars/grok-video-decisions.md</code></li>
  <li><strong>Music:</strong> "Long Stroll" by Kevin MacLeod (Incompetech), CC BY 4.0. Sub-mixed at -16dB under VO with swell to -10dB during Beat 5 chart hold. Alternate candidate available: "thinking-music" (re-run with <code>npm run video:evergreen:music -- --pick=thinking-music</code>).</li>
  <li><strong>VO + captions:</strong> NOT in this build — cloud agent has no <code>ELEVENLABS_API_KEY</code>. Run locally where your <code>.env.local</code> has the key:<br>
    <pre style="background:#faf8f4;padding:8px;font-size:12px">cd video/evergreen-education
node scripts/synth-vo.mjs        # synthesize Victoria + alignment
node scripts/render.mjs          # re-render with VO + captions
node scripts/qc.mjs              # re-verify</pre>
  </li>
</ul>

<hr style="border:0;border-top:1px solid #ccc;margin:32px 0">

<h2 style="color:#102742">Per-platform post scripts</h2>
<p>Each section below is ready to copy-paste. Files also in <code>video/evergreen-education/out/4-pillars/post-scripts/</code>.</p>

<details><summary><strong>Instagram Reel</strong></summary><pre style="background:#faf8f4;padding:12px;font-size:13px;white-space:pre-wrap">${ig}</pre></details>
<details><summary><strong>TikTok</strong></summary><pre style="background:#faf8f4;padding:12px;font-size:13px;white-space:pre-wrap">${tt}</pre></details>
<details><summary><strong>Facebook</strong></summary><pre style="background:#faf8f4;padding:12px;font-size:13px;white-space:pre-wrap">${fb}</pre></details>
<details><summary><strong>YouTube Shorts</strong></summary><pre style="background:#faf8f4;padding:12px;font-size:13px;white-space:pre-wrap">${yt}</pre></details>
<details><summary><strong>LinkedIn</strong></summary><pre style="background:#faf8f4;padding:12px;font-size:13px;white-space:pre-wrap">${li}</pre></details>

<hr style="border:0;border-top:1px solid #ccc;margin:32px 0">

<h2 style="color:#102742">Music license + attribution</h2>
<pre style="background:#faf8f4;padding:12px;font-size:13px;white-space:pre-wrap">${music}</pre>

<hr style="border:0;border-top:1px solid #ccc;margin:32px 0">

<p style="color:#666;font-size:12px">
This is a draft. Per <code>CLAUDE.md</code> Draft-First, the MP4 is NOT yet promoted to <code>public/library/</code> until Matt approves. Reply with "ship it" / "approved" / "go" to confirm — agent will promote, commit, push, and run <code>npm run deploy:verify</code>.
</p>
</body></html>
`
}

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey && !dryRun) {
    console.error('RESEND_API_KEY missing. Use --dry-run to print body without sending.')
    process.exit(1)
  }

  const html = await buildBody()
  if (dryRun) {
    console.log(html)
    return
  }

  console.log('Sending delivery email via Resend...')
  // Try primary sender first; fall back to onboarding@resend.dev if domain rejects
  const trySend = async (from) => {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: TO,
        subject: 'Evergreen video ready — The 4 Pillars of Real Estate Wealth',
        html,
      }),
    })
    const text = await res.text()
    return { ok: res.ok, status: res.status, body: text, from }
  }

  let result = await trySend(FROM_PRIMARY)
  if (!result.ok) {
    console.warn(`primary sender rejected (${result.status}): ${result.body.slice(0, 200)}`)
    console.log('Falling back to onboarding@resend.dev...')
    result = await trySend(FROM_FALLBACK)
  }

  if (result.ok) {
    console.log(`✓ sent from ${result.from}`)
    console.log(result.body)
  } else {
    console.error(`✗ both senders failed (last status ${result.status}): ${result.body.slice(0, 400)}`)
    process.exit(1)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
