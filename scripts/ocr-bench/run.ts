#!/usr/bin/env tsx
/**
 * OCR Benchmark — mide tiempo y eficacia del endpoint /api/extract-receipt
 * contra un set de boletas etiquetadas.
 *
 * Uso:
 *   npm run dev           # en otra terminal
 *   npm run bench:ocr     # opciones: --repeats=3 --endpoint=http://localhost:3002
 *
 * Fixtures: scripts/ocr-bench/fixtures/<name>.{jpg,png} + <name>.json con ground truth.
 */

import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from "node:fs"
import { basename, extname, join, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const FIXTURES_DIR = join(__dirname, "fixtures")
const RESULTS_DIR = join(__dirname, "results")

type GroundItem = { name: string; price: number; quantity?: number }
type GroundTruth = { notes?: string; items: GroundItem[] }
type ExtractedItem = { name: string; price: number; quantity: number; discount_amount?: number }

type ArgMap = Record<string, string>
function parseArgs(argv: string[]): ArgMap {
  const out: ArgMap = {}
  for (const a of argv.slice(2)) {
    const m = a.match(/^--([^=]+)=(.*)$/)
    if (m) out[m[1]] = m[2]
  }
  return out
}

/** Normaliza nombres para comparar: lowercase, sin acentos, sin signos, colapsa espacios. */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  const prev = new Array<number>(b.length + 1)
  const curr = new Array<number>(b.length + 1)
  for (let j = 0; j <= b.length; j++) prev[j] = j
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost)
    }
    for (let j = 0; j <= b.length; j++) prev[j] = curr[j]
  }
  return prev[b.length]
}

/** Match heurístico: nombre por substring/Levenshtein, precio dentro de ±5%. */
function itemsMatch(a: { name: string; price: number }, b: { name: string; price: number }): boolean {
  const na = normalize(a.name), nb = normalize(b.name)
  const nameOk =
    na === nb ||
    na.includes(nb) || nb.includes(na) ||
    levenshtein(na, nb) <= Math.max(2, Math.floor(Math.max(na.length, nb.length) * 0.2))
  if (!nameOk) return false
  const priceOk = Math.abs(a.price - b.price) <= Math.max(50, a.price * 0.05)
  return priceOk
}

/** Expande una lista por cantidad: [{name, price, quantity:2}] → [{name, price}, {name, price}] */
function expandByQuantity<T extends { name: string; price: number; quantity?: number }>(items: T[]) {
  const out: Array<{ name: string; price: number }> = []
  for (const it of items) {
    const n = Math.max(1, it.quantity ?? 1)
    for (let i = 0; i < n; i++) out.push({ name: it.name, price: it.price })
  }
  return out
}

/** Matching greedy 1-a-1 sobre listas expandidas por cantidad (equivale qty=2 a 2×qty=1). */
function matchLists(truth: GroundItem[], detected: ExtractedItem[]) {
  const truthFlat = expandByQuantity(truth)
  const detectedFlat = expandByQuantity(detected)
  const usedD = new Set<number>()
  let matched = 0
  for (let i = 0; i < truthFlat.length; i++) {
    for (let j = 0; j < detectedFlat.length; j++) {
      if (usedD.has(j)) continue
      if (itemsMatch(truthFlat[i], detectedFlat[j])) {
        matched++
        usedD.add(j)
        break
      }
    }
  }
  return {
    matched,
    truthTotal: truthFlat.length,
    detectedTotal: detectedFlat.length,
    missed: truthFlat.length - matched,
    extra: detectedFlat.length - matched,
  }
}

function percentile(sorted: number[], p: number): number {
  if (!sorted.length) return 0
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))
  return sorted[idx]
}

