import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { MODIFICATIONS } from '../../data/modifications'

/* ─────────────────────────────────────────────────────────────
   Procedural Ford Mustang Shelby GT500
   Returns a parts map used for real-time material updates.
───────────────────────────────────────────────────────────── */
function buildMustang(scene) {
  /* ── Shared materials ── */
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0xf4f0eb, metalness: 0.40, roughness: 0.30, envMapIntensity: 1.8,
  })
  const glassMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#8fb8d4'), metalness: 0.08, roughness: 0.04,
    transparent: true, opacity: 0.22, side: THREE.DoubleSide, envMapIntensity: 1.2,
  })
  const rimMat = new THREE.MeshStandardMaterial({
    color: 0x999999, metalness: 0.95, roughness: 0.08, envMapIntensity: 1.4,
  })
  const tireMat = new THREE.MeshStandardMaterial({
    color: 0x0d0d0d, metalness: 0.04, roughness: 0.92,
  })
  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xd2d2d2, metalness: 1.0, roughness: 0.04, envMapIntensity: 1.5,
  })
  const headlightMat = new THREE.MeshStandardMaterial({
    color: 0xffffff, emissive: 0xffeedd, emissiveIntensity: 0.9,
    transparent: true, opacity: 0.92, roughness: 0.04,
  })
  const taillightMat = new THREE.MeshStandardMaterial({
    color: 0xff2200, emissive: 0xff1100, emissiveIntensity: 1.1,
    transparent: true, opacity: 0.88, roughness: 0.04,
  })
  const diffuserMat = new THREE.MeshStandardMaterial({
    color: 0x0f0f0f, metalness: 0.05, roughness: 0.85,
  })
  const grilleMat = new THREE.MeshStandardMaterial({
    color: 0x070707, metalness: 0.20, roughness: 0.80,
  })
  const brakeMat = new THREE.MeshStandardMaterial({
    color: 0xcc0000, metalness: 0.30, roughness: 0.60,
  })

  const car = new THREE.Group()

  function add(geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) {
    const m = new THREE.Mesh(geo, mat)
    m.position.set(x, y, z)
    m.rotation.set(rx, ry, rz)
    m.castShadow = true
    m.receiveShadow = true
    car.add(m)
    return m
  }

  /* ── LOWER BODY SILL ── */
  add(new THREE.BoxGeometry(4.20, 0.46, 1.90), bodyMat, 0, 0.23, 0)

  /* ── HOOD (long GT500 hood) ── */
  add(new THREE.BoxGeometry(1.40, 0.06, 1.74), bodyMat, 1.30, 0.57, 0)
  // front slope
  add(new THREE.BoxGeometry(0.30, 0.08, 1.74), bodyMat, 1.95, 0.51, 0, 0, 0, 0.34)
  // center hood scoop
  add(new THREE.BoxGeometry(0.62, 0.07, 0.38), bodyMat, 1.10, 0.65, 0)
  add(new THREE.BoxGeometry(0.44, 0.04, 0.28), grilleMat, 1.10, 0.67, 0)

  /* ── DECK LID (fastback) ── */
  add(new THREE.BoxGeometry(1.00, 0.06, 1.64), bodyMat, -1.36, 0.56, 0)
  // fastback slope
  add(new THREE.BoxGeometry(0.38, 0.07, 1.58), bodyMat, -1.78, 0.51, 0, 0, 0, -0.26)

  /* ── ROOF ── */
  add(new THREE.BoxGeometry(1.90, 0.07, 1.60), bodyMat, -0.08, 1.27, 0)

  /* ── CABIN (above belt line) ── */
  add(new THREE.BoxGeometry(1.98, 0.74, 1.74), bodyMat, -0.08, 0.94, 0)

  /* ── A / C PILLARS ── */
  add(new THREE.BoxGeometry(0.06, 0.60, 0.06), bodyMat, 0.83, 1.07, -0.79, 0, 0, 0.52)
  add(new THREE.BoxGeometry(0.06, 0.60, 0.06), bodyMat, 0.83, 1.07, 0.79, 0, 0, 0.52)
  add(new THREE.BoxGeometry(0.06, 0.62, 0.06), bodyMat, -1.02, 1.06, -0.78, 0, 0, -0.43)
  add(new THREE.BoxGeometry(0.06, 0.62, 0.06), bodyMat, -1.02, 1.06, 0.78, 0, 0, -0.43)

  /* ── GLASS ── */
  add(new THREE.BoxGeometry(0.05, 0.62, 1.58), glassMat, 0.91, 1.07, 0, 0, 0, 0.54)  // windshield
  add(new THREE.BoxGeometry(0.05, 0.59, 1.52), glassMat, -1.01, 1.08, 0, 0, 0, -0.44) // rear window
  add(new THREE.BoxGeometry(1.64, 0.47, 0.04), glassMat, -0.08, 1.06, -0.88)           // side L
  add(new THREE.BoxGeometry(1.64, 0.47, 0.04), glassMat, -0.08, 1.06, 0.88)            // side R

  /* ── FRONT FASCIA ── */
  add(new THREE.BoxGeometry(0.17, 0.44, 1.88), bodyMat, 2.09, 0.22, 0)
  add(new THREE.BoxGeometry(0.30, 0.10, 1.76), bodyMat, 1.96, 0.05, 0)  // chin lip

  /* ── GRILLE ── */
  add(new THREE.BoxGeometry(0.04, 0.26, 0.98), grilleMat, 2.11, 0.33, 0)
  add(new THREE.BoxGeometry(0.04, 0.14, 0.58), grilleMat, 2.11, 0.15, 0)

  /* GT500 Cobra badge */
  const badgeMat = new THREE.MeshStandardMaterial({ color: 0xb5860b, metalness: 1.0, roughness: 0.06, envMapIntensity: 1.2 })
  const badge = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.03, 20), badgeMat)
  badge.rotation.z = Math.PI / 2
  badge.position.set(2.12, 0.38, 0)
  car.add(badge)

  /* ── REAR BUMPER ── */
  add(new THREE.BoxGeometry(0.17, 0.36, 1.84), bodyMat, -2.07, 0.18, 0)

  /* ── FENDER FLARES (wide body presence) ── */
  add(new THREE.BoxGeometry(0.90, 0.20, 0.06), bodyMat, 1.20, 0.60, -0.98)
  add(new THREE.BoxGeometry(0.90, 0.20, 0.06), bodyMat, 1.20, 0.60, 0.98)
  add(new THREE.BoxGeometry(0.92, 0.20, 0.06), bodyMat, -1.18, 0.58, -0.98)
  add(new THREE.BoxGeometry(0.92, 0.20, 0.06), bodyMat, -1.18, 0.58, 0.98)

  /* ── DOOR PANELS ── */
  add(new THREE.BoxGeometry(1.74, 0.64, 0.05), bodyMat, -0.04, 0.62, -0.97)
  add(new THREE.BoxGeometry(1.74, 0.64, 0.05), bodyMat, -0.04, 0.62, 0.97)

  /* Door handles */
  add(new THREE.BoxGeometry(0.20, 0.05, 0.04), chromeMat, 0.14, 0.72, -1.01)
  add(new THREE.BoxGeometry(0.20, 0.05, 0.04), chromeMat, 0.14, 0.72, 1.01)

  /* ── HEADLIGHTS (projector quad) ── */
  add(new THREE.BoxGeometry(0.05, 0.12, 0.38), headlightMat, 2.10, 0.50, -0.62)
  add(new THREE.BoxGeometry(0.05, 0.12, 0.38), headlightMat, 2.10, 0.50, 0.62)
  add(new THREE.BoxGeometry(0.06, 0.14, 0.40), bodyMat, 2.09, 0.50, -0.62)
  add(new THREE.BoxGeometry(0.06, 0.14, 0.40), bodyMat, 2.09, 0.50, 0.62)
  // DRL strip
  add(new THREE.BoxGeometry(0.04, 0.04, 0.42), headlightMat, 2.11, 0.40, -0.62)
  add(new THREE.BoxGeometry(0.04, 0.04, 0.42), headlightMat, 2.11, 0.40, 0.62)

  /* ── TAILLIGHTS (GT500 sequential bar) ── */
  add(new THREE.BoxGeometry(0.05, 0.11, 0.54), taillightMat, -2.09, 0.40, -0.68)
  add(new THREE.BoxGeometry(0.05, 0.11, 0.54), taillightMat, -2.09, 0.40, 0.68)
  add(new THREE.BoxGeometry(0.03, 0.05, 1.72), taillightMat, -2.10, 0.48, 0)

  /* ── EXHAUST TIPS (quad) ── */
  const exGeo = new THREE.CylinderGeometry(0.055, 0.065, 0.20, 14)
  add(exGeo, chromeMat, -2.06, 0.10, -0.52, Math.PI / 2)
  add(exGeo, chromeMat, -2.06, 0.10, -0.70, Math.PI / 2)
  add(exGeo, chromeMat, -2.06, 0.10, 0.52, Math.PI / 2)
  add(exGeo, chromeMat, -2.06, 0.10, 0.70, Math.PI / 2)

  /* ── WHEELS (x4) ── */
  function makeWheel(x, z) {
    const g = new THREE.Group()
    g.position.set(x, 0, z)

    // Tire
    const tire = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.130, 18, 48), tireMat)
    tire.rotation.y = Math.PI / 2
    tire.castShadow = true
    g.add(tire)

    // Rim disc
    const rimDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.295, 0.295, 0.115, 24), rimMat)
    rimDisc.rotation.z = Math.PI / 2
    rimDisc.castShadow = true
    g.add(rimDisc)

    // 6-spoke pattern
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2
      const sp = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.042, 0.055), rimMat)
      sp.rotation.set(0, Math.PI / 2, a)
      sp.position.set(0, Math.sin(a) * 0.145, Math.cos(a) * 0.145)
      sp.castShadow = true
      g.add(sp)
    }

    // Center cap
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.052, 0.13, 16), chromeMat)
    cap.rotation.z = Math.PI / 2
    g.add(cap)

    // Red brake caliper
    const caliper = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.10, 0.10), brakeMat)
    caliper.position.set(0, 0.22, 0)
    g.add(caliper)

    car.add(g)
    return g
  }

  makeWheel(1.32, -0.98)
  makeWheel(1.32, 0.98)
  makeWheel(-1.32, -0.98)
  makeWheel(-1.32, 0.98)

  /* ── TOGGLEABLE MODS (hidden by default) ── */

  // Rear spoiler
  const spoilerGroup = new THREE.Group()
  const sw = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.22, 1.64), bodyMat)
  sw.position.set(0, 0.11, 0)
  sw.castShadow = true
  spoilerGroup.add(sw)
  for (const z of [-0.74, 0.74]) {
    const st = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.18, 0.05), bodyMat)
    st.position.set(-0.12, 0, z)
    st.castShadow = true
    spoilerGroup.add(st)
  }
  spoilerGroup.position.set(-1.38, 0.62, 0)
  spoilerGroup.rotation.z = 0.07
  spoilerGroup.visible = false
  car.add(spoilerGroup)

  // Front splitter
  const splitter = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.04, 2.08), diffuserMat)
  splitter.position.set(2.04, 0.02, 0)
  splitter.castShadow = true
  splitter.visible = false
  car.add(splitter)

  // Rear diffuser
  const diffuserGroup = new THREE.Group()
  diffuserGroup.add(new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.13, 1.78), diffuserMat))
  for (let i = -3; i <= 3; i++) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.11, 0.03), diffuserMat)
    fin.position.set(0, 0, i * 0.26)
    diffuserGroup.add(fin)
  }
  diffuserGroup.position.set(-2.05, 0.065, 0)
  diffuserGroup.visible = false
  car.add(diffuserGroup)

  // Side skirts
  const skirtL = new THREE.Mesh(new THREE.BoxGeometry(3.58, 0.07, 0.05), diffuserMat)
  skirtL.position.set(0, 0.035, -0.985)
  skirtL.visible = false
  car.add(skirtL)

  const skirtR = new THREE.Mesh(new THREE.BoxGeometry(3.58, 0.07, 0.05), diffuserMat)
  skirtR.position.set(0, 0.035, 0.985)
  skirtR.visible = false
  car.add(skirtR)

  // Raise so wheels sit on ground plane
  car.position.y = 0.375

  scene.add(car)

  return { bodyMat, glassMat, rimMat, spoilerGroup, splitter, diffuserGroup, skirtL, skirtR }
}

