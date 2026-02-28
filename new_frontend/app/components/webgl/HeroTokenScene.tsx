/**
 * Hero Token Scene — LARGE dominant 3D animation
 * 
 * Features:
 * - BIG gold coin (occupies full hero right side)
 * - Visible geometric track/rail curving across view
 * - Physically correct rolling motion
 * - Gravity drop at track end (settlement metaphor)
 * - 60fps autoplay loop
 */

import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// ─── COLORS ──────────────────────────────────────────────────
const GOLD = '#d4a843';
const GOLD_BRIGHT = '#fcd34d';
const GOLD_DIM = '#8b6914';
const TRACK_COLOR = '#1a3327';
const TRACK_GLOW = '#00e08a';

// ─── Large Rolling Coin ──────────────────────────────────────
function LargeCoin() {
  const coinRef = useRef<THREE.Group>(null);
  const rollAngleRef = useRef(0);
  
  const COIN_RADIUS = 1.8;
  const COIN_THICKNESS = 0.25;
  const LOOP_DURATION = 8; // seconds for full cycle
  const ROLL_PHASE = 0.75; // 75% rolling, 25% falling
  
  // Track curve - sweeping arc across the scene
  const trackCurve = useMemo(() => {
    return new THREE.CatmullRomCurve3(
      [
        new THREE.Vector3(-4.5, 0.5, 2),
        new THREE.Vector3(-2.5, 1.2, 0.5),
        new THREE.Vector3(0, 1.8, -0.5),
        new THREE.Vector3(2.2, 1.4, 0),
        new THREE.Vector3(3.8, 0.6, 1),
      ],
      false,
      'catmullrom',
      0.5
    );
  }, []);
  
  const trackLength = useMemo(() => trackCurve.getLength(), [trackCurve]);
  
  // Track geometry - visible rail
  const trackGeo = useMemo(() => {
    return new THREE.TubeGeometry(trackCurve, 80, 0.08, 8, false);
  }, [trackCurve]);
  
  // Track support points
  const supportPoints = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 1; i += 0.2) {
      pts.push(trackCurve.getPoint(i));
    }
    return pts;
  }, [trackCurve]);

  useFrame(({ clock }) => {
    if (!coinRef.current) return;
    
    const t = (clock.elapsedTime % LOOP_DURATION) / LOOP_DURATION;
    
    if (t < ROLL_PHASE) {
      // Rolling phase
      const rollT = t / ROLL_PHASE;
      const pos = trackCurve.getPoint(rollT);
      const tangent = trackCurve.getTangent(rollT).normalize();
      
      // Position coin on track
      coinRef.current.position.set(pos.x, pos.y + COIN_RADIUS + 0.1, pos.z);
      
      // Orient to follow track
      const up = new THREE.Vector3(0, 1, 0);
      const right = new THREE.Vector3().crossVectors(tangent, up).normalize();
      const correctedUp = new THREE.Vector3().crossVectors(right, tangent).normalize();
      
      coinRef.current.quaternion.setFromRotationMatrix(
        new THREE.Matrix4().makeBasis(tangent, correctedUp, right)
      );
      
      // Physical roll rotation
      const distance = rollT * trackLength;
      const rollRadians = distance / COIN_RADIUS;
      rollAngleRef.current = rollRadians;
      coinRef.current.rotateOnAxis(new THREE.Vector3(0, 0, 1), rollRadians);
      
    } else {
      // Falling phase (gravity drop)
      const dropT = (t - ROLL_PHASE) / (1 - ROLL_PHASE);
      const endPos = trackCurve.getPoint(1);
      
      // Parabolic drop with acceleration
      const gravity = 9.8;
      const dropTime = dropT * 1.2;
      const dropY = endPos.y + COIN_RADIUS - 0.5 * gravity * dropTime * dropTime;
      
      // Slight forward momentum
      const forwardX = endPos.x + dropT * 1.5;
      
      coinRef.current.position.set(forwardX, Math.max(dropY, -3), endPos.z);
      
      // Tumble rotation during fall
      coinRef.current.rotation.x += 0.08;
      coinRef.current.rotation.y += 0.04;
    }
  });

  return (
    <group>
      {/* Track rail - visible geometric path */}
      <mesh geometry={trackGeo}>
        <meshBasicMaterial color={TRACK_COLOR} transparent opacity={0.9} />
      </mesh>
      
      {/* Track glow edge */}
      <mesh geometry={trackGeo} scale={[1.02, 1.02, 1.02]}>
        <meshBasicMaterial color={TRACK_GLOW} transparent opacity={0.15} />
      </mesh>
      
      {/* Track support pillars */}
      {supportPoints.map((pt, i) => (
        <group key={i} position={[pt.x, pt.y / 2, pt.z]}>
          <mesh>
            <boxGeometry args={[0.08, pt.y + 2, 0.08]} />
            <meshBasicMaterial color={TRACK_COLOR} transparent opacity={0.6} />
          </mesh>
        </group>
      ))}
      
      {/* THE COIN - Large and dominant */}
      <group ref={coinRef}>
        {/* Main coin body */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[COIN_RADIUS, COIN_RADIUS, COIN_THICKNESS, 48]} />
          <meshBasicMaterial color={GOLD} transparent opacity={0.95} />
        </mesh>
        
        {/* Coin wireframe overlay */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[COIN_RADIUS * 1.01, COIN_RADIUS * 1.01, COIN_THICKNESS * 1.1, 48]} />
          <meshBasicMaterial color={GOLD_BRIGHT} wireframe transparent opacity={0.4} />
        </mesh>
        
        {/* Inner ring - front face */}
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, COIN_THICKNESS / 2 + 0.01]}>
          <torusGeometry args={[COIN_RADIUS * 0.65, 0.06, 12, 48]} />
          <meshBasicMaterial color={GOLD_BRIGHT} transparent opacity={0.8} />
        </mesh>
        
        {/* Inner ring - back face */}
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -COIN_THICKNESS / 2 - 0.01]}>
          <torusGeometry args={[COIN_RADIUS * 0.65, 0.06, 12, 48]} />
          <meshBasicMaterial color={GOLD_BRIGHT} transparent opacity={0.8} />
        </mesh>
        
        {/* Center emblem - front */}
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, COIN_THICKNESS / 2 + 0.02]}>
          <circleGeometry args={[COIN_RADIUS * 0.35, 6]} />
          <meshBasicMaterial color={GOLD_DIM} transparent opacity={0.7} />
        </mesh>
        
        {/* Center emblem - back */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -COIN_THICKNESS / 2 - 0.02]}>
          <circleGeometry args={[COIN_RADIUS * 0.35, 6]} />
          <meshBasicMaterial color={GOLD_DIM} transparent opacity={0.7} />
        </mesh>
      </group>
    </group>
  );
}

