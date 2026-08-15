// One Minute Arcade — MakeCode-only runtime.
// Ported from make-web /twominute app.js with all NES/jsnes, ROM loading,
// audio buffer, FrameTimer, RingBuffer, PNG upload, and gamepad mapping code
// removed. The MakeCode simulator handles its own input and audio inside the
// iframe.

// Load the canonical version config at module evaluation time so all simulator
// references are consistent without having to rewrite this static file.
async function loadArcadeVersion() {
  try {
    const res = await fetch('/arcade-version.json')
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json()
  } catch (err) {
    console.error('Failed to load /arcade-version.json, using defaults', err)
    return {
      simUrl: '/simulator/4.1.6/slim.html',
      cdnUrl: '/simulator/4.1.6/cdn',
      targetVersion: '4.1.6'
    }
  }
}

const arcadeVersion = await loadArcadeVersion()
const SIM_URL = arcadeVersion.simUrl
const DEFAULT_CDN_URL = arcadeVersion.cdnUrl
const DEFAULT_TARGET_VERSION = arcadeVersion.targetVersion

const state = {
  timerElement: null,
  makecodeIframe: null,
  gameList: [],
  currentGameIndex: -1,
  countdownTimer: null,
  timeRemaining: 0,
  playedGames: [],
  hasStarted: false,
  pendingGameIndex: -1,
  pendingMarkAsPlayed: true
}

const loadGameList = async () => {
  try {
    const response = await fetch('/arcade/games.json')
    const data = await response.json()
    state.gameList = data.games
    console.log(`Loaded ${state.gameList.length} games`)
  } catch (error) {
    console.error('Error loading game list:', error)
    state.gameList = []
  }
}

const showMakeCode = () => {
  if (state.makecodeIframe) {
    state.makecodeIframe.classList.add('active')
  }
  // Focus the iframe after a short delay to ensure it's ready
  setTimeout(() => state.makecodeIframe?.focus(), 100)
}

const loadMakeCodeGame = async (binaryPath) => {
  const iframe = state.makecodeIframe
  if (!iframe) return

  showMakeCode()

  try {
    const response = await fetch(binaryPath)
    if (!response.ok) {
      throw new Error(`Failed to load game: ${response.status}`)
    }

    const code = await response.text()

    // Parse metadata (binary.js may or may not have a meta header)
    let meta = {
      cdnUrl: DEFAULT_CDN_URL,
      version: 'arcade',
      targetVersion: DEFAULT_TARGET_VERSION,
    }
    code.replace(/^\/\/\s+meta=([^\n]+)\n/m, function (m, metasrc) {
      meta = JSON.parse(metasrc)
      return m
    })

    // Attach listener BEFORE setting iframe src to avoid missing the 'ready' event
    const handleMessage = (ev) => {
      if (ev.data.type === 'ready') {
        const runMsg = {
          type: 'run',
          parts: [],
          code: code,
          partDefinitions: {},
          cdnUrl: meta.cdnUrl,
          version: meta.targetVersion,
          storedState: {},
          frameCounter: 1,
          options: {
            theme: 'green',
            player: '',
          },
          id: 'game-' + Math.random(),
        }

        iframe.contentWindow?.postMessage(runMsg, '*')
        // Unmute on Safari — the simulator shows a mute button because Safari
        // suspends audio in iframes; sending this message bypasses it since
        // the user has already interacted with the parent page.
        setTimeout(() => iframe.contentWindow?.postMessage({ type: 'mute', mute: false }, '*'), 300)
        window.removeEventListener('message', handleMessage)
      }
    }

    window.addEventListener('message', handleMessage)

    // Now load the simulator — ready event won't fire until after this
    iframe.src = SIM_URL
  } catch (err) {
    console.error('[makecode] Error loading:', err)
    // Fall back to loading a random game
    loadRandomGame()
  }
}

const loadGameByName = (name) => {
  const gameIndex = state.gameList.findIndex(g => g.name.toLowerCase() === name.toLowerCase())
  if (gameIndex >= 0) {
    console.log(`Queueing requested game: ${name}`)
    state.pendingGameIndex = gameIndex
    state.pendingMarkAsPlayed = false
    return true
  }
  console.warn(`Game not found: ${name}`)
  // Show the game-not-found overlay instead of silently falling through.
  const notFound = document.getElementById('game-not-found')
  const nameSpan = document.getElementById('game-not-found-name')
  if (nameSpan) nameSpan.textContent = name
  if (notFound) notFound.classList.add('active')
  // Leave pendingGameIndex at -1 so no game auto-loads on click-to-start.
  state.pendingGameIndex = -1
  return false
}

const loadSpecificGame = (gameIndex, markAsPlayed = true) => {
  if (gameIndex < 0 || gameIndex >= state.gameList.length) {
    console.error('Invalid game index:', gameIndex)
    return
  }

  const errorOverlay = document.getElementById('upload-error')
  if (errorOverlay) errorOverlay.classList.remove('active')

  state.currentGameIndex = gameIndex

  if (markAsPlayed && !state.playedGames.includes(gameIndex)) {
    state.playedGames.push(gameIndex)
  }

  const game = state.gameList[gameIndex]
  console.log(`Loading game: ${game.name}`)

  loadMakeCodeGame(game.path)
  resetTimer()
}