/* ─────────────────────────────────────────────────────────────
   Apply config → mutate Three.js materials directly (no re-render)
───────────────────────────────────────────────────────────── */
function applyConfig(config, parts) {
  if (!parts?.bodyMat) return
  const { bodyMat, glassMat, rimMat } = parts

  /* Paint */
  const paintOpt = config.paint === 'customColor'
    ? { color: config.customColor, metalness: 0.72, roughness: 0.24 }
    : MODIFICATIONS.paint.options.find(o => o.id === config.paint)

  if (paintOpt) {
    bodyMat.color.set(paintOpt.color ?? config.customColor)
    bodyMat.metalness = paintOpt.metalness ?? 0.72
    bodyMat.roughness = paintOpt.roughness ?? 0.24
    bodyMat.needsUpdate = true
  }

  /* Window tint */
  const tintOpt = MODIFICATIONS.tint.options.find(o => o.id === config.tint)
  if (tintOpt) {
    glassMat.color.set(tintOpt.glassColor)
    glassMat.opacity = tintOpt.glassOpacity
    glassMat.needsUpdate = true
  }

  /* Wheels */
  const wheelOpt = MODIFICATIONS.wheels.options.find(o => o.id === config.wheels)
  if (wheelOpt) {
    rimMat.color.set(wheelOpt.rimColor)
    rimMat.metalness = wheelOpt.metalness ?? 0.95
    rimMat.roughness = wheelOpt.roughness ?? 0.08
    rimMat.needsUpdate = true
  }

  /* Exterior visibility toggles */
  if (parts.spoilerGroup)  parts.spoilerGroup.visible  = config.exterior.includes('spoiler')
  if (parts.splitter)      parts.splitter.visible      = config.exterior.includes('frontsplitter')
  if (parts.diffuserGroup) parts.diffuserGroup.visible = config.exterior.includes('diffuser')
  if (parts.skirtL)        parts.skirtL.visible        = config.exterior.includes('sideskirts')
  if (parts.skirtR)        parts.skirtR.visible        = config.exterior.includes('sideskirts')
}

