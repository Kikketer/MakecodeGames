'use client'

import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import {
  imageLiteralToJresEntry,
  jresDataToImageLiteral,
  imageLiteralToBitmap,
  jresDataToBitmapData,
  DEFAULT_PALETTE,
  bitmapDataToJresEntry,
  bitmapToImageLiteral,
  sliceSpriteSheet,
  formatImageArray,
  formatAnimationStarter,
} from '@/lib/makecode-image'
import { loadPngFile, pngToImageDataFromRgba } from '@/lib/png-to-image-client'

const TABS = [
  { id: 'png-to-img', label: 'PNG → img + .jres' },
  { id: 'img-to-jres', label: 'img → .jres' },
  { id: 'jres-to-img', label: '.jres → img' },
] as const

type TabId = (typeof TABS)[number]['id']

function copy(text: string) {
  void navigator.clipboard.writeText(text)
}

function drawPreview(
  canvas: HTMLCanvasElement,
  pixels: Uint8Array,
  width: number,
  height: number,
  palette: string[] = DEFAULT_PALETTE,
) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const scale = Math.max(1, Math.min(16, Math.floor(320 / Math.max(width, height))))
  canvas.width = width * scale
  canvas.height = height * scale

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = pixels[y * width + x]
      ctx.fillStyle = palette[idx % palette.length] ?? '#000000'
      ctx.fillRect(x * scale, y * scale, scale, scale)
    }
  }
}

function useDebouncedPreview(
  render: () => { pixels: Uint8Array; width: number; height: number; palette?: string[] } | null,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const result = render()
        if (result && canvasRef.current) {
          drawPreview(canvasRef.current, result.pixels, result.width, result.height, result.palette)
          setError(null)
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : String(err))
      }
    }, 150)
    return () => clearTimeout(timer)
  }, [render])

  return { canvasRef, error }
}

const inputClass =
  'p-2 text-sm font-sans border-4 border-makecode-black bg-makecode-white text-makecode-black rounded-none focus:outline-none focus:ring-2 focus:ring-makecode-yellow'

const textareaClass =
  'p-3 text-xs font-mono border-4 border-makecode-black bg-makecode-white text-makecode-black rounded-none resize-y focus:outline-none focus:ring-2 focus:ring-makecode-yellow'

const preClass =
  'bg-makecode-white border-4 border-makecode-black text-makecode-black text-xs font-mono p-3 rounded-none overflow-auto max-h-80'

const codeClass =
  'rounded-none bg-makecode-white border-2 border-makecode-black px-1 py-0.5 text-xs font-mono'

const copyBtnClass =
  'self-start font-sans text-sm font-bold text-makecode-cyan underline hover:text-makecode-yellow'

