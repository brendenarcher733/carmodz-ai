import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { GLTFLoader }    from 'three/examples/jsm/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { DRACOLoader }   from 'three/examples/jsm/loaders/DRACOLoader.js'
import { Spinner } from './Spinner'
import { Button } from './Button'
import { classifyVehicle } from '../../lib/vehicleUtils'

/* Small translucent label used for the orbit-controls hint — was inline
   `style={{}}` duplicated verbatim in two places in this file. */
function HintPill({ children }) {
  return (
    <span className="glass font-mono text-xs text-muted rounded-md px-2 py-1">
      {children}
    </span>
  )
}

/* ─── Map mod category to which part of the car it affects ─── */
const AREA_LABEL = {
  performance: 'Engine Bay',
  reliability: 'Engine Bay',
  handling:    'Suspension & Wheels',
  sound:       'Exhaust System',
  cosmetic:    'Body & Exterior',
  interior:    'Interior Cabin',
}

/* Rough canvas position overlay per area (percentage from top-left) */
const AREA_POS = {
  performance: { top: '38%', left: '22%' },
  reliability: { top: '38%', left: '22%' },
  handling:    { top: '72%', left: '28%' },
  sound:       { top: '62%', right: '14%', left: 'auto' },
  cosmetic:    { top: '28%', left: '48%' },
  interior:    { top: '32%', left: '46%' },
}

/* ─── Three.js scene setup ───
   `modelUrl` defaults to the Ferrari GLB — the per-mod modal's existing
   behavior — so parameterizing this for other call sites (the Landing hero,
   the vehicle-matched modal fix) doesn't change anything for existing
   callers that don't pass it. `interactive=false` disables orbit/zoom
   controls for decorative, non-modal placements (still auto-rotates).
   `groundY`/`modelScale`/`modelPositionY` default to the exact values this
   scene already used for the hardcoded Ferrari — so any call site that
   doesn't pass them (the existing per-mod modal) renders byte-identically
   to before. The vehicle-matched modal (below) passes the kenney-model
   ground/scale/offset triple exactly as authored in lib/vehicleUtils.js
   and proven working in the Configurator's own (separate, react-three-fiber)
   scene — ported as-is rather than re-derived, since there's no way to
   visually re-tune 3D placement in this environment. */
function buildScene(mount, onLoad, onError, {
  modelUrl,
  modelScale = 0.52,
  modelPositionY = -0.82,
  groundY = -0.82,
  interactive = true,
  alpha = false,
} = {}) {
  const w = mount.clientWidth
  const h = mount.clientHeight

  /* Renderer */
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha })
  renderer.setSize(w, h)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 0.9
  mount.appendChild(renderer.domElement)

  /* Scene */
  const scene = new THREE.Scene()
  if (!alpha) scene.background = new THREE.Color(0x08090b)
  scene.fog = new THREE.FogExp2(0x08090b, 0.04)

  /* Camera */
  const camera = new THREE.PerspectiveCamera(48, w / h, 0.1, 100)
  camera.position.set(5, 2, 5)

  /* Lights */
  scene.add(new THREE.AmbientLight(0xffffff, 0.4))

  const key = new THREE.DirectionalLight(0xffffff, 3)
  key.position.set(6, 10, 6)
  key.castShadow = true
  key.shadow.camera.near = 0.5
  key.shadow.camera.far = 30
  key.shadow.camera.left = -8
  key.shadow.camera.right = 8
  key.shadow.camera.top = 8
  key.shadow.camera.bottom = -8
  key.shadow.mapSize.set(2048, 2048)
  scene.add(key)

  const fill = new THREE.DirectionalLight(0x8899ff, 1)
  fill.position.set(-6, 4, -6)
  scene.add(fill)

  /* Orange accent = brand accent colour */
  const accent = new THREE.PointLight(0xff8c00, 2.5, 12)
  accent.position.set(-5, 1, 3)
  scene.add(accent)

  /* Reflective ground */
  const groundMat = new THREE.MeshStandardMaterial({
    color: 0x0d0e13,
    roughness: 0.4,
    metalness: 0.6,
  })
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), groundMat)
  ground.rotation.x = -Math.PI / 2
  ground.position.y = groundY
  ground.receiveShadow = true
  scene.add(ground)

  /* Grid lines on ground */
  const grid = new THREE.GridHelper(20, 30, 0x1e2230, 0x1e2230)
  grid.position.y = groundY + 0.01
  scene.add(grid)

  /* Controls */
  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enabled = interactive
  controls.enablePan = false
  controls.minDistance = 3
  controls.maxDistance = 14
  controls.maxPolarAngle = Math.PI / 2.05
  controls.autoRotate = true
  controls.autoRotateSpeed = 0.6
  controls.enableDamping = true
  controls.dampingFactor = 0.06

  /* Load car model */
  const draco = new DRACOLoader()
  draco.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/')
  const loader = new GLTFLoader()
  loader.setDRACOLoader(draco)

  const resolvedModelUrl = modelUrl || 'https://threejs.org/examples/models/gltf/ferrari.glb'

  loader.load(
    resolvedModelUrl,
    (gltf) => {
      const car = gltf.scene
      car.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true
          child.receiveShadow = true
          /* Give the body panels a subtle sheen */
          if (child.material) {
            child.material.envMapIntensity = 1.2
          }
        }
      })
      car.scale.setScalar(modelScale)
      car.position.set(0, modelPositionY, 0)
      scene.add(car)
      onLoad()
    },
    undefined,
    () => onError(),
  )

  /* Animation loop */
  let raf
  const tick = () => {
    raf = requestAnimationFrame(tick)
    controls.update()
    renderer.render(scene, camera)
  }
  tick()

  /* Resize */
  const handleResize = () => {
    const nw = mount.clientWidth
    const nh = mount.clientHeight
    camera.aspect = nw / nh
    camera.updateProjectionMatrix()
    renderer.setSize(nw, nh)
  }
  window.addEventListener('resize', handleResize)

  return () => {
    cancelAnimationFrame(raf)
    window.removeEventListener('resize', handleResize)
    controls.dispose()
    renderer.dispose()
    if (mount.contains(renderer.domElement)) {
      mount.removeChild(renderer.domElement)
    }
  }
}