async function runOne(endpoint: string, base64: string): Promise<{ ms: number; items: ExtractedItem[]; error?: string }> {
  const t0 = Date.now()
  try {
    const res = await fetch(`${endpoint}/api/extract-receipt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ base64Image: base64 }),
    })
    const ms = Date.now() - t0
    if (!res.ok) {
      const body = await res.text().catch(() => "")
      return { ms, items: [], error: `HTTP ${res.status}: ${body.slice(0, 120)}` }
    }
    const json = await res.json() as { items?: ExtractedItem[] }
    return { ms, items: json.items ?? [] }
  } catch (err) {
    return { ms: Date.now() - t0, items: [], error: String(err) }
  }
}

async function main() {
  const args = parseArgs(process.argv)
  const endpoint = args.endpoint ?? "http://localhost:3002"
  const repeats = Math.max(1, Number(args.repeats ?? "1"))

  if (!existsSync(FIXTURES_DIR)) {
    console.error(`Fixtures dir no existe: ${FIXTURES_DIR}`)
    process.exit(1)
  }

  const files = readdirSync(FIXTURES_DIR).filter(f => /\.(jpe?g|png)$/i.test(f))
  if (!files.length) {
    console.error(`Sin fixtures en ${FIXTURES_DIR}. Agrega <nombre>.jpg + <nombre>.json`)
    process.exit(1)
  }

  console.log(`\nOCR Benchmark`)
  console.log(`endpoint: ${endpoint}`)
  console.log(`repeats : ${repeats}`)
  console.log(`fixtures: ${files.length}\n`)

  const perFixture: Array<{
    name: string
    ms: number[]
    truth: number
    detected: number
    matched: number
    missed: number
    extra: number
    recall: number
    precision: number
    totalErrorPct: number
    error?: string
  }> = []

  for (const file of files.sort()) {
    const name = basename(file, extname(file))
    const gtPath = join(FIXTURES_DIR, `${name}.json`)
    if (!existsSync(gtPath)) {
      console.log(`  skip ${file} — falta ${name}.json`)
      continue
    }
    const gt = JSON.parse(readFileSync(gtPath, "utf8")) as GroundTruth
    const base64 = readFileSync(join(FIXTURES_DIR, file)).toString("base64")

    const runs: Array<{ ms: number; items: ExtractedItem[]; error?: string }> = []
    for (let r = 0; r < repeats; r++) {
      const run = await runOne(endpoint, base64)
      runs.push(run)
      process.stdout.write(`  ${file} run${r + 1}/${repeats}: ${run.ms}ms`)
      if (run.error) process.stdout.write(`  ⚠ ${run.error}`)
      process.stdout.write("\n")
    }

    // Usar el último run (no-error) para métricas de match; timing es de todos
    const okRuns = runs.filter(r => !r.error)
    const last = okRuns[okRuns.length - 1] ?? runs[runs.length - 1]
    const m = matchLists(gt.items, last.items)
    const truthSum = gt.items.reduce((s, it) => s + it.price * (it.quantity ?? 1), 0)
    const detectedSum = last.items.reduce((s, it) => s + it.price * it.quantity, 0)
    const totalErrorPct = truthSum > 0 ? Math.abs(detectedSum - truthSum) / truthSum * 100 : 0

    perFixture.push({
      name: file,
      ms: runs.map(r => r.ms),
      truth: m.truthTotal,
      detected: m.detectedTotal,
      matched: m.matched,
      missed: m.missed,
      extra: m.extra,
      recall: m.truthTotal ? m.matched / m.truthTotal : 1,
      precision: m.detectedTotal ? m.matched / m.detectedTotal : 1,
      totalErrorPct,
      error: runs.find(r => r.error)?.error,
    })
  }

  // Resumen
  console.log(`\n=== Resultados ===`)
  console.log(
    "fixture".padEnd(28) +
    "ms(p50)".padStart(10) +
    "ms(p95)".padStart(10) +
    "truth".padStart(8) +
    "det".padStart(6) +
    "match".padStart(8) +
    "recall".padStart(10) +
    "prec".padStart(8) +
    "Δtotal%".padStart(10)
  )
  const allMs: number[] = []
  for (const r of perFixture) {
    const sorted = [...r.ms].sort((a, b) => a - b)
    allMs.push(...sorted)
    console.log(
      r.name.padEnd(28) +
      percentile(sorted, 50).toString().padStart(10) +
      percentile(sorted, 95).toString().padStart(10) +
      String(r.truth).padStart(8) +
      String(r.detected).padStart(6) +
      `${r.matched}/${r.missed}/${r.extra}`.padStart(8) +
      r.recall.toFixed(2).padStart(10) +
      r.precision.toFixed(2).padStart(8) +
      r.totalErrorPct.toFixed(1).padStart(10)
    )
  }

  allMs.sort((a, b) => a - b)
  const avgRecall = perFixture.reduce((s, r) => s + r.recall, 0) / (perFixture.length || 1)
  const avgPrecision = perFixture.reduce((s, r) => s + r.precision, 0) / (perFixture.length || 1)
  const passRate = perFixture.filter(r => r.recall >= 0.9).length / (perFixture.length || 1)

  console.log(`\n--- Global ---`)
  console.log(`fixtures      : ${perFixture.length}`)
  console.log(`latency p50/95: ${percentile(allMs, 50)}ms / ${percentile(allMs, 95)}ms`)
  console.log(`avg recall    : ${avgRecall.toFixed(3)} (recall ≥0.9 en ${(passRate * 100).toFixed(0)}% de boletas)`)
  console.log(`avg precision : ${avgPrecision.toFixed(3)}\n`)

  // Guardar snapshot
  if (!existsSync(RESULTS_DIR)) mkdirSync(RESULTS_DIR, { recursive: true })
  const ts = new Date().toISOString().replace(/[:.]/g, "-")
  const outPath = join(RESULTS_DIR, `${ts}.json`)
  writeFileSync(outPath, JSON.stringify({
    ts, endpoint, repeats,
    summary: {
      fixtures: perFixture.length,
      latency_p50_ms: percentile(allMs, 50),
      latency_p95_ms: percentile(allMs, 95),
      avg_recall: avgRecall,
      avg_precision: avgPrecision,
      pass_rate: passRate,
    },
    perFixture,
  }, null, 2))
  console.log(`snapshot guardado: ${outPath}`)
}

main().catch(err => { console.error(err); process.exit(1) })
