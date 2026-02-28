/**
 * Infrastructure Visualization — Asset Flow System
 * 
 * Visual representation of:
 * - Real-world asset tokenization
 * - Value flow through infrastructure
 * - Blockchain settlement and execution
 * 
 * NOT decorative — SYSTEM VISUALIZATION
 */

import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// ─── COLORS ──────────────────────────────────────────────────
const GRID_COLOR = '#0d2318';
const GRID_SECONDARY = '#071510';
const LANE_COLOR = '#00e08a';
const TOKEN_COLOR = '#00ff9d';
const TOKEN_DIM = '#007a4d';
const NODE_GLOW = '#00c77a';

// ─── PERSPECTIVE GRID FLOOR ──────────────────────────────────
function InfrastructureGrid() {
  const gridRef = useRef<THREE.Group>(null);
  
  // Create grid lines manually for better control
  const gridLines = useMemo(() => {
    const lines: { start: THREE.Vector3; end: THREE.Vector3; opacity: number }[] = [];
    
    // Horizontal lines (Z direction - into depth)
    for (let i = -20; i <= 20; i += 2) {
      const opacity = 1 - Math.abs(i) / 25;
      lines.push({
        start: new THREE.Vector3(i, 0, -30),
        end: new THREE.Vector3(i, 0, 10),
        opacity: opacity * 0.3,
      });
    }
    
    // Vertical lines (X direction)
    for (let i = -30; i <= 10; i += 3) {
      const opacity = 1 - Math.abs(i + 10) / 45;
      lines.push({
        start: new THREE.Vector3(-20, 0, i),
        end: new THREE.Vector3(20, 0, i),
        opacity: opacity * 0.25,
      });
    }
    
    return lines;
  }, []);

  return (
    <group ref={gridRef} position={[0, -3, 0]} rotation={[0, 0, 0]}>
      {gridLines.map((line, i) => (
        <line key={i}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={2}
              array={new Float32Array([
                line.start.x, line.start.y, line.start.z,
                line.end.x, line.end.y, line.end.z,
              ])}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color={GRID_COLOR} transparent opacity={line.opacity} />
        </line>
      ))}
    </group>
  );
}

