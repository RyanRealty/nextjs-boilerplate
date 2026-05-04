#!/usr/bin/env node
/**
 * compute-equity-table.mjs
 *
 * Reads the locked illustrative inputs from data/4-pillars.json and computes
 * the 3 / 5 / 10 / 20 year stacked-equity totals per pillar.
 *
 * Writes:
 *   data/4-pillars-equity-by-year.json    — full per-cell math (audit trail)
 *   public/4-pillars/equity-by-year.json  — the same, copied for Remotion staticFile
 *
 * Run: node video/evergreen-education/scripts/compute-equity-table.mjs
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const DATA = resolve(ROOT, 'data')
const PUB = resolve(ROOT, 'public')

const YEARS = [3, 5, 10, 20]

function monthlyPaymentPI(loan, annualRate, termYears) {
  const r = annualRate / 12
  const n = termYears * 12
  return (loan * r) / (1 - Math.pow(1 + r, -n))
}

/**
 * Cumulative principal paid through the end of year `n` on a fully-amortizing loan.
 * Uses the closed-form: principal_paid = loan - remaining_balance
 * where remaining_balance(after k payments) = loan * (1+r)^k - PI * ((1+r)^k - 1) / r
 */
function cumulativePrincipalThroughYear(loan, annualRate, termYears, n) {
  const r = annualRate / 12
  const k = n * 12
  const PI = monthlyPaymentPI(loan, annualRate, termYears)
  const compound = Math.pow(1 + r, k)
  const remaining = loan * compound - PI * (compound - 1) / r
  return Math.max(0, loan - remaining)
}

async function main() {
  const inputsPath = resolve(DATA, '4-pillars.json')
  const inputs = JSON.parse(await readFile(inputsPath, 'utf8')).inputs

  const PI = monthlyPaymentPI(inputs.loanAmount, inputs.interestRate, inputs.termYears)
  console.log(`Monthly P&I (computed): $${PI.toFixed(2)}`)
  console.log(`(plan assumed $2,800 PITI = P&I + taxes + insurance; P&I alone is $${PI.toFixed(0)})`)

  const bars = YEARS.map((n) => {
    const cashFlow = inputs.monthlyCashFlow * 12 * n
    const appreciation = Math.round(inputs.purchasePrice * (Math.pow(1 + inputs.appreciationRate, n) - 1))
    const loanPaydown = Math.round(cumulativePrincipalThroughYear(inputs.loanAmount, inputs.interestRate, inputs.termYears, n))
    const taxSavings = Math.round(inputs.depreciationYearly * inputs.taxBracket * n)
    const total = cashFlow + appreciation + loanPaydown + taxSavings
    return { year: n, cashFlow, appreciation, loanPaydown, taxSavings, total }
  })

  const audit = {
    inputs,
    formulas: {
      cashFlow: 'monthlyCashFlow × 12 × n',
      appreciation: 'purchasePrice × ((1 + appreciationRate)^n − 1)',
      loanPaydown: 'cumulative principal paid through year n on standard amortization (loan, rate, term)',
      taxSavings: 'depreciationYearly × taxBracket × n',
    },
    monthlyPaymentPI_computed: Math.round(PI * 100) / 100,
    bars,
    spokenTotalsRoundedToK: bars.map((b) => ({
      year: b.year,
      total: b.total,
      spoken: roundToSpokenWords(b.total),
    })),
  }

  await mkdir(DATA, { recursive: true })
  await writeFile(resolve(DATA, '4-pillars-equity-by-year.json'), JSON.stringify(audit, null, 2))

  await mkdir(resolve(PUB, '4-pillars'), { recursive: true })
  await writeFile(
    resolve(PUB, '4-pillars', 'equity-by-year.json'),
    JSON.stringify({ bars }, null, 2)
  )

  // Full per-year per-pillar series for years 0-20 (drives chapter 7 layered growth chart)
  const series = []
  for (let n = 0; n <= 20; n++) {
    series.push({
      year: n,
      cashFlow: inputs.monthlyCashFlow * 12 * n,
      appreciation: Math.round(inputs.purchasePrice * (Math.pow(1 + inputs.appreciationRate, n) - 1)),
      loanPaydown: n === 0 ? 0 : Math.round(cumulativePrincipalThroughYear(inputs.loanAmount, inputs.interestRate, inputs.termYears, n)),
      taxSavings: Math.round(inputs.depreciationYearly * inputs.taxBracket * n),
    })
    series[series.length - 1].total = series[series.length - 1].cashFlow + series[series.length - 1].appreciation + series[series.length - 1].loanPaydown + series[series.length - 1].taxSavings
  }
  await writeFile(
    resolve(PUB, '4-pillars', 'equity-series.json'),
    JSON.stringify({ series }, null, 2)
  )
  console.log(`✓ wrote per-year series (0-20yr) for chapter 7 growth curves`)

  console.log('\nEquity table:')
  console.log('Year | Cash Flow | Appreciation | Loan Paydown | Tax Savings |    Total')
  for (const b of bars) {
    console.log(`${String(b.year).padStart(4)} | $${pad(b.cashFlow)} | $${pad(b.appreciation)}  | $${pad(b.loanPaydown)}   | $${pad(b.taxSavings)}  | $${pad(b.total)}`)
  }
  console.log('\nSpoken (rounded to nearest $1K for VO):')
  for (const s of audit.spokenTotalsRoundedToK) {
    console.log(`  ${s.year}yr: $${s.total.toLocaleString('en-US')} → "${s.spoken}"`)
  }

  console.log('\n✓ wrote data/4-pillars-equity-by-year.json')
  console.log('✓ wrote public/4-pillars/equity-by-year.json')
}

function pad(n) {
  return String(n.toLocaleString('en-US')).padStart(8)
}

function roundToSpokenWords(n) {
  // Round to nearest $1,000 for natural-sounding spoken numbers
  const k = Math.round(n / 1000)
  if (k < 100) return `${spell(k)} thousand`
  // 100-999: "one hundred thirty thousand" / "two hundred seventy-nine thousand"
  const hundreds = Math.floor(k / 100) * 100
  const tens = k % 100
  const hundredsWord = `${spell(hundreds / 100)} hundred`
  const tensWord = tens === 0 ? '' : ` ${spell(tens)}`
  return `${hundredsWord}${tensWord} thousand`
}

const ONES = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
  'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen']
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety']
function spell(n) {
  if (n < 20) return ONES[n]
  const t = Math.floor(n / 10)
  const o = n % 10
  return o === 0 ? TENS[t] : `${TENS[t]}-${ONES[o]}`
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
