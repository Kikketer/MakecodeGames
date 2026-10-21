#!/usr/bin/env node
/**
 * Compare the simulator version vendored under public/simulator (as recorded
 * in public/arcade-version.json) against the latest published pxt-arcade
 * release, and emit GitHub Actions step outputs so update-simulator.yml can
 * decide whether to proceed.
 *
 * The target version is read from the `versions.target` field of the npm
 * pxt-arcade bundle's built/target.json — the same value the MakeCode
 * simulator and the compile server (MakeCodeGamesIngest) report.
 */

import * as fs from 'fs'
import * as path from 'path'
import { execSync } from 'child_process'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const arcadeVersionPath = path.join(repoRoot, 'public', 'arcade-version.json')

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function npmDistTag(pkg, tag) {
  const tags = JSON.parse(execSync(`npm view ${pkg} dist-tags --json`, { encoding: 'utf8' }))
  const version = tags[tag]
  if (!version) throw new Error(`${tag} dist-tag not found for ${pkg}`)
  return version
}

async function fetchTargetVersions(pxtArcadeVersion) {
  const url = `https://unpkg.com/pxt-arcade@${pxtArcadeVersion}/built/target.json`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`)
  const json = await res.json()
  if (!json.versions?.target) throw new Error(`No versions.target in ${url}`)
  return json.versions
}

const current = readJson(arcadeVersionPath)
const pxtArcade = npmDistTag('pxt-arcade', 'latest')
const versions = await fetchTargetVersions(pxtArcade)
const target = versions.target
const pxt = versions.pxt ?? ''

const changed = current.simulator !== target || current.targetVersion !== target

if (changed) {
  console.log(`Simulator ${current.simulator} -> ${target} (pxt-arcade ${pxtArcade}, pxt ${pxt})`)
} else {
  console.log(`Simulator is already up to date: ${current.simulator}`)
}

const outputs = [
  `changed=${changed}`,
  `pxt-arcade=${pxtArcade}`,
  `pxt=${pxt}`,
  `target=${target}`,
  `previous=${current.simulator}`,
  `title=${changed ? `Update MakeCode Arcade simulator to ${target}` : ''}`,
  `commit-message=${changed ? `Bump MakeCode Arcade simulator to ${target}` : ''}`,
]

if (process.env.GITHUB_OUTPUT) {
  fs.appendFileSync(process.env.GITHUB_OUTPUT, outputs.map((l) => l + '\n').join(''))
}

console.log(outputs.join('\n'))