// ─── TRANSACTION NODES ───────────────────────────────────────
function TransactionNode({
  position,
  delay = 0,
}: {
  position: [number, number, number];
  delay?: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  
  useFrame(({ clock }) => {
    if (!meshRef.current || !glowRef.current) return;
    
    // Slow pulse when "transaction" passes
    const t = clock.elapsedTime + delay;
    const pulse = Math.sin(t * 0.5) * 0.5 + 0.5;
    const active = Math.sin(t * 0.2) > 0.7 ? 1 : 0.3;
    
    const mat = meshRef.current.material as THREE.MeshBasicMaterial;
    mat.opacity = 0.3 + pulse * 0.4 * active;
    
    const glowMat = glowRef.current.material as THREE.MeshBasicMaterial;
    glowMat.opacity = active * pulse * 0.2;
  });

  return (
    <group position={position}>
      {/* Node core */}
      <mesh ref={meshRef}>
        <boxGeometry args={[0.15, 0.15, 0.15]} />
        <meshBasicMaterial color={NODE_GLOW} transparent opacity={0.4} />
      </mesh>
      {/* Glow */}
      <mesh ref={glowRef} scale={[2, 2, 2]}>
        <boxGeometry args={[0.15, 0.15, 0.15]} />
        <meshBasicMaterial color={TOKEN_COLOR} transparent opacity={0.1} />
      </mesh>
    </group>
  );
}

// ─── GRID NODES LAYER ────────────────────────────────────────
function GridNodes() {
  const nodes = useMemo(() => {
    const positions: { pos: [number, number, number]; delay: number }[] = [];
    
    // Place nodes at grid intersections
    for (let x = -12; x <= 12; x += 4) {
      for (let z = -20; z <= 5; z += 5) {
        // Random but deterministic delay
        const delay = (x + 12) * 0.1 + (z + 20) * 0.05;
        positions.push({
          pos: [x, -2.9, z],
          delay,
        });
      }
    }
    
    return positions;
  }, []);

  return (
    <group>
      {nodes.map((node, i) => (
        <TransactionNode key={i} position={node.pos} delay={node.delay} />
      ))}
    </group>
  );
}

// ─── ASSET TOKEN (Moving block) ──────────────────────────────
function AssetToken({
  lane,
  speed = 0.3,
  delay = 0,
  size = 0.2,
}: {
  lane: THREE.CatmullRomCurve3;
  speed?: number;
  delay?: number;
  size?: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const trailRef = useRef<THREE.Mesh>(null);
  
  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    
    // Calculate position along lane (0 to 1, looping)
    const t = ((clock.elapsedTime * speed * 0.05 + delay) % 1 + 1) % 1;
    const pos = lane.getPoint(t);
    
    groupRef.current.position.copy(pos);
    
    // Fade in/out at ends
    const fadeIn = Math.min(t * 5, 1);
    const fadeOut = Math.min((1 - t) * 5, 1);
    const opacity = fadeIn * fadeOut;
    
    const mat = groupRef.current.children[0] as THREE.Mesh;
    if (mat && mat.material) {
      (mat.material as THREE.MeshBasicMaterial).opacity = opacity * 0.8;
    }
    
    // Trail glow
    if (trailRef.current) {
      (trailRef.current.material as THREE.MeshBasicMaterial).opacity = opacity * 0.15;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Core token */}
      <mesh>
        <boxGeometry args={[size, size * 0.6, size * 0.4]} />
        <meshBasicMaterial color={TOKEN_COLOR} transparent opacity={0.8} />
      </mesh>
      {/* Inner detail */}
      <mesh position={[0, 0, size * 0.21]}>
        <planeGeometry args={[size * 0.6, size * 0.35]} />
        <meshBasicMaterial color={TOKEN_DIM} transparent opacity={0.5} />
      </mesh>
      {/* Trail glow */}
      <mesh ref={trailRef} position={[-size * 1.5, 0, 0]} scale={[3, 0.8, 0.8]}>
        <boxGeometry args={[size, size * 0.6, size * 0.4]} />
        <meshBasicMaterial color={LANE_COLOR} transparent opacity={0.15} />
      </mesh>
    </group>
  );
}

// ─── FLOW LANE (Path for tokens) ─────────────────────────────
function FlowLane({
  points,
  tokens = 3,
  speed = 0.3,
}: {
  points: THREE.Vector3[];
  tokens?: number;
  speed?: number;
}) {
  const curve = useMemo(() => {
    return new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.3);
  }, [points]);
  
  const tubeGeo = useMemo(() => {
    return new THREE.TubeGeometry(curve, 64, 0.015, 6, false);
  }, [curve]);

  // Generate token delays
  const tokenDelays = useMemo(() => {
    return Array.from({ length: tokens }, (_, i) => i / tokens);
  }, [tokens]);

  return (
    <group>
      {/* Lane path (subtle line) */}
      <mesh geometry={tubeGeo}>
        <meshBasicMaterial color={GRID_COLOR} transparent opacity={0.4} />
      </mesh>
      
      {/* Moving tokens */}
      {tokenDelays.map((delay, i) => (
        <AssetToken
          key={i}
          lane={curve}
          speed={speed}
          delay={delay}
          size={0.18 + Math.random() * 0.08}
        />
      ))}
    </group>
  );
}

// ─── ASSET FLOW LANES SYSTEM ─────────────────────────────────
function AssetFlowSystem() {
  // Define multiple lanes going left-to-right with depth
  const lanes = useMemo(() => [
    // Top lane - slight curve
    {
      points: [
        new THREE.Vector3(-15, 2, -8),
        new THREE.Vector3(-8, 2.2, -7),
        new THREE.Vector3(0, 2, -6),
        new THREE.Vector3(8, 1.8, -5),
        new THREE.Vector3(15, 2, -4),
      ],
      tokens: 4,
      speed: 0.25,
    },
    // Middle lane - main flow
    {
      points: [
        new THREE.Vector3(-15, 0.5, -4),
        new THREE.Vector3(-5, 0.8, -3),
        new THREE.Vector3(5, 0.5, -2),
        new THREE.Vector3(15, 0.3, -1),
      ],
      tokens: 5,
      speed: 0.35,
    },
    // Lower lane
    {
      points: [
        new THREE.Vector3(-15, -0.8, -2),
        new THREE.Vector3(-3, -0.5, -1),
        new THREE.Vector3(8, -0.8, 0),
        new THREE.Vector3(15, -1, 1),
      ],
      tokens: 3,
      speed: 0.2,
    },
    // Deep background lane
    {
      points: [
        new THREE.Vector3(-12, 3.5, -15),
        new THREE.Vector3(0, 3.8, -14),
        new THREE.Vector3(12, 3.5, -13),
      ],
      tokens: 2,
      speed: 0.15,
    },
    // Diagonal settlement lane
    {
      points: [
        new THREE.Vector3(-10, 4, -12),
        new THREE.Vector3(-2, 1.5, -6),
        new THREE.Vector3(6, -0.5, -2),
        new THREE.Vector3(14, -1.5, 2),
      ],
      tokens: 4,
      speed: 0.3,
    },
  ], []);

  return (
    <group>
      {lanes.map((lane, i) => (
        <FlowLane
          key={i}
          points={lane.points}
          tokens={lane.tokens}
          speed={lane.speed}
        />
      ))}
    </group>
  );
}

