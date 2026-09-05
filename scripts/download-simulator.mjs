#!/usr/bin/env node
/**
 * Download MakeCode Arcade simulator for offline use.
 * Usage: node scripts/download-simulator.mjs [version]
 * Default version is read from public/arcade-version.json -> simulator.
 */

import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function getVersion() {
  const arg = process.argv[2]
  if (arg) return arg
  const configPath = path.join(repoRoot, 'public', 'arcade-version.json')
  if (fs.existsSync(configPath)) {
    const config = readJson(configPath)
    if (config.simulator) return config.simulator
  }
  throw new Error('No version given and public/arcade-version.json is missing')
}

const version = getVersion()
const simUrl = `https://trg-arcade.userpxt.io/v${version}/---simulator`
const outputDir = path.join(repoRoot, 'public', 'simulator', version)

fs.mkdirSync(outputDir, { recursive: true })

console.log(`Downloading simulator v${version} from ${simUrl}`)
console.log(`Output: ${outputDir}`)

async function downloadFile(url, outputPath) {
  try {
    const response = await fetch(url)
    if (!response.ok) {
      console.error(`Failed to download ${url}: ${response.status}`)
      return false
    }

    const content = await response.text()
    fs.writeFileSync(outputPath, content)
    console.log(`  ✓ ${path.basename(outputPath)} (${content.length} bytes)`)
    return true
  } catch (err) {
    console.error(`  ✗ ${path.basename(outputPath)}: ${err.message}`)
    return false
  }
}

async function downloadSimulator() {
  const indexPath = path.join(outputDir, 'index.html')

  const mainHtml = await downloadFile(simUrl, indexPath)
  if (!mainHtml) {
    console.error('Failed to download simulator main file')
    process.exit(1)
  }

  const html = fs.readFileSync(indexPath, 'utf8')

  const scriptRegex = /<script[^>]+src="([^"]+)"/g
  const linkRegex = /<link[^>]+href="([^"]+)"/g

  const resources = new Set()

  let match
  while ((match = scriptRegex.exec(html)) !== null) {
    resources.add(match[1])
  }
  while ((match = linkRegex.exec(html)) !== null) {
    resources.add(match[1])
  }

  console.log(`Found ${resources.size} additional resources`)

  const baseUrl = simUrl.replace('/---simulator', '')

  for (const resource of resources) {
    let resourceUrl, resourcePath

    if (resource.startsWith('data:')) {
      console.log(`  ⏭ Skipping data URI`)
      continue
    }

    if (resource.startsWith('https://cdn.makecode.com')) {
      const cdnPath = resource.replace('https://cdn.makecode.com/', '')
      resourceUrl = resource
      resourcePath = path.join(outputDir, 'cdn', cdnPath)
      console.log(`  [CDN] ${cdnPath}`)
    } else if (resource.startsWith('http')) {
      console.log(`  ⏭ Skipping external: ${resource}`)
      continue
    } else if (resource.startsWith('/')) {
      resourceUrl = `https://trg-arcade.userpxt.io${resource}`
      resourcePath = path.join(outputDir, resource.slice(1))
    } else {
      resourceUrl = `${baseUrl}/${resource}`
      resourcePath = path.join(outputDir, resource)
    }

    fs.mkdirSync(path.dirname(resourcePath), { recursive: true })
    await downloadFile(resourceUrl, resourcePath)
  }

  // Patch index.html to use local CDN files.
  console.log('\nPatching index.html for local CDN paths...')
  let htmlContent = fs.readFileSync(indexPath, 'utf8')
  htmlContent = htmlContent.replace(/https:\/\/cdn\.makecode\.com\//g, './cdn/')
  fs.writeFileSync(indexPath, htmlContent)
  console.log('  ✓ Patched CDN references')

  // Generate the custom slim variant from the template, injecting the
  // version-specific blob hashes extracted from the downloaded index.html.
  // The slim variant hides all MakeCode UI chrome (#wrap) and shows only the
  // game canvas, which is what /arcade expects. Do NOT copy index.html —
  // that would re-introduce the full simulator UI regression.
  const slimPath = path.join(outputDir, 'slim.html')
  const slimCssPath = path.join(outputDir, 'slim.css')
  const templateDir = path.join(__dirname, 'sim-templates')
  const slimHtmlTemplatePath = path.join(templateDir, 'slim.html.template')
  const slimCssTemplatePath = path.join(templateDir, 'slim.css')

  if (!fs.existsSync(slimHtmlTemplatePath) || !fs.existsSync(slimCssTemplatePath)) {
    console.error('Slim template files missing — cannot generate slim variant')
    process.exit(1)
  }

  // Extract the version-specific <link>/<script> lines from the patched index.html.
  const patchedHtml = fs.readFileSync(indexPath, 'utf8')
  const extractLine = (regex) => {
    const m = patchedHtml.match(regex)
    if (!m) throw new Error(`Could not find ${regex} in downloaded index.html`)
    return m[0].trim()
  }
  const simCssLine = extractLine(/<link[^>]+href="[^"]*\/sim\.css"[^>]*>/)
  const iconsCssLine = extractLine(/<link[^>]+href="[^"]*\/icons\.css"[^>]*>/)
  const pxtsimJsLine = extractLine(/<script[^>]+src="[^"]*\/pxtsim\.js"[^>]*><\/script>/)
  const simJsLine = extractLine(/<script[^>]+src="[^"]*\/sim\.js"[^>]*><\/script>/)

  let slimHtml = fs.readFileSync(slimHtmlTemplatePath, 'utf8')
  slimHtml = slimHtml.replace('<!--SIM_CSS-->', simCssLine)
  slimHtml = slimHtml.replace('<!--ICONS_CSS-->', iconsCssLine)
  slimHtml = slimHtml.replace('<!--PXTSIM_JS-->', pxtsimJsLine)
  slimHtml = slimHtml.replace('<!--SIM_JS-->', simJsLine)
  fs.writeFileSync(slimPath, slimHtml)
  console.log('  ✓ Generated slim.html from template (blob hashes injected)')

  fs.copyFileSync(slimCssTemplatePath, slimCssPath)
  console.log('  ✓ Copied slim.css from template')

  console.log('\nDownloaded files:')
  function listFiles(dir, prefix = '') {
    const items = fs.readdirSync(dir)
    for (const item of items) {
      const fullPath = path.join(dir, item)
      const stat = fs.statSync(fullPath)
      if (stat.isDirectory()) {
        console.log(`${prefix}${item}/`)
        listFiles(fullPath, prefix + '  ')
      } else {
        const size = (stat.size / 1024).toFixed(1)
        console.log(`${prefix}${item} (${size} KB)`)
      }
    }
  }
  listFiles(outputDir)

  console.log('\nSimulator download complete!')
  console.log(`Local simulator URL: /simulator/${version}/index.html (full) and /simulator/${version}/slim.html (slim)`)
}

downloadSimulator().catch(console.error)