/* ─── Inline (non-modal) viewer ───
   `bare` drops the border/rounded-corner card chrome and the drag/zoom hint
   pill — for decorative, non-interactive placements (the Landing hero)
   where this needs to blend into a background rather than read as a
   bordered widget. `interactive=false` there also disables orbit/zoom. */
export function InlineCarViewer({ height = 360, modelUrl, interactive = true, alpha = false, bare = false }) {
  const mountRef            = useRef(null)
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    if (!mountRef.current) return
    return buildScene(
      mountRef.current,
      () => setStatus('ready'),
      () => setStatus('error'),
      { modelUrl, interactive, alpha },
    )
  }, [modelUrl, interactive, alpha])

  return (
    <div
      ref={mountRef}
      className={bare ? 'relative w-full' : 'relative w-full rounded-2xl overflow-hidden border border-white/[0.07]'}
      style={{ height }}
    >
      {status === 'loading' && !bare && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10">
          <Spinner size="md" className="w-8 h-8" />
          <p className="text-body text-xs font-mono">Rendering 3D model…</p>
        </div>
      )}
      {status === 'error' && !bare && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 z-10">
          <p className="text-muted text-sm font-mono">3D preview unavailable</p>
        </div>
      )}
      {status === 'ready' && !bare && (
        <div className="absolute bottom-3 left-3 z-10 pointer-events-none">
          <HintPill>drag to rotate · scroll to zoom</HintPill>
        </div>
      )}
    </div>
  )
}