export default function ImageConverter({ defaultTab = 'png-to-img' }: { defaultTab?: TabId }) {
  const [activeTab, setActiveTab] = useState<TabId>(defaultTab)

  // img → jres
  const [imgInput, setImgInput] = useState<string>('')
  const [jresId, setJresId] = useState<string>('myImages.image0')
  const [displayName, setDisplayName] = useState<string>('Image0')

  const imgToJresPreview = useCallback(() => {
    if (!imgInput.trim()) return null
    const { width, height, pixels } = imageLiteralToBitmap(imgInput)
    return { pixels, width, height, palette: DEFAULT_PALETTE }
  }, [imgInput])
  const { canvasRef: imgCanvasRef, error: imgError } = useDebouncedPreview(imgToJresPreview)

  const imgToJresResult = useMemo(() => {
    if (!imgInput.trim()) return ''
    try {
      const entry = imageLiteralToJresEntry(imgInput, jresId, displayName)
      return JSON.stringify(entry, null, 2)
    } catch (err: unknown) {
      return `Error: ${err instanceof Error ? err.message : String(err)}`
    }
  }, [imgInput, jresId, displayName])

  // PNG → img + jres
  const [pngFile, setPngFile] = useState<File | null>(null)
  const [pngMode, setPngMode] = useState<'top-row' | 'pxt-json' | 'default'>('default')
  const [pxtJsonPalette, setPxtJsonPalette] = useState<string>('')
  const [spriteSheet, setSpriteSheet] = useState(false)
  const [spriteWidth, setSpriteWidth] = useState('16')
  const [spriteHeight, setSpriteHeight] = useState('16')
  const [spriteCount, setSpriteCount] = useState('4')
  const [pngResult, setPngResult] = useState<{
    img?: string
    jres?: string
    frames?: string[]
    imageArray?: string
    animationStarter?: string
    width: number
    height: number
    palette: string[]
  } | null>(null)
  const [pngStatus, setPngStatus] = useState<'idle' | 'converting' | 'done' | 'error'>('idle')
  const [pngError, setPngError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const pngPreview = useCallback(() => {
    if (!pngResult) return null
    if (pngResult.frames && pngResult.frames.length > 0) {
      const { width, height, pixels } = imageLiteralToBitmap(pngResult.frames[0])
      return { pixels, width, height, palette: pngResult.palette }
    }
    if (!pngResult.img) return null
    const { pixels } = imageLiteralToBitmap(pngResult.img)
    return { pixels, width: pngResult.width, height: pngResult.height, palette: pngResult.palette }
  }, [pngResult])
  const { canvasRef: pngCanvasRef, error: pngPreviewError } = useDebouncedPreview(pngPreview)

  const convertPng = useCallback(
    async (file: File) => {
      if (pngStatus === 'converting') return
      setPngStatus('converting')
      setPngResult(null)
      setPngError(null)

      try {
        const { width, height, data } = await loadPngFile(file)

        let parsedPxtJsonPalette: string[] | undefined
        if (pngMode === 'pxt-json' && pxtJsonPalette.trim()) {
          try {
            parsedPxtJsonPalette = JSON.parse(pxtJsonPalette.trim()) as string[]
          } catch {
            throw new Error('Invalid palette JSON')
          }
        }

        const { width: outWidth, height: outHeight, pixels, palette } = pngToImageDataFromRgba(
          { width, height, data },
          pngMode,
          parsedPxtJsonPalette,
        )

        if (spriteSheet) {
          const sw = parseInt(spriteWidth, 10)
          const sh = parseInt(spriteHeight, 10)
          const sc = parseInt(spriteCount, 10)

          if (!Number.isInteger(sw) || sw <= 0) {
            throw new Error('Sprite width must be a positive integer')
          }
          if (!Number.isInteger(sh) || sh <= 0) {
            throw new Error('Sprite height must be a positive integer')
          }
          if (!Number.isInteger(sc) || sc <= 0) {
            throw new Error('Sprite count must be a positive integer')
          }

          const frameBuffers = sliceSpriteSheet(pixels, outWidth, outHeight, sw, sh, sc)
          const frames = frameBuffers.map((buffer) => bitmapToImageLiteral(buffer, sw, sh))
          const imageArray = formatImageArray(frames)
          const animationStarter = formatAnimationStarter(frames)

          setPngResult({
            frames,
            imageArray,
            animationStarter,
            width: sw,
            height: sh,
            palette,
          })
          setPngStatus('done')
          return
        }

        const displayName = file.name.replace(/\.png$/i, '').replace(/[^a-zA-Z0-9_-]/g, '_')
        const id = `myImages.image${displayName}`

        const jres = bitmapDataToJresEntry(pixels, outWidth, outHeight, id, displayName)
        const img = bitmapToImageLiteral(pixels, outWidth, outHeight)

        setPngResult({
          jres: JSON.stringify(jres, null, 2),
          img,
          width: outWidth,
          height: outHeight,
          palette,
        })
        setPngStatus('done')
      } catch (err: unknown) {
        console.error('[png] Conversion error:', err)
        setPngError(err instanceof Error ? err.message : 'Conversion failed')
        setPngStatus('error')
      }
    },
    [pngMode, pxtJsonPalette, spriteSheet, spriteWidth, spriteHeight, spriteCount, pngStatus],
  )

  const handlePngFile = (file: File | null | undefined) => {
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.png') && file.type !== 'image/png') {
      setPngStatus('error')
      return
    }
    setPngFile(file)
    void convertPng(file)
  }

  // jres → img
  const [jresInput, setJresInput] = useState<string>('')

  const jresToImgPreview = useCallback(() => {
    if (!jresInput.trim()) return null
    try {
      const { width, height, pixels } = jresDataToBitmapData(jresInput.trim())
      return { pixels, width, height, palette: DEFAULT_PALETTE }
    } catch {
      return null
    }
  }, [jresInput])
  const { canvasRef: jresCanvasRef, error: jresError } = useDebouncedPreview(jresToImgPreview)

  const jresToImgResult = useMemo(() => {
    if (!jresInput.trim()) return ''
    try {
      return jresDataToImageLiteral(jresInput.trim())
    } catch (err: unknown) {
      return `Error: ${err instanceof Error ? err.message : String(err)}`
    }
  }, [jresInput])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-2 border-b-4 border-makecode-black pb-2">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={[
              'px-4 py-2 font-sans text-sm font-bold border-4 transition-colors',
              activeTab === tab.id
                ? 'bg-makecode-yellow text-makecode-black border-makecode-black'
                : 'bg-makecode-white text-makecode-black border-makecode-black hover:bg-makecode-cyan',
            ].join(' ')}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'img-to-jres' && (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-1">
              <span className="font-sans text-sm font-bold">img literal</span>
              <textarea
                value={imgInput}
                onChange={(e) => setImgInput(e.target.value)}
                placeholder="img`\n. . 1 1 1 .\n. 2 2 2 2 .\n`"
                className={`h-64 ${textareaClass}`}
              />
            </label>
            <div className="grid grid-cols-2 gap-4">
              <label className="flex flex-col gap-1">
                <span className="font-sans text-sm font-bold">id</span>
                <input
                  type="text"
                  value={jresId}
                  onChange={(e) => setJresId(e.target.value)}
                  className={inputClass}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="font-sans text-sm font-bold">displayName</span>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className={inputClass}
                />
              </label>
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-sans text-sm font-bold">.jres entry</span>
              <pre className={`${preClass} max-h-48`}>
                {imgToJresResult || 'Paste an img literal to generate the .jres entry.'}
              </pre>
              {imgToJresResult && !imgToJresResult.startsWith('Error') && (
                <button onClick={() => copy(imgToJresResult)} className={copyBtnClass}>
                  Copy .jres JSON
                </button>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <span className="font-sans text-sm font-bold">Preview</span>
            {imgError && <p className="font-sans text-sm text-makecode-red">{imgError}</p>}
            <canvas
              ref={imgCanvasRef}
              className="border-4 border-makecode-black bg-makecode-white"
              style={{ imageRendering: 'pixelated' }}
            />
          </div>
        </div>
      )}

      {activeTab === 'png-to-img' && (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label className="font-sans text-sm font-bold">Palette source</label>
              <select
                value={pngMode}
                onChange={(e) => setPngMode(e.target.value as 'top-row' | 'pxt-json' | 'default')}
                className={inputClass}
              >
                <option value="top-row">Top-row palette</option>
                <option value="pxt-json">Pasted pxt.json palette</option>
                <option value="default">Default MakeCode Arcade palette</option>
              </select>
            </div>

            <div className="border-4 border-makecode-black bg-makecode-tan p-4">
              <p className="font-sans text-sm leading-relaxed text-makecode-black">
                {pngMode === 'top-row' && (
                  <>
                    Put your colors in the first top row of pixels, one pixel per color. They will be assigned their index based on their position (transparent pixels are ignored).
                  </>
                )}
                {pngMode === 'pxt-json' && (
                  <>
                    Copy and paste a palette from the <code className={codeClass}>pxt.json</code> file — you can find it when viewing files in the JavaScript view. It should be a JSON array of 16 hex colors.
                  </>
                )}
                {pngMode === 'default' && (
                  <>Use the built-in 16-color MakeCode Arcade palette.</>
                )}
              </p>
            </div>

            {pngMode === 'pxt-json' && (
              <label className="flex flex-col gap-1">
                <span className="font-sans text-sm font-bold">
                  pxt.json palette (JSON array of 16 hex colors, copied from pxt.json)
                </span>
                <textarea
                  value={pxtJsonPalette}
                  onChange={(e) => setPxtJsonPalette(e.target.value)}
                  placeholder='["#000000","#ffffff",...]'
                  className={`h-24 ${textareaClass}`}
                />
              </label>
            )}

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={spriteSheet}
                onChange={(e) => setSpriteSheet(e.target.checked)}
                className="h-4 w-4 border-makecode-black focus:ring-makecode-yellow"
              />
              <span className="font-sans text-sm font-bold">Sprite sheet</span>
            </label>

            {spriteSheet && (
              <div className="grid grid-cols-3 gap-4">
                <label className="flex flex-col gap-1">
                  <span className="font-sans text-sm font-bold">Sprite width (px)</span>
                  <input
                    type="number"
                    min={1}
                    value={spriteWidth}
                    onChange={(e) => setSpriteWidth(e.target.value)}
                    className={inputClass}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="font-sans text-sm font-bold">Sprite height (px)</span>
                  <input
                    type="number"
                    min={1}
                    value={spriteHeight}
                    onChange={(e) => setSpriteHeight(e.target.value)}
                    className={inputClass}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="font-sans text-sm font-bold">Sprite count</span>
                  <input
                    type="number"
                    min={1}
                    value={spriteCount}
                    onChange={(e) => setSpriteCount(e.target.value)}
                    className={inputClass}
                  />
                </label>
              </div>
            )}

            <div
              className={[
                'border-4 border-dashed border-makecode-black bg-makecode-white p-10 text-center cursor-pointer transition-colors',
                dragOver ? 'bg-makecode-cyan' : 'hover:bg-makecode-cyan',
                pngStatus === 'converting' ? 'pointer-events-none opacity-50' : '',
              ].join(' ')}
              onDragOver={(e) => {
                e.preventDefault()
                setDragOver(true)
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault()
                setDragOver(false)
                handlePngFile(e.dataTransfer.files[0])
              }}
              onClick={() => pngStatus !== 'converting' && fileInputRef.current?.click()}
            >
              <p className="font-sans text-sm font-bold text-makecode-black">
                {pngStatus === 'converting' ? 'Converting…' : 'Drop a .png file here, or click to browse'}
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".png,image/png"
                className="hidden"
                onChange={(e) => handlePngFile(e.target.files?.[0])}
              />
            </div>

            {pngFile && (
              <p className="font-sans text-sm font-bold text-makecode-black">{pngFile.name}</p>
            )}
            {pngStatus === 'error' && (
              <p className="font-sans text-sm text-makecode-red">
                {pngError ?? 'Conversion failed. Try again.'}
              </p>
            )}

            <div className="border-4 border-makecode-black bg-makecode-tan p-4">
              <p className="font-sans text-sm leading-relaxed text-makecode-black">
                The <code className={codeClass}>img</code> and <code className={codeClass}>.jres</code> outputs are useful when importing into Visual Studio Code. There are no MakeCode blocks that convert <code className={codeClass}>img</code> to <code className={codeClass}>.jres</code> for you, so you need to copy both outputs into the right files: paste the <code className={codeClass}>img</code> literal into <code className={codeClass}>images.g.ts</code> and the <code className={codeClass}>.jres</code> entry into <code className={codeClass}>images.g.jres</code>. This pattern has worked best for embedding the image properly in the game.
              </p>
            </div>

            {pngResult && (
              <div className="flex flex-col gap-2">
                {pngResult.img && (
                  <>
                    <span className="font-sans text-sm font-bold">img literal</span>
                    <pre className={`${preClass} max-h-48`}>{pngResult.img}</pre>
                    <button onClick={() => copy(pngResult.img!)} className={copyBtnClass}>
                      Copy img literal
                    </button>
                  </>
                )}
                {pngResult.jres && (
                  <>
                    <span className="font-sans text-sm font-bold mt-2">.jres entry</span>
                    <pre className={`${preClass} max-h-48`}>{pngResult.jres}</pre>
                    <button onClick={() => copy(pngResult.jres!)} className={copyBtnClass}>
                      Copy .jres JSON
                    </button>
                  </>
                )}
                {pngResult.imageArray && (
                  <>
                    <span className="font-sans text-sm font-bold">Image array</span>
                    <pre className={`${preClass} max-h-48`}>{pngResult.imageArray}</pre>
                    <button onClick={() => copy(pngResult.imageArray!)} className={copyBtnClass}>
                      Copy image array
                    </button>
                  </>
                )}
                {pngResult.animationStarter && (
                  <>
                    <span className="font-sans text-sm font-bold mt-2">Animation starter</span>
                    <pre className={`${preClass} max-h-48`}>{pngResult.animationStarter}</pre>
                    <button onClick={() => copy(pngResult.animationStarter!)} className={copyBtnClass}>
                      Copy animation code
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <span className="font-sans text-sm font-bold">Preview</span>
            {pngPreviewError && (
              <p className="font-sans text-sm text-makecode-red">{pngPreviewError}</p>
            )}
            <canvas
              ref={pngCanvasRef}
              className="border-4 border-makecode-black bg-makecode-white"
              style={{ imageRendering: 'pixelated' }}
            />
          </div>
        </div>
      )}

      {activeTab === 'jres-to-img' && (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-1">
              <span className="font-sans text-sm font-bold">.jres data (base64)</span>
              <textarea
                value={jresInput}
                onChange={(e) => setJresInput(e.target.value)}
                placeholder="hwQXABc..."
                className={`h-40 ${textareaClass}`}
              />
            </label>
            <div className="flex flex-col gap-1">
              <span className="font-sans text-sm font-bold">img literal</span>
              <pre className={preClass}>
                {jresToImgResult || 'Paste a .jres data string to decode it.'}
              </pre>
              {jresToImgResult && !jresToImgResult.startsWith('Error') && (
                <button onClick={() => copy(jresToImgResult)} className={copyBtnClass}>
                  Copy img literal
                </button>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <span className="font-sans text-sm font-bold">Preview</span>
            {jresError && <p className="font-sans text-sm text-makecode-red">{jresError}</p>}
            <canvas
              ref={jresCanvasRef}
              className="border-4 border-makecode-black bg-makecode-white"
              style={{ imageRendering: 'pixelated' }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