const updateTimerDisplay = () => {
  const minutes = Math.floor(state.timeRemaining / 60)
  const seconds = state.timeRemaining % 60
  const secondsStr = seconds.toString().padStart(2, '0')

  const digits = state.timerElement.querySelectorAll('.digit')
  if (digits.length >= 3) {
    digits[0].textContent = minutes.toString()
    digits[1].textContent = secondsStr[0]
    digits[2].textContent = secondsStr[1]
  }
}

const resetTimer = () => {
  if (state.countdownTimer) {
    clearInterval(state.countdownTimer)
  }

  state.timeRemaining = parseInt(state.timerElement?.dataset?.duration ?? '60', 10) || 60
  updateTimerDisplay()

  state.countdownTimer = setInterval(() => {
    state.timeRemaining--
    updateTimerDisplay()

    if (state.timeRemaining <= 0) {
      loadRandomGame()
    }
  }, 1000)
}

const loadRandomGame = () => {
  if (state.gameList.length === 0) {
    return
  }

  // If all games have been played, reset the played list
  if (state.playedGames.length >= state.gameList.length) {
    console.log('All games played! Resetting played games list.')
    state.playedGames = []
  }

  // Get list of unplayed game indices
  const unplayedIndices = []
  for (let i = 0; i < state.gameList.length; i++) {
    if (!state.playedGames.includes(i)) {
      unplayedIndices.push(i)
    }
  }

  // Pick a random unplayed game
  const randomUnplayedIndex = Math.floor(Math.random() * unplayedIndices.length)
  const newIndex = unplayedIndices[randomUnplayedIndex]

  state.currentGameIndex = newIndex
  state.playedGames.push(newIndex)

  const game = state.gameList[state.currentGameIndex]
  console.log(
    `Loading game ${state.playedGames.length}/${state.gameList.length}: ${game.name}`
  )

  loadMakeCodeGame(game.path)
  resetTimer()
}

const resetCurrentGame = () => {
  if (state.currentGameIndex >= 0 && state.gameList[state.currentGameIndex]) {
    const game = state.gameList[state.currentGameIndex]
    loadMakeCodeGame(game.path)
  }
}

const resumeAudioContext = () => {
  // Hide the overlay and start the first game on the first user gesture,
  // independent of AudioContext state. Safari's resume() promise can fail to
  // resolve, and the context may already be running after a prior gesture on
  // the site, so the start flow must not be gated on either condition.
  const clickToStart = document.getElementById('click-to-start')
  if (clickToStart) {
    clickToStart.style.display = 'none'
  }

  // Load the first game after user interaction
  if (!state.hasStarted) {
    state.hasStarted = true
    if (state.pendingGameIndex !== -1) {
      loadSpecificGame(state.pendingGameIndex, state.pendingMarkAsPlayed)
      state.pendingGameIndex = -1
    } else {
      loadRandomGame()
    }
  }
}

const setupInput = () => {
  document.addEventListener('keydown', () => {
    resumeAudioContext()
  })

  document.addEventListener('click', (e) => {
    resumeAudioContext()
    if (state.makecodeIframe && !state.makecodeIframe.contains(e.target)) {
      state.makecodeIframe.focus()
    }
  })

  const resetButton = document.getElementById('reset-button')
  if (resetButton) {
    resetButton.addEventListener('click', () => {
      resetCurrentGame()
    })
  }

  window.addEventListener('message', (ev) => {
    if (ev.data?.type === 'simulator' && ev.data?.command === 'restart') {
      resetCurrentGame()
    }
  })

  // Game-not-found overlay: clicking the link dismisses the overlay and
  // loads a random game.
  const notFoundLink = document.getElementById('game-not-found-link')
  if (notFoundLink) {
    notFoundLink.addEventListener('click', (e) => {
      e.preventDefault()
      const notFound = document.getElementById('game-not-found')
      if (notFound) notFound.classList.remove('active')
      state.hasStarted = true
      loadRandomGame()
    })
  }
}

const init = async () => {
  state.timerElement = document.getElementById('timer')
  state.makecodeIframe = document.getElementById('makecode-frame')
  const dataDuration = parseInt(state.timerElement?.dataset?.duration ?? '60', 10)
  state.timeRemaining = (isNaN(dataDuration) || dataDuration < 1) ? 60 : dataDuration

  // Show click-to-start overlay
  const clickToStart = document.getElementById('click-to-start')
  if (clickToStart) {
    clickToStart.style.display = 'flex'
  }

  await loadGameList()

  // Check if a specific game was requested via search param
  const requestedGame = document.getElementById('requested-game')?.value
  if (requestedGame) {
    loadGameByName(requestedGame)
  }

  setupInput()
  // Don't load game until user clicks (unless loaded via search param above)
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      init()
    })
  } else {
    init()
  }
}
