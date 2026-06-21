import { useEffect, useMemo, useRef } from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'

// Ferrari GLB — named meshes: body, glass, rim_fl/fr/rl/rr, wheel, centre
const FERRARI_BODY  = new Set(['body'])
const FERRARI_GLASS = new Set(['glass'])
const FERRARI_RIMS  = new Set(['rim_fl', 'rim_fr', 'rim_rl', 'rim_rr', 'wheel', 'centre'])

// Kenney GLBs — body + wheel-* meshes, single colormap material
const KENNEY_BODY  = new Set(['body'])
const KENNEY_RIMS  = new Set([
  'wheel-front-left', 'wheel-front-right',
  'wheel-back-left', 'wheel-back-right', 'wheel-back',
])

function makePaintMat(color, metalness, roughness) {
  return new THREE.MeshPhysicalMaterial({
    color:              new THREE.Color(color),
    metalness,
    roughness,
    clearcoat:          1.0,
    clearcoatRoughness: 0.04,
    reflectivity:       1.0,
    envMapIntensity:    2.0,
  })
}

function makeGlassMat(color, opacity) {
  const isDark = opacity > 0.5
  return new THREE.MeshPhysicalMaterial({
    color:           new THREE.Color(color),
    transparent:     true,
    opacity,
    transmission:    isDark ? 0 : 0.88,
    roughness:       0,
    metalness:       0,
    thickness:       0.5,
    ior:             1.52,
    envMapIntensity: 2.2,
    side:            THREE.DoubleSide,
  })
}

function makeRimMat(color, metalness, roughness) {
  return new THREE.MeshPhysicalMaterial({
    color:              new THREE.Color(color),
    metalness,
    roughness,
    clearcoat:          0.7,
    clearcoatRoughness: 0.06,
    envMapIntensity:    2.2,
  })
}

export function VehicleModel({ modelUrl, modelType = 'kenney', scale = 1.8, yOffset = 0.52, materialConfig }) {
  const { body, glass, rim } = materialConfig
  const { scene } = useGLTF(modelUrl)

  // Clone once so we never mutate the useGLTF cache
  const model = useMemo(() => {
    const clone = scene.clone(true)
    clone.traverse(c => {
      if (c.isMesh) { c.castShadow = true; c.receiveShadow = true }
    })
    return clone
  }, [scene])

  const prevRef = useRef({})

  useEffect(() => {
    const bodyMat  = makePaintMat(body.color, body.metalness, body.roughness)
    const rimMat   = makeRimMat(rim.color, rim.metalness, rim.roughness)
    const glassMat = makeGlassMat(glass.color, glass.opacity)

    if (modelType === 'ferrari') {
      model.traverse(child => {
        if (!child.isMesh) return
        if (FERRARI_BODY.has(child.name))  child.material = bodyMat
        if (FERRARI_GLASS.has(child.name)) child.material = glassMat
        if (FERRARI_RIMS.has(child.name))  child.material = rimMat
      })
    } else {
      // Kenney models: body gets paint, wheels get rim color, glass is baked into colormap
      model.traverse(child => {
        if (!child.isMesh) return
        if (KENNEY_BODY.has(child.name)) child.material = bodyMat
        if (KENNEY_RIMS.has(child.name)) child.material = rimMat
      })
    }

    // Dispose previous custom mats after new ones are applied
    const { b, g, r } = prevRef.current
    b?.dispose(); g?.dispose(); r?.dispose()
    prevRef.current = { b: bodyMat, g: glassMat, r: rimMat }
  }, [
    model, modelType,
    body.color, body.metalness, body.roughness,
    glass.color, glass.opacity,
    rim.color, rim.metalness, rim.roughness,
  ])

  return (
    <primitive
      object={model}
      scale={scale}
      position={[0, yOffset, 0]}
    />
  )
}