/* ─── Modal viewer (per-mod) ─── */
export function CarViewer3D({ mod, vehicle, onClose }) {
  const mountRef              = useRef(null)
  const [status, setStatus]   = useState('loading') // loading | ready | error

  /* Body-style-matched model instead of always showing the Ferrari — reuses
     the same classifyVehicle() classifier already driving the Configurator's
     model picker. The exotic/sports/porsche classes still resolve to the
     Ferrari GLB (that's classifyVehicle's own mapping, not a special case
     here), so those three keep the exact scale/position tuning this scene
     already had — only non-Ferrari classes pass a different model, and they
     reuse the ground/scale/offset triple exactly as authored in
     lib/vehicleUtils.js and already proven in the Configurator's own scene,
     rather than re-deriving new numbers for this renderer. */
  const vehicleClass = classifyVehicle(vehicle.make, vehicle.model, vehicle.year)
  const isFerrari     = vehicleClass.type === 'ferrari'

  useEffect(() => {
    if (!mountRef.current) return
    const cleanup = buildScene(
      mountRef.current,
      () => setStatus('ready'),
      () => setStatus('error'),
      isFerrari ? {} : {
        modelUrl: vehicleClass.model,
        modelScale: vehicleClass.scale,
        modelPositionY: vehicleClass.yOffset,
        groundY: -0.02,
      },
    )
    return cleanup
  }, [vehicleClass.model])

  const area    = AREA_LABEL[mod.category] || 'Vehicle'
  const areaPos = AREA_POS[mod.category]   || { top: '40%', left: '50%' }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-obsidian/90 backdrop-blur-2xl">
      <div
        className="relative w-full bg-surface rounded-3xl shadow-card-lg border border-white/[0.09] overflow-y-auto md:overflow-hidden"
        style={{ maxWidth: '960px', maxHeight: 'calc(100dvh - 2rem)' }}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between gap-3 px-4 md:px-6 py-3 md:py-4 border-b border-white/[0.07]">
          <div className="min-w-0">
            <h2 className="font-display font-black text-white text-lg md:text-xl tracking-tight truncate">
              {vehicle.year} {vehicle.make} {vehicle.model}
            </h2>
            <p className="text-body text-xs md:text-sm mt-0.5 truncate">
              <span className="text-accent font-medium">{mod.name}</span>
              <span className="text-muted mx-2">·</span>
              affects <span className="text-white">{area}</span>
            </p>
          </div>
          <Button onClick={onClose} variant="subtle" size="icon" className="flex-shrink-0">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </Button>
        </div>

        {/* ── 3D Canvas ── */}
        <div ref={mountRef} className="relative w-full h-[300px] md:h-[460px]">

          {/* Loading overlay */}
          {status === 'loading' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-10">
              <Spinner size="lg" />
              <p className="text-body text-sm font-mono">Loading 3D model…</p>
            </div>
          )}

          {/* Error overlay */}
          {status === 'error' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10 px-8 text-center">
              <p className="text-white font-display font-semibold text-base">Couldn't load the 3D model</p>
              <p className="text-body text-sm">Check your connection or try again.</p>
            </div>
          )}

          {/* Mod area annotation — CSS overlay on the canvas */}
          {status === 'ready' && (
            <div className="absolute z-10 pointer-events-none" style={areaPos}>
              <div className="relative">
                <div className="w-4 h-4 rounded-full bg-accent flex items-center justify-center relative">
                  <div className="w-2 h-2 rounded-full bg-obsidian" />
                </div>
                {/* Label — accent-tinted border, so it doesn't use the
                    neutral `.glass` treatment used elsewhere in this file. */}
                <div className="absolute left-5 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-lg border border-accent/30 bg-obsidian/85 backdrop-blur-sm px-2.5 py-1">
                  <span className="font-mono text-xs text-accent font-semibold">{area}</span>
                </div>
              </div>
            </div>
          )}

          {/* Controls hint */}
          {status === 'ready' && (
            <div className="absolute bottom-3 left-3 z-10 pointer-events-none">
              <HintPill>drag to rotate · scroll to zoom</HintPill>
            </div>
          )}
        </div>

        {/* ── Footer — mod detail ── */}
        <div className="px-4 md:px-6 py-4 flex flex-col md:flex-row md:items-start gap-3 md:gap-4 border-t border-white/[0.07] bg-white/[0.02]">
          <div className="flex-1">
            <p className="text-body text-sm leading-relaxed">{mod.description}</p>
          </div>
          <div className="flex-shrink-0 md:text-right">
            <div className="font-display font-black text-white text-lg leading-none">
              ${mod.price_min?.toLocaleString()} – ${mod.price_max?.toLocaleString()}
            </div>
            <div className="font-mono text-xs text-muted mt-1 uppercase tracking-wider">Est. Cost</div>
          </div>
        </div>

        {/* Note about model */}
        <div className="px-4 md:px-6 pb-4">
          <p className="font-mono text-xs text-muted">
            3D model shown is a {vehicleClass.label.toLowerCase()} body-style match, not your exact vehicle.
          </p>
        </div>
      </div>
    </div>
  )
}