// ─── CONNECTION PULSES ───────────────────────────────────────
function ConnectionPulse({
  start,
  end,
  interval = 4,
  delay = 0,
}: {
  start: [number, number, number];
  end: [number, number, number];
  interval?: number;
  delay?: number;
}) {
  const dotRef = useRef<THREE.Mesh>(null);
  
  const curve = useMemo(() => {
    const mid: [number, number, number] = [
      (start[0] + end[0]) / 2,
      (start[1] + end[1]) / 2 + 0.5,
      (start[2] + end[2]) / 2,
    ];
    return new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(...start),
      new THREE.Vector3(...mid),
      new THREE.Vector3(...end)
    );
  }, [start, end]);

  useFrame(({ clock }) => {
    if (!dotRef.current) return;
    
    const cycleTime = (clock.elapsedTime + delay) % interval;
    const t = cycleTime / (interval * 0.6); // Pulse takes 60% of cycle
    
    if (t <= 1) {
      const pos = curve.getPoint(t);
      dotRef.current.position.copy(pos);
      dotRef.current.visible = true;
      
      // Fade out at end
      const mat = dotRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = t < 0.2 ? t * 5 : (1 - t) * 1.25;
    } else {
      dotRef.current.visible = false;
    }
  });

  const linePoints = useMemo(() => {
    const pts = curve.getPoints(20);
    const positions = new Float32Array(pts.length * 3);
    pts.forEach((p, i) => {
      positions[i * 3] = p.x;
      positions[i * 3 + 1] = p.y;
      positions[i * 3 + 2] = p.z;
    });
    return positions;
  }, [curve]);

  return (
    <group>
      {/* Connection line */}
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={21}
            array={linePoints}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color={GRID_COLOR} transparent opacity={0.2} />
      </line>
      
      {/* Moving pulse dot */}
      <mesh ref={dotRef}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshBasicMaterial color={TOKEN_COLOR} transparent opacity={0.8} />
      </mesh>
    </group>
  );
}

// ─── SETTLEMENT CONNECTIONS ──────────────────────────────────
function SettlementNetwork() {
  const connections = useMemo(() => [
    { start: [-8, 0, -5] as [number, number, number], end: [-4, -1, -3] as [number, number, number], delay: 0 },
    { start: [-4, -1, -3] as [number, number, number], end: [2, 0.5, -2] as [number, number, number], delay: 1.2 },
    { start: [2, 0.5, -2] as [number, number, number], end: [8, -0.5, -1] as [number, number, number], delay: 2.4 },
    { start: [-6, 2, -8] as [number, number, number], end: [0, 1, -5] as [number, number, number], delay: 0.8 },
    { start: [0, 1, -5] as [number, number, number], end: [6, 1.5, -3] as [number, number, number], delay: 2 },
  ], []);

  return (
    <group>
      {connections.map((conn, i) => (
        <ConnectionPulse
          key={i}
          start={conn.start}
          end={conn.end}
          delay={conn.delay}
          interval={5}
        />
      ))}
    </group>
  );
}

// ─── SCENE COMPOSITION ───────────────────────────────────────
function Scene() {
  const groupRef = useRef<THREE.Group>(null);
  
  // Slow camera drift
  useFrame(({ clock, camera }) => {
    const t = clock.elapsedTime;
    camera.position.x = Math.sin(t * 0.03) * 0.5;
    camera.position.y = 3 + Math.sin(t * 0.02) * 0.3;
    camera.lookAt(2, 0, -5);
  });

  return (
    <group ref={groupRef}>
      {/* Infrastructure grid */}
      <InfrastructureGrid />
      
      {/* Grid intersection nodes */}
      <GridNodes />
      
      {/* Asset flow lanes */}
      <AssetFlowSystem />
      
      {/* Settlement connections */}
      <SettlementNetwork />
    </group>
  );
}

// ─── EXPORTED COMPONENT ──────────────────────────────────────
export const InfrastructureVisualization: React.FC = () => {
  return (
    <div 
      className="fixed inset-0 pointer-events-none"
      style={{
        zIndex: 0,
        background: 'linear-gradient(135deg, #030a07 0%, #07110d 30%, #0a1914 60%, #0d2318 100%)',
      }}
    >
      <Canvas
        camera={{ 
          position: [0, 3, 8], 
          fov: 55,
          near: 0.1,
          far: 100,
        }}
        dpr={[1, 1.5]}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
        }}
      >
        <fog attach="fog" args={['#07110d', 8, 35]} />
        <Scene />
      </Canvas>
    </div>
  );
};
