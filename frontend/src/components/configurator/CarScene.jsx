import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment, ContactShadows, Grid, Preload, useGLTF } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'
import { VehicleModel } from './VehicleModel'
import { MODIFICATIONS } from '../../data/modifications'
import { classifyVehicle, ALL_MODEL_URLS } from '../../lib/vehicleUtils'

// Preload all vehicle models in the background when this module first loads
ALL_MODEL_URLS.forEach(url => useGLTF.preload(url))

function Lights() {
  return (
    <>
      <ambientLight intensity={0.12} />
      {/* Warm key light — slightly dimmer than before */}
      <directionalLight
        position={[6, 10, 6]}
        intensity={1.6}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={4}
        shadow-camera-bottom={-4}
        shadow-camera-near={0.5}
        shadow-camera-far={30}
        shadow-bias={-0.0005}
        color="#fff0dd"
      />
      {/* Cool fill */}
      <directionalLight position={[-6, 4, -5]} intensity={0.45} color="#6080b8" />
      {/* Warm under-accent — kept subtle */}
      <pointLight position={[-5, 1.2, 3]} intensity={7} color="#ff6820" distance={14} decay={2} />
      {/* Cool rim light */}
      <pointLight position={[1, 6, -8]} intensity={5} color="#3366cc" distance={18} decay={2} />
      <hemisphereLight args={['#1a2840', '#120a04', 0.3]} />
    </>
  )
}

function ViewerSkeleton() {
  return (
    <mesh>
      <boxGeometry args={[0, 0, 0]} />
      <meshBasicMaterial />
    </mesh>
  )
}

export function CarScene({ config, make = '', model = '', year = '' }) {
  const vehicleClass = classifyVehicle(make, model, year)

  const paintOpt =
    config.paint === 'customColor'
      ? { color: config.customColor, metalness: 0.72, roughness: 0.24 }
      : (MODIFICATIONS.paint.options.find(o => o.id === config.paint) ?? {})

  const tintOpt  = MODIFICATIONS.tint.options.find(o => o.id === config.tint)    ?? {}
  const wheelOpt = MODIFICATIONS.wheels.options.find(o => o.id === config.wheels) ?? {}

  const materialConfig = {
    body: {
      color:     paintOpt.color     ?? vehicleClass.defaultColor,
      metalness: paintOpt.metalness ?? 0.55,
      roughness: paintOpt.roughness ?? 0.25,
    },
    glass: {
      color:   tintOpt.glassColor   ?? '#8fb8d4',
      opacity: tintOpt.glassOpacity ?? 0.22,
    },
    rim: {
      color:     wheelOpt.rimColor    ?? '#d8d8d8',
      metalness: wheelOpt.metalness   ?? 0.95,
      roughness: wheelOpt.roughness   ?? 0.05,
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
        toneMappingExposure: 0.88,   // was 1.15 — dimmed
        outputColorSpace: THREE.SRGBColorSpace,
      }}
      style={{ width: '100%', height: '100%' }}
    >
      <color attach="background" args={['#0a0b0f']} />
      <fog attach="fog" args={['#0a0b0f', 20, 48]} />

      <Lights />

      <Suspense fallback={<ViewerSkeleton />}>
        <Environment preset="studio" background={false} />

        <VehicleModel
          modelUrl={vehicleClass.model}
          modelType={vehicleClass.type}
          scale={vehicleClass.scale}
          yOffset={vehicleClass.yOffset}
          materialConfig={materialConfig}
        />

        <ContactShadows
          position={[0, -0.02, 0]}
          scale={16}
          blur={3.2}
          opacity={0.75}
          far={1.5}
          resolution={1024}
        />

        {/* Dark showroom floor */}
        <mesh rotation-x={-Math.PI / 2} position={[0, -0.02, 0]} receiveShadow>
          <planeGeometry args={[40, 40]} />
          <meshStandardMaterial
            color="#060710"
            roughness={0.2}
            metalness={0.9}
            envMapIntensity={0.4}
          />
        </mesh>

        <Grid
          position={[0, -0.018, 0]}
          infiniteGrid
          cellSize={0.5}
          cellThickness={0.35}
          cellColor="#10142a"
          sectionSize={2.5}
          sectionThickness={0.7}
          sectionColor="#161c30"
          fadeDistance={22}
          fadeStrength={1.6}
        />

        <Preload all />
      </Suspense>

      <OrbitControls
        enablePan={false}
        minDistance={2.5}
        maxDistance={14}
        maxPolarAngle={Math.PI / 2.08}
        autoRotate
        autoRotateSpeed={0.45}
        enableDamping
        dampingFactor={0.05}
        target={[0, 0.55, 0]}
      />

      <EffectComposer>
        <Bloom
          intensity={0.4}
          luminanceThreshold={0.78}
          luminanceSmoothing={0.8}
          radius={0.85}
        />
        <Vignette offset={0.3} darkness={0.7} />
      </EffectComposer>
    </Canvas>
  )
}
