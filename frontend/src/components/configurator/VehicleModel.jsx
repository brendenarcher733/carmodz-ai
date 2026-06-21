import { useEffect, useMemo, useRef } from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'

const MODEL_URL = '/models/ferrari.glb'

// Exact mesh names from the Ferrari GLB
const BODY_MESHES = new Set(['body'])
const GLASS_MESHES = new Set(['glass'])
const RIM_MESHES  = new Set(['rim_fl', 'rim_fr', 'rim_rl', 'rim_rr', 'wheel', 'centre'])

useGLTF.preload(MODEL_URL)

export function VehicleModel({ materialConfig }) {
  const { body, glass, rim } = materialConfig
  const { scene } = useGLTF(MODEL_URL)

  // Clone once so we never mutate the useGLTF cache
  const model = useMemo(() => {
    const clone = scene.clone(true)
    clone.traverse(c => {
      if (c.isMesh) {
        c.castShadow    = true
        c.receiveShadow = true
      }
    })
    return clone
  }, [scene])

  const prevMatsRef = useRef({})

  useEffect(() => {
    const bodyMat = new THREE.MeshPhysicalMaterial({
      color:              new THREE.Color(body.color),
      metalness:          body.metalness,
      roughness:          body.roughness,
      clearcoat:          1.0,
      clearcoatRoughness: 0.04,
      reflectivity:       1.0,
      envMapIntensity:    2.5,
    })

    const glassMat = new THREE.MeshPhysicalMaterial({
      color:           new THREE.Color(glass.color),
      transparent:     true,
      opacity:         glass.opacity,
      transmission:    glass.opacity < 0.5 ? 0.88 : 0.0,
      roughness:       0.0,
      metalness:       0.0,
      thickness:       0.5,
      ior:             1.52,
      envMapIntensity: 2.5,
      side:            THREE.DoubleSide,
    })

    const rimMat = new THREE.MeshPhysicalMaterial({
      color:              new THREE.Color(rim.color),
      metalness:          rim.metalness,
      roughness:          rim.roughness,
      clearcoat:          0.7,
      clearcoatRoughness: 0.06,
      envMapIntensity:    2.2,
    })

    // Apply materials to their named meshes
    model.traverse(child => {
      if (!child.isMesh) return
      if (BODY_MESHES.has(child.name))  child.material = bodyMat
      if (GLASS_MESHES.has(child.name)) child.material = glassMat
      if (RIM_MESHES.has(child.name))   child.material = rimMat
    })

    // Dispose previous custom materials now that new ones are applied
    const { prev_bodyMat, prev_glassMat, prev_rimMat } = prevMatsRef.current
    prev_bodyMat?.dispose()
    prev_glassMat?.dispose()
    prev_rimMat?.dispose()

    prevMatsRef.current = { prev_bodyMat: bodyMat, prev_glassMat: glassMat, prev_rimMat: rimMat }
  }, [
    model,
    body.color, body.metalness, body.roughness,
    glass.color, glass.opacity,
    rim.color, rim.metalness, rim.roughness,
  ])

  // Y offset so tires sit on the ground plane
  return <primitive object={model} scale={1} position={[0, -0.02, 0]} />
}
