import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { GLTFLoader }    from 'three/examples/jsm/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { DRACOLoader }   from 'three/examples/jsm/loaders/DRACOLoader.js'

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

/* ─── Three.js scene setup ─── */
function buildScene(mount, onLoad, onError) {
  const w = mount.clientWidth
  const h = mount.clientHeight

  /* Renderer */
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
  renderer.setSize(w, h)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 0.9
  mount.appendChild(renderer.domElement)

  /* Scene */
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x08090b)
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
  ground.position.y = -0.82
  ground.receiveShadow = true
  scene.add(ground)

  /* Grid lines on ground */
  const grid = new THREE.GridHelper(20, 30, 0x1e2230, 0x1e2230)
  grid.position.y = -0.81
  scene.add(grid)

  /* Controls */
  const controls = new OrbitControls(camera, renderer.domElement)
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

  const MODEL_URL =
    'https://threejs.org/examples/models/gltf/ferrari.glb'

  loader.load(
    MODEL_URL,
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
      car.scale.setScalar(0.52)
      car.position.set(0, -0.82, 0)
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

/* ─── Inline (non-modal) viewer ─── */
export function InlineCarViewer({ height = 360 }) {
  const mountRef            = useRef(null)
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    if (!mountRef.current) return
    return buildScene(mountRef.current, () => setStatus('ready'), () => setStatus('error'))
  }, [])

  return (
    <div
      ref={mountRef}
      className="relative w-full rounded-2xl overflow-hidden"
      style={{ height, border: '1px solid rgba(255,255,255,0.07)' }}
    >
      {status === 'loading' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10">
          <div className="w-8 h-8 rounded-full border-2 border-white/10 border-t-accent animate-spin" />
          <p className="text-body text-xs font-mono">Rendering 3D model…</p>
        </div>
      )}
      {status === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 z-10">
          <p className="text-muted text-sm font-mono">3D preview unavailable</p>
        </div>
      )}
      {status === 'ready' && (
        <div className="absolute bottom-3 left-3 z-10 pointer-events-none">
          <span
            className="font-mono text-xs text-muted"
            style={{ background: 'rgba(8,9,11,0.6)', backdropFilter: 'blur(4px)', padding: '4px 8px', borderRadius: '6px' }}
          >
            drag to rotate · scroll to zoom
          </span>
        </div>
      )}
    </div>
  )
}

/* ─── Modal viewer (per-mod) ─── */
export function CarViewer3D({ mod, vehicle, onClose }) {
  const mountRef              = useRef(null)
  const [status, setStatus]   = useState('loading') // loading | ready | error

  useEffect(() => {
    if (!mountRef.current) return
    const cleanup = buildScene(
      mountRef.current,
      () => setStatus('ready'),
      () => setStatus('error'),
    )
    return cleanup
  }, [])

  const area    = AREA_LABEL[mod.category] || 'Vehicle'
  const areaPos = AREA_POS[mod.category]   || { top: '40%', left: '50%' }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-obsidian/90 backdrop-blur-2xl">
      <div
        className="relative w-full bg-surface rounded-3xl overflow-hidden shadow-card-lg"
        style={{ maxWidth: '960px', border: '1px solid rgba(255,255,255,0.09)' }}
      >
        {/* ── Header ── */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
        >
          <div>
            <h2 className="font-display font-black text-white text-xl tracking-tight">
              {vehicle.year} {vehicle.make} {vehicle.model}
            </h2>
            <p className="text-body text-sm mt-0.5">
              <span className="text-accent font-medium">{mod.name}</span>
              <span className="text-muted mx-2">·</span>
              affects <span className="text-white">{area}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/[0.06] flex items-center justify-center text-muted hover:text-white hover:bg-white/[0.1] transition-all"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* ── 3D Canvas ── */}
        <div ref={mountRef} className="relative w-full" style={{ height: '460px' }}>

          {/* Loading overlay */}
          {status === 'loading' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-10">
              <div className="w-10 h-10 rounded-full border-2 border-white/10 border-t-accent animate-spin" />
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
                {/* Pulsing dot */}
                <div className="w-4 h-4 rounded-full bg-accent/30 flex items-center justify-center animate-ping absolute -inset-1" />
                <div className="w-4 h-4 rounded-full bg-accent flex items-center justify-center relative">
                  <div className="w-2 h-2 rounded-full bg-obsidian" />
                </div>
                {/* Label */}
                <div
                  className="absolute left-5 top-1/2 -translate-y-1/2 whitespace-nowrap"
                  style={{
                    background: 'rgba(8,9,11,0.85)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255,140,0,0.3)',
                    borderRadius: '8px',
                    padding: '4px 10px',
                  }}
                >
                  <span className="font-mono text-xs text-accent font-semibold">{area}</span>
                </div>
              </div>
            </div>
          )}

          {/* Controls hint */}
          {status === 'ready' && (
            <div className="absolute bottom-3 left-3 z-10 pointer-events-none">
              <span
                className="font-mono text-xs text-muted"
                style={{ background: 'rgba(8,9,11,0.6)', backdropFilter: 'blur(4px)', padding: '4px 8px', borderRadius: '6px' }}
              >
                drag to rotate · scroll to zoom
              </span>
            </div>
          )}
        </div>

        {/* ── Footer — mod detail ── */}
        <div
          className="px-6 py-4 flex items-start gap-4"
          style={{ borderTop: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}
        >
          <div className="flex-1">
            <p className="text-body text-sm leading-relaxed">{mod.description}</p>
          </div>
          <div className="flex-shrink-0 text-right">
            <div className="font-display font-black text-white text-lg leading-none">
              ${mod.price_min?.toLocaleString()} – ${mod.price_max?.toLocaleString()}
            </div>
            <div className="font-mono text-xs text-muted mt-1 uppercase tracking-wider">Est. Cost</div>
          </div>
        </div>

        {/* Note about model */}
        <div className="px-6 pb-4">
          <p className="font-mono text-xs text-muted">
            3D model shown is representative — vehicle-specific models coming in v2.
          </p>
        </div>
      </div>
    </div>
  )
}
