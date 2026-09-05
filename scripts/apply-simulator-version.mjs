#!/usr/bin/env node
/**
 * Vendor a new MakeCode Arcade simulator version into the repo.
 *
 * Usage: node scripts/apply-simulator-version.mjs <version>
 *
 * - Downloads the simulator to public/simulator/{version} (full + slim variant).
 * - Rewrites public/arcade-version.json to point at it.
 * - Old simulator directories are kept so pre-compiled arcade games that
 *   still reference them continue to work.
 */

import * as fs from 'fs'
import * as path from 'path'
import { spawnSync } from 'child_process'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const arcadeVersionPath = path.join(repoRoot, 'public', 'arcade-version.json')

const version = process.argv[2]
if (!version) {
  console.error('Usage: node scripts/apply-simulator-version.mjs <version>')
  process.exit(1)
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n')
}

const previous = fs.existsSync(arcadeVersionPath) ? readJson(arcadeVersionPath) : null

const download = spawnSync('node', [path.join(__dirname, 'download-simulator.mjs'), version], {
  cwd: repoRoot,
  stdio: 'inherit',
})
if (download.status !== 0) {
  throw new Error(`download-simulator.mjs exited with status ${download.status}`)
}

const arcadeVersion = {
  simulator: version,
  simUrl: `/simulator/${version}/slim.html`,
  cdnUrl: `/simulator/${version}/cdn`,
  targetVersion: version,
}
writeJson(arcadeVersionPath, arcadeVersion)
console.log(`Wrote ${arcadeVersionPath}:`, arcadeVersion)

if (previous?.simulator && previous.simulator !== version) {
  const oldDir = path.join(repoRoot, 'public', 'simulator', previous.simulator)
  if (fs.existsSync(oldDir)) {
    console.log(`Kept old simulator dir for backwards compatibility: ${oldDir}`)
  }
}
