#!/usr/bin/env node

import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import ffmpeg from 'fluent-ffmpeg'
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')

const inputPath = path.join(repoRoot, 'public', 'videos', 'hero.mp4')
const outputPath = path.join(repoRoot, 'public', 'videos', 'hero-optimized.mp4')

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  let value = bytes
  let unitIndex = 0
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }
  return `${value.toFixed(unitIndex === 0 ? 0 : 2)} ${units[unitIndex]}`
}

async function run() {
  if (!fs.existsSync(inputPath)) {
    console.error(`[reprocess-hero-video] Missing input file: ${inputPath}`)
    process.exit(1)
  }

  ffmpeg.setFfmpegPath(ffmpegInstaller.path)

  const inputSize = fs.statSync(inputPath).size
  console.log(`[reprocess-hero-video] Input: ${formatBytes(inputSize)}`)

  await new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .videoCodec('libx264')
      .audioCodec('aac')
      .size('?x720')
      .fps(24)
      .outputOptions([
        '-preset veryfast',
        '-crf 29',
        '-movflags +faststart',
        '-pix_fmt yuv420p',
        '-profile:v main',
        '-level 4.0',
        '-maxrate 1200k',
        '-bufsize 2400k',
        '-ac 2',
        '-b:a 96k',
      ])
      .on('start', (command) => {
        console.log(`[reprocess-hero-video] ffmpeg command: ${command}`)
      })
      .on('error', (err) => reject(err))
      .on('end', () => resolve())
      .save(outputPath)
  })

  const outputSize = fs.statSync(outputPath).size
  const savingsPct = inputSize > 0 ? ((inputSize - outputSize) / inputSize) * 100 : 0
  console.log(`[reprocess-hero-video] Output: ${formatBytes(outputSize)}`)
  console.log(`[reprocess-hero-video] Savings: ${savingsPct.toFixed(1)}%`)
}

run().catch((error) => {
  console.error('[reprocess-hero-video] Failed:', error)
  process.exit(1)
})
