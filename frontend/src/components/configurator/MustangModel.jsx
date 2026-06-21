import * as THREE from 'three'
import { RoundedBox } from '@react-three/drei'

/* ── Material helpers ───────────────────────────────────────── */

function PaintMat({ color, metalness, roughness }) {
  return (
    <meshPhysicalMaterial
      color={color}
      metalness={metalness}
      roughness={roughness}
      clearcoat={1.0}
      clearcoatRoughness={0.04}
      reflectivity={1.0}
      envMapIntensity={2.5}
    />
  )
}

function GlassMat({ color, opacity }) {
  const isDark = opacity > 0.45
  return (
    <meshPhysicalMaterial
      color={color}
      metalness={0.0}
      roughness={isDark ? 0.06 : 0.0}
      transmission={isDark ? 0.0 : 0.82}
      transparent
      opacity={opacity}
      thickness={0.4}
      ior={1.52}
      envMapIntensity={2.5}
      side={THREE.DoubleSide}
    />
  )
}

function ChromeMat() {
  return (
    <meshPhysicalMaterial
      color="#d2d2d2"
      metalness={1.0}
      roughness={0.04}
      clearcoat={0.5}
      envMapIntensity={2.2}
    />
  )
}

function DiffuserMat() {
  return <meshStandardMaterial color="#0f0f0f" metalness={0.05} roughness={0.85} />
}

function GrilleMat() {
  return <meshStandardMaterial color="#070707" metalness={0.2} roughness={0.8} />
}

function HeadlightMat() {
  return (
    <meshPhysicalMaterial
      color="#ffffff"
      emissive="#ffeedd"
      emissiveIntensity={2.8}
      transparent
      opacity={0.92}
      roughness={0.0}
      transmission={0.5}
      thickness={0.2}
      ior={1.45}
    />
  )
}

function TaillightMat() {
  return (
    <meshPhysicalMaterial
      color="#ff2200"
      emissive="#ff1100"
      emissiveIntensity={3.5}
      transparent
      opacity={0.88}
      roughness={0.04}
    />
  )
}

function BadgeMat() {
  return (
    <meshPhysicalMaterial
      color="#b5860b"
      metalness={1.0}
      roughness={0.06}
      clearcoat={0.6}
      envMapIntensity={2.0}
    />
  )
}

function BrakeMat() {
  return <meshStandardMaterial color="#cc0000" metalness={0.3} roughness={0.5} />
}

/* ── Wheel ──────────────────────────────────────────────────── */

function Wheel({ position, rim }) {
  return (
    <group position={position}>
      {/* Tire */}
      <mesh castShadow rotation-y={Math.PI / 2}>
        <torusGeometry args={[0.38, 0.130, 20, 64]} />
        <meshStandardMaterial color="#0d0d0d" metalness={0.04} roughness={0.92} />
      </mesh>

      {/* Rim disc */}
      <mesh castShadow rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[0.295, 0.295, 0.115, 24]} />
        <meshPhysicalMaterial
          color={rim.color}
          metalness={rim.metalness}
          roughness={rim.roughness}
          clearcoat={0.7}
          clearcoatRoughness={0.08}
          envMapIntensity={2.2}
        />
      </mesh>

      {/* 6 spokes */}
      {Array.from({ length: 6 }, (_, i) => {
        const a = (i / 6) * Math.PI * 2
        return (
          <RoundedBox
            key={i}
            args={[0.30, 0.038, 0.055]}
            radius={0.007}
            smoothness={2}
            castShadow
            rotation={[0, Math.PI / 2, a]}
            position={[0, Math.sin(a) * 0.145, Math.cos(a) * 0.145]}
          >
            <meshPhysicalMaterial
              color={rim.color}
              metalness={rim.metalness}
              roughness={rim.roughness}
              envMapIntensity={2.2}
            />
          </RoundedBox>
        )
      })}

      {/* Center cap */}
      <mesh rotation-z={Math.PI / 2} castShadow>
        <cylinderGeometry args={[0.052, 0.052, 0.13, 16]} />
        <ChromeMat />
      </mesh>

      {/* Brake caliper */}
      <mesh position={[0, 0.22, 0]} castShadow>
        <boxGeometry args={[0.10, 0.10, 0.10]} />
        <BrakeMat />
      </mesh>
    </group>
  )
}

/* ── Body panel shorthand ───────────────────────────────────── */

function BP({ args, position, rotation, paint }) {
  const r = Math.min(...args) * 0.055
  return (
    <RoundedBox
      args={args}
      radius={Math.max(r, 0.005)}
      smoothness={3}
      position={position}
      rotation={rotation}
      castShadow
      receiveShadow
    >
      <PaintMat {...paint} />
    </RoundedBox>
  )
}

/* ── MustangModel ───────────────────────────────────────────── */