/* ─────────────────────────────────────────────────────────────
   Component
───────────────────────────────────────────────────────────── */
export function CarScene({ config }) {
  const mountRef   = useRef(null)
  const partsRef   = useRef({})
  const configRef  = useRef(config)

  /* Track latest config so the init effect can read it after mount */
  useEffect(() => {
    configRef.current = config
    applyConfig(config, partsRef.current)
  }, [config])

  /* Init scene once */
  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const w = mount.clientWidth  || 900
    const h = mount.clientHeight || 520

    /* Renderer */
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    renderer.setSize(w, h)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.05
    renderer.outputColorSpace = THREE.SRGBColorSpace
    mount.appendChild(renderer.domElement)

    /* Scene */
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x0c0d10)
    scene.fog = new THREE.FogExp2(0x0c0d10, 0.028)

    /* PBR environment */
    const pmrem = new THREE.PMREMGenerator(renderer)
    pmrem.compileEquirectangularShader()
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    scene.environment = envTex
    pmrem.dispose()

    /* Camera */
    const camera = new THREE.PerspectiveCamera(46, w / h, 0.1, 100)
    camera.position.set(6.5, 2.8, 5.5)

    /* Lights */
    scene.add(new THREE.AmbientLight(0xffffff, 0.25))

    const key = new THREE.DirectionalLight(0xfff5e0, 4.5)
    key.position.set(8, 14, 8)
    key.castShadow = true
    key.shadow.mapSize.set(2048, 2048)
    key.shadow.camera.left   = -8
    key.shadow.camera.right  = 8
    key.shadow.camera.top    = 6
    key.shadow.camera.bottom = -6
    key.shadow.camera.near   = 0.5
    key.shadow.camera.far    = 40
    key.shadow.bias = -0.0005
    scene.add(key)

    const fill = new THREE.DirectionalLight(0x8099cc, 1.4)
    fill.position.set(-8, 5, -6)
    scene.add(fill)

    const accentLight = new THREE.PointLight(0xff6600, 3.5, 16)
    accentLight.position.set(-7, 2, 4)
    scene.add(accentLight)

    const rimLight = new THREE.PointLight(0x4488ff, 2.2, 20)
    rimLight.position.set(2, 9, -9)
    scene.add(rimLight)

    scene.add(new THREE.HemisphereLight(0x334466, 0x1a0e08, 0.55))

    /* Ground */
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x0d0e14, roughness: 0.32, metalness: 0.72, envMapIntensity: 0.5,
    })
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(32, 32), groundMat)
    ground.rotation.x = -Math.PI / 2
    ground.receiveShadow = true
    scene.add(ground)

    /* Grid */
    const grid = new THREE.GridHelper(26, 40, 0x181d2a, 0x181d2a)
    grid.position.y = 0.001
    scene.add(grid)

    /* Build car */
    partsRef.current = buildMustang(scene)

    /* Apply initial config now that parts exist */
    applyConfig(configRef.current, partsRef.current)

    /* Controls */
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enablePan = false
    controls.minDistance = 3.5
    controls.maxDistance = 18
    controls.maxPolarAngle = Math.PI / 2.05
    controls.autoRotate = true
    controls.autoRotateSpeed = 0.45
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.target.set(0, 0.65, 0)

    /* Loop */
    let raf
    const tick = () => {
      raf = requestAnimationFrame(tick)
      controls.update()
      renderer.render(scene, camera)
    }
    tick()

    /* Resize */
    const onResize = () => {
      const nw = mount.clientWidth
      const nh = mount.clientHeight
      camera.aspect = nw / nh
      camera.updateProjectionMatrix()
      renderer.setSize(nw, nh)
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
      controls.dispose()
      renderer.dispose()
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement)
    }
  }, []) // run once

  return (
    <div
      ref={mountRef}
      style={{ width: '100%', height: '100%', minHeight: 0, background: '#0c0d10' }}
    />
  )
}
