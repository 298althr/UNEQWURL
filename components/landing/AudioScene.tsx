"use client";

import { useRef, useMemo, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

/* ─── Spectrum Bars ─── */
function SpectrumBars() {
  const groupRef = useRef<THREE.Group>(null);
  const barCount = 48;
  const spacing = 0.35;
  const startX = -(barCount * spacing) / 2;

  const bars = useMemo(() => {
    return Array.from({ length: barCount }, (_, i) => ({
      id: i,
      x: startX + i * spacing,
      baseHeight: 0.4 + Math.random() * 0.8,
      speed: 1.5 + Math.random() * 3,
      offset: Math.random() * Math.PI * 2,
      hue: 320 + (i / barCount) * 40, // magenta range
    }));
  }, []);

  const meshRefs = useRef<THREE.Mesh[]>([]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    meshRefs.current.forEach((mesh, i) => {
      if (!mesh) return;
      const bar = bars[i];
      const pulse = Math.sin(t * bar.speed + bar.offset) * 0.5 + 0.5;
      const h = bar.baseHeight + pulse * 2.5;
      mesh.scale.y = h;
      mesh.position.y = h / 2;
      // subtle color shift
      const material = mesh.material as THREE.MeshStandardMaterial;
      const s = 0.4 + pulse * 0.6;
      material.color.setHSL(bar.hue / 360, 0.7, 0.55 + pulse * 0.15);
      material.emissive.setHSL(bar.hue / 360, 0.8, 0.1 + pulse * 0.15);
    });
  });

  return (
    <group ref={groupRef} position={[0, -1.2, -2]}>
      {bars.map((bar, i) => (
        <mesh
          key={bar.id}
          ref={(el) => {
            if (el) meshRefs.current[i] = el;
          }}
          position={[bar.x, bar.baseHeight / 2, 0]}
          scale={[0.18, bar.baseHeight, 0.18]}
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial
            color="#e01e8c"
            emissive="#e01e8c"
            emissiveIntensity={0.3}
            roughness={0.3}
            metalness={0.6}
          />
        </mesh>
      ))}
    </group>
  );
}

/* ─── Floating Particles ─── */
function FloatingParticles() {
  const count = 300;
  const pointsRef = useRef<THREE.Points>(null);

  const [positions, velocities] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 25;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 12;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 15;
      vel[i * 3] = (Math.random() - 0.5) * 0.008;
      vel[i * 3 + 1] = Math.random() * 0.006 + 0.002;
      vel[i * 3 + 2] = (Math.random() - 0.5) * 0.008;
    }
    return [pos, vel];
  }, []);

  useFrame(() => {
    if (!pointsRef.current) return;
    const posArray = pointsRef.current.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < count; i++) {
      posArray[i * 3] += velocities[i * 3];
      posArray[i * 3 + 1] += velocities[i * 3 + 1];
      posArray[i * 3 + 2] += velocities[i * 3 + 2];
      // wrap around
      if (posArray[i * 3 + 1] > 8) posArray[i * 3 + 1] = -6;
      if (posArray[i * 3] > 12) posArray[i * 3] = -12;
      if (posArray[i * 3] < -12) posArray[i * 3] = 12;
      if (posArray[i * 3 + 2] > 8) posArray[i * 3 + 2] = -8;
      if (posArray[i * 3 + 2] < -8) posArray[i * 3 + 2] = 8;
    }
    pointsRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#e8b4d0"
        size={0.04}
        transparent
        opacity={0.6}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

/* ─── Wavy Floor (room surface) ─── */
function WavyFloor() {
  const meshRef = useRef<THREE.Mesh>(null);
  const geoRef = useRef<THREE.PlaneGeometry>(null);
  const gridRef = useRef<THREE.GridHelper>(null);

  const segW = 80;
  const segH = 80;

  useFrame((state) => {
    const t = state.clock.elapsedTime;

    // Animate grid scrolling
    if (gridRef.current) {
      gridRef.current.position.z = (t * 0.15) % 2;
    }

    // Displace vertices for bumpy wave profile
    if (!geoRef.current) return;
    const pos = geoRef.current.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i); // in local plane coords this is actually Z in world
      const z =
        Math.sin(x * 0.4 + t * 0.3) * 0.25 +
        Math.cos(y * 0.35 + t * 0.25) * 0.2 +
        Math.sin((x + y) * 0.2 + t * 0.15) * 0.15 +
        Math.sin(x * 0.8 + t * 0.5) * 0.08;
      pos.setZ(i, z);
    }
    pos.needsUpdate = true;
    geoRef.current.computeVertexNormals();
  });

  return (
    <group position={[0, -2.5, 0]}>
      {/* Bumpy floor surface */}
      <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry ref={geoRef} args={[60, 60, segW, segH]} />
        <meshStandardMaterial
          color="#0f0f1a"
          roughness={0.2}
          metalness={0.35}
          transparent
          opacity={0.7}
        />
      </mesh>

      {/* Grid on top */}
      <gridHelper
        ref={gridRef}
        args={[40, 40, "#2a2a3a", "#1e1e2e"]}
      />
    </group>
  );
}