export function MustangModel({ materialConfig }) {
  const { body, glass, rim, exterior } = materialConfig
  const p = body // paint shorthand

  return (
    <group position={[0, 0.375, 0]}>

      {/* ── MAIN BODY ── */}
      <BP args={[4.20, 0.46, 1.90]} position={[0, 0.23, 0]}                          paint={p} />
      <BP args={[1.40, 0.06, 1.74]} position={[1.30, 0.57, 0]}                        paint={p} />
      <BP args={[0.30, 0.08, 1.74]} position={[1.95, 0.51, 0]}  rotation={[0,0, 0.34]} paint={p} />
      <BP args={[0.62, 0.07, 0.38]} position={[1.10, 0.65, 0]}                        paint={p} />
      <BP args={[1.00, 0.06, 1.64]} position={[-1.36, 0.56, 0]}                       paint={p} />
      <BP args={[0.38, 0.07, 1.58]} position={[-1.78, 0.51, 0]} rotation={[0,0,-0.26]} paint={p} />
      <BP args={[1.90, 0.07, 1.60]} position={[-0.08, 1.27, 0]}                       paint={p} />
      <BP args={[1.98, 0.74, 1.74]} position={[-0.08, 0.94, 0]}                       paint={p} />
      <BP args={[0.17, 0.44, 1.88]} position={[2.09, 0.22, 0]}                        paint={p} />
      <BP args={[0.30, 0.10, 1.76]} position={[1.96, 0.05, 0]}                        paint={p} />
      <BP args={[0.17, 0.36, 1.84]} position={[-2.07, 0.18, 0]}                       paint={p} />

      {/* Fender flares */}
      <BP args={[0.90, 0.20, 0.06]} position={[ 1.20, 0.60, -0.98]} paint={p} />
      <BP args={[0.90, 0.20, 0.06]} position={[ 1.20, 0.60,  0.98]} paint={p} />
      <BP args={[0.92, 0.20, 0.06]} position={[-1.18, 0.58, -0.98]} paint={p} />
      <BP args={[0.92, 0.20, 0.06]} position={[-1.18, 0.58,  0.98]} paint={p} />

      {/* Door panels */}
      <BP args={[1.74, 0.64, 0.05]} position={[-0.04, 0.62, -0.97]} paint={p} />
      <BP args={[1.74, 0.64, 0.05]} position={[-0.04, 0.62,  0.97]} paint={p} />

      {/* A-pillars */}
      <BP args={[0.06, 0.60, 0.06]} position={[0.83, 1.07, -0.79]} rotation={[0,0, 0.52]} paint={p} />
      <BP args={[0.06, 0.60, 0.06]} position={[0.83, 1.07,  0.79]} rotation={[0,0, 0.52]} paint={p} />
      {/* C-pillars */}
      <BP args={[0.06, 0.62, 0.06]} position={[-1.02, 1.06, -0.78]} rotation={[0,0,-0.43]} paint={p} />
      <BP args={[0.06, 0.62, 0.06]} position={[-1.02, 1.06,  0.78]} rotation={[0,0,-0.43]} paint={p} />

      {/* ── GLASS ── */}
      <mesh castShadow position={[0.91, 1.07, 0]} rotation={[0, 0, 0.54]}>
        <boxGeometry args={[0.05, 0.62, 1.58]} />
        <GlassMat {...glass} />
      </mesh>
      <mesh castShadow position={[-1.01, 1.08, 0]} rotation={[0, 0, -0.44]}>
        <boxGeometry args={[0.05, 0.59, 1.52]} />
        <GlassMat {...glass} />
      </mesh>
      <mesh position={[-0.08, 1.06, -0.88]}>
        <boxGeometry args={[1.64, 0.47, 0.04]} />
        <GlassMat {...glass} />
      </mesh>
      <mesh position={[-0.08, 1.06,  0.88]}>
        <boxGeometry args={[1.64, 0.47, 0.04]} />
        <GlassMat {...glass} />
      </mesh>

      {/* ── GRILLE ── */}
      <mesh position={[2.11, 0.33, 0]}>
        <boxGeometry args={[0.04, 0.26, 0.98]} />
        <GrilleMat />
      </mesh>
      <mesh position={[2.11, 0.15, 0]}>
        <boxGeometry args={[0.04, 0.14, 0.58]} />
        <GrilleMat />
      </mesh>
      <mesh position={[1.10, 0.67, 0]}>
        <boxGeometry args={[0.44, 0.04, 0.28]} />
        <GrilleMat />
      </mesh>

      {/* Cobra badge */}
      <mesh rotation-z={Math.PI / 2} position={[2.12, 0.38, 0]}>
        <cylinderGeometry args={[0.07, 0.07, 0.03, 20]} />
        <BadgeMat />
      </mesh>

      {/* ── DOOR HANDLES (chrome) ── */}
      <mesh castShadow position={[0.14, 0.72, -1.01]}>
        <boxGeometry args={[0.20, 0.05, 0.04]} />
        <ChromeMat />
      </mesh>
      <mesh castShadow position={[0.14, 0.72,  1.01]}>
        <boxGeometry args={[0.20, 0.05, 0.04]} />
        <ChromeMat />
      </mesh>

      {/* ── HEADLIGHTS ── */}
      <mesh castShadow position={[2.10, 0.50, -0.62]}>
        <boxGeometry args={[0.05, 0.12, 0.38]} />
        <HeadlightMat />
      </mesh>
      <mesh castShadow position={[2.10, 0.50,  0.62]}>
        <boxGeometry args={[0.05, 0.12, 0.38]} />
        <HeadlightMat />
      </mesh>
      {/* Housing surround */}
      <mesh position={[2.09, 0.50, -0.62]}>
        <boxGeometry args={[0.06, 0.14, 0.40]} />
        <PaintMat {...body} />
      </mesh>
      <mesh position={[2.09, 0.50,  0.62]}>
        <boxGeometry args={[0.06, 0.14, 0.40]} />
        <PaintMat {...body} />
      </mesh>
      {/* DRL strips */}
      <mesh position={[2.11, 0.40, -0.62]}>
        <boxGeometry args={[0.04, 0.04, 0.42]} />
        <HeadlightMat />
      </mesh>
      <mesh position={[2.11, 0.40,  0.62]}>
        <boxGeometry args={[0.04, 0.04, 0.42]} />
        <HeadlightMat />
      </mesh>

      {/* ── TAILLIGHTS ── */}
      <mesh position={[-2.09, 0.40, -0.68]}>
        <boxGeometry args={[0.05, 0.11, 0.54]} />
        <TaillightMat />
      </mesh>
      <mesh position={[-2.09, 0.40,  0.68]}>
        <boxGeometry args={[0.05, 0.11, 0.54]} />
        <TaillightMat />
      </mesh>
      {/* Sequential bar */}
      <mesh position={[-2.10, 0.48, 0]}>
        <boxGeometry args={[0.03, 0.05, 1.72]} />
        <TaillightMat />
      </mesh>

      {/* ── EXHAUST TIPS ── */}
      {[-0.52, -0.70, 0.52, 0.70].map((z, i) => (
        <mesh key={i} position={[-2.06, 0.10, z]} rotation-x={Math.PI / 2} castShadow>
          <cylinderGeometry args={[0.055, 0.065, 0.20, 16]} />
          <ChromeMat />
        </mesh>
      ))}

      {/* ── WHEELS ── */}
      <Wheel position={[ 1.32, 0, -0.98]} rim={rim} />
      <Wheel position={[ 1.32, 0,  0.98]} rim={rim} />
      <Wheel position={[-1.32, 0, -0.98]} rim={rim} />
      <Wheel position={[-1.32, 0,  0.98]} rim={rim} />

      {/* ── TOGGLEABLE EXTERIOR MODS ── */}

      {exterior.includes('spoiler') && (
        <group position={[-1.38, 0.62, 0]} rotation-z={0.07}>
          <RoundedBox
            args={[0.05, 0.22, 1.64]}
            radius={0.008}
            smoothness={3}
            position={[0, 0.11, 0]}
            castShadow
          >
            <PaintMat {...body} />
          </RoundedBox>
          {[-0.74, 0.74].map(z => (
            <mesh key={z} position={[-0.12, 0, z]} castShadow>
              <boxGeometry args={[0.30, 0.18, 0.05]} />
              <PaintMat {...body} />
            </mesh>
          ))}
        </group>
      )}

      {exterior.includes('frontsplitter') && (
        <mesh position={[2.04, 0.02, 0]} castShadow>
          <boxGeometry args={[0.30, 0.04, 2.08]} />
          <DiffuserMat />
        </mesh>
      )}

      {exterior.includes('diffuser') && (
        <group position={[-2.05, 0.065, 0]}>
          <mesh>
            <boxGeometry args={[0.22, 0.13, 1.78]} />
            <DiffuserMat />
          </mesh>
          {[-3, -2, -1, 0, 1, 2, 3].map(i => (
            <mesh key={i} position={[0, 0, i * 0.26]}>
              <boxGeometry args={[0.20, 0.11, 0.03]} />
              <DiffuserMat />
            </mesh>
          ))}
        </group>
      )}

      {exterior.includes('sideskirts') && (
        <>
          <mesh position={[0, 0.035, -0.985]} castShadow>
            <boxGeometry args={[3.58, 0.07, 0.05]} />
            <DiffuserMat />
          </mesh>
          <mesh position={[0, 0.035,  0.985]} castShadow>
            <boxGeometry args={[3.58, 0.07, 0.05]} />
            <DiffuserMat />
          </mesh>
        </>
      )}

    </group>
  )
}