// ─── Ambient grid for depth ──────────────────────────────────
function AmbientGrid() {
  const ref = useRef<THREE.GridHelper>(null);
  
  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.position.z = (clock.elapsedTime * 0.15) % 1;
    }
  });
  
  return (
    <gridHelper
      ref={ref}
      args={[40, 40, '#0f2a1f', '#0a1f16']}
      position={[0, -3.5, 0]}
      rotation={[0, 0, 0]}
    />
  );
}

// ─── Scene Composition ───────────────────────────────────────
function Scene() {
  return (
    <>
      <AmbientGrid />
      <LargeCoin />
    </>
  );
}

// ─── Exported Component ──────────────────────────────────────
export const HeroTokenScene: React.FC = () => {
  return (
    <div 
      className="w-full h-full min-h-[350px]"
      style={{ 
        background: 'linear-gradient(135deg, rgba(7,17,13,0.2) 0%, rgba(15,42,31,0.4) 100%)'
      }}
    >
      <Canvas
        camera={{ position: [0, 3, 9], fov: 45, near: 0.1, far: 100 }}
        dpr={[1, 2]}
        gl={{ 
          antialias: true, 
          alpha: true,
          powerPreference: 'high-performance',
        }}
        style={{ pointerEvents: 'none' }}
      >
        <fog attach="fog" args={['#07110d', 12, 35]} />
        <Scene />
      </Canvas>
    </div>
  );
};