/* ─── Back Wall (room enclosure) ─── */
function BackWall() {
  const wallRef = useRef<THREE.Mesh>(null);
  const geoRef = useRef<THREE.PlaneGeometry>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (!geoRef.current) return;
    const pos = geoRef.current.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z =
        Math.sin(x * 0.3 + t * 0.2) * 0.1 +
        Math.cos(y * 0.4 + t * 0.15) * 0.08;
      pos.setZ(i, z);
    }
    pos.needsUpdate = true;
    geoRef.current.computeVertexNormals();
  });

  return (
    <mesh
      ref={wallRef}
      position={[0, 2, -12]}
      rotation={[0, 0, 0]}
    >
      <planeGeometry ref={geoRef} args={[60, 18, 60, 18]} />
      <meshStandardMaterial
        color="#0a0a12"
        roughness={0.4}
        metalness={0.15}
        transparent
        opacity={0.4}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

/* ─── Camera Drift ─── */
function CameraDrift() {
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    state.camera.position.x = Math.sin(t * 0.08) * 2;
    state.camera.position.y = 1.5 + Math.sin(t * 0.06) * 0.4;
    state.camera.position.z = 7 + Math.cos(t * 0.05) * 1.5;
    state.camera.lookAt(0, 0, -2);
  });
  return null;
}

/* ─── Sound Rings ─── */
function SoundRings() {
  const ringsRef = useRef<THREE.Group>(null);
  const ringCount = 5;

  useFrame((state) => {
    if (!ringsRef.current) return;
    const t = state.clock.elapsedTime;
    ringsRef.current.children.forEach((child, i) => {
      const mesh = child as THREE.Mesh;
      const s = 1 + Math.sin(t * 1.2 + i * 1.5) * 0.15;
      mesh.scale.set(s, s, 1);
      mesh.rotation.z = t * 0.1 * (i % 2 === 0 ? 1 : -1);
      const material = mesh.material as THREE.MeshBasicMaterial;
      material.opacity = 0.08 + Math.sin(t * 1.5 + i) * 0.04;
    });
  });

  return (
    <group ref={ringsRef} position={[0, -0.5, -3]}>
      {Array.from({ length: ringCount }, (_, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1 + i * 0.8, 1.05 + i * 0.8, 64]} />
          <meshBasicMaterial
            color="#e01e8c"
            transparent
            opacity={0.08}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

/* ─── Main Scene ─── */
export default function AudioScene() {
  return (
    <Canvas
      camera={{ position: [0, 1.5, 7], fov: 55 }}
      style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}
      gl={{ antialias: true, alpha: false }}
      dpr={[1, 2]}
    >
      <color attach="background" args={["#0d0d14"]} />
      <fog attach="fog" args={["#0d0d14", 8, 22]} />

      <ambientLight intensity={0.3} color="#1a1220" />
      <directionalLight position={[5, 8, 5]} intensity={0.5} color="#c0a0c0" />
      <pointLight position={[0, 4, -2]} intensity={1.5} color="#ff8ac7" distance={12} />
      <pointLight position={[-5, 2, 2]} intensity={0.4} color="#4d8fff" distance={10} />

      <CameraDrift />
      <SpectrumBars />
      <FloatingParticles />
      <WavyFloor />
      <BackWall />
      <SoundRings />
    </Canvas>
  );
}
