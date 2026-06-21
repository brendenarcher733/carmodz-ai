import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import {
  OrbitControls,
  Environment,
  ContactShadows,
  Grid,
  Preload,
} from '@react-three/drei'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'
import { VehicleModel } from './VehicleModel'
import { MODIFICATIONS } from '../../data/modifications'

function Lights() {
  return (
    <>
      <ambientLight intensity={0.15} />
      {/* Key light — warm top-front */}
      <directionalLight
        position={[6, 10, 6]}
        intensity={2.4}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={4}
        shadow-camera-bottom={-4}
        shadow-camera-near={0.5}
        shadow-camera-far={30}
        shadow-bias={-0.0005}
        color="#fff8ee"
      />
      {/* Cool fill from opposite side */}
      <directionalLight position={[-6, 4, -5]} intensity={0.7} color="#7090cc" />
      {/* Warm accent under front */}
      <pointLight position={[-5, 1.5, 3]} intensity={12} color="#ff6820" distance={14} decay={2} />
      {/* Cool rim light from behind */}
      <pointLight position={[1, 6, -8]} intensity={8} color="#4488ff" distance={18} decay={2} />
      <hemisphereLight args={['#224466', '#180e06', 0.4]} />
    </>
  )
}

function LoadingFallback() {
  return null
}

export function CarScene({ config }) {
  const paintOpt =
    config.paint === 'customColor'
      ? { color: config.customColor, metalness: 0.72, roughness: 0.24 }
      : (MODIFICATIONS.paint.options.find(o => o.id === config.paint) ?? {})

  const tintOpt  = MODIFICATIONS.tint.options.find(o => o.id === config.tint)    ?? {}
  const wheelOpt = MODIFICATIONS.wheels.options.find(o => o.id === config.wheels) ?? {}

  const materialConfig = {
    body: {
      color:     paintOpt.color     ?? '#c41230',
      metalness: paintOpt.metalness ?? 0.6,
      roughness: paintOpt.roughness ?? 0.2,
    },
    glass: {
      color:   tintOpt.glassColor   ?? '#8fb8d4',
      opacity: tintOpt.glassOpacity ?? 0.22,
    },
    rim: {
      color:     wheelOpt.rimColor    ?? '#d8d8d8',
      metalness: wheelOpt.metalness   ?? 0.97,
      roughness: wheelOpt.roughness   ?? 0.04,
    },
    exterior: config.exterior,
  }

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [4.5, 1.6, 5.0], fov: 40, near: 0.1, far: 100 }}
      gl={{
        antialias: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.15,
        outputColorSpace: THREE.SRGBColorSpace,
      }}
      style={{ width: '100%', height: '100%' }}
    >
      <color attach="background" args={['#0c0d10']} />
      <fog attach="fog" args={['#0c0d10', 20, 45]} />

      <Lights />

      <Suspense fallback={<LoadingFallback />}>
        {/* Studio HDR environment — drives all PBR reflections */}
        <Environment preset="studio" background={false} />

        <VehicleModel materialConfig={materialConfig} />

        {/* Soft blob contact shadow under the car */}
        <ContactShadows
          position={[0, -0.02, 0]}
          scale={16}
          blur={3}
          opacity={0.9}
          far={1.5}
          resolution={1024}
        />

        {/* Dark showroom floor */}
        <mesh rotation-x={-Math.PI / 2} position={[0, -0.02, 0]} receiveShadow>
          <planeGeometry args={[40, 40]} />
          <meshStandardMaterial
            color="#080910"
            roughness={0.18}
            metalness={0.92}
            envMapIntensity={0.5}
          />
        </mesh>

        <Grid
          position={[0, -0.018, 0]}
          infiniteGrid
          cellSize={0.5}
          cellThickness={0.4}
          cellColor="#14182a"
          sectionSize={2.5}
          sectionThickness={0.8}
          sectionColor="#1a2035"
          fadeDistance={22}
          fadeStrength={1.5}
        />

        <Preload all />
      </Suspense>

      <OrbitControls
        enablePan={false}
        minDistance={2.5}
        maxDistance={14}
        maxPolarAngle={Math.PI / 2.08}
        autoRotate
        autoRotateSpeed={0.5}
        enableDamping
        dampingFactor={0.05}
        target={[0, 0.55, 0]}
      />

      <EffectComposer>
        <Bloom
          intensity={0.6}
          luminanceThreshold={0.7}
          luminanceSmoothing={0.75}
          radius={0.9}
        />
        <Vignette offset={0.28} darkness={0.82} />
      </EffectComposer>
    </Canvas>
  )
}
