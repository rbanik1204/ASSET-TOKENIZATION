/**
 * Solais-Style 3D Block Animation
 * 
 * Features:
 * - Metallic stacked blocks like Solais.ai
 * - Scroll-responsive rotation
 * - Mouse-responsive parallax
 * - Smooth glow effect
 * - Fixed background position
 */

import React, { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// ─── COLORS (Green theme) ────────────────────────────────────
const BLOCK_PRIMARY = '#00e08a';
const BLOCK_SECONDARY = '#007a4d';
const BLOCK_DARK = '#004d30';
const BLOCK_GLOW = '#00ff9d';

// ─── Global state for scroll and mouse ───────────────────────
let globalScrollY = 0;
let globalMouseX = 0;
let globalMouseY = 0;

// ─── Single Metallic Block ───────────────────────────────────
function MetallicBlock({
  position,
  size = [1, 0.3, 0.5],
  delay = 0,
}: {
  position: [number, number, number];
  size?: [number, number, number];
  delay?: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  
  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    
    // Subtle individual breathing animation
    const t = clock.elapsedTime + delay;
    meshRef.current.position.y = position[1] + Math.sin(t * 0.8) * 0.03;
    
    // Glow intensity pulsing
    if (glowRef.current) {
      const mat = glowRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.15 + Math.sin(t * 1.2) * 0.05;
    }
  });

  return (
    <group position={position}>
      {/* Main block with gradient effect */}
      <mesh ref={meshRef} castShadow>
        <boxGeometry args={size} />
        <meshStandardMaterial
          color={BLOCK_PRIMARY}
          metalness={0.9}
          roughness={0.2}
          envMapIntensity={1.5}
        />
      </mesh>
      
      {/* Top highlight edge */}
      <mesh position={[0, size[1] / 2 + 0.01, 0]}>
        <boxGeometry args={[size[0] * 0.95, 0.02, size[2] * 0.95]} />
        <meshBasicMaterial color={BLOCK_GLOW} transparent opacity={0.4} />
      </mesh>
      
      {/* Glow effect */}
      <mesh ref={glowRef} scale={[1.15, 1.3, 1.15]}>
        <boxGeometry args={size} />
        <meshBasicMaterial color={BLOCK_GLOW} transparent opacity={0.15} side={THREE.BackSide} />
      </mesh>
    </group>
  );
}

// ─── Block Grid Formation ────────────────────────────────────
function BlockFormation() {
  const groupRef = useRef<THREE.Group>(null);
  const targetRotationY = useRef(0);
  const targetRotationX = useRef(0);
  const currentRotationY = useRef(0);
  const currentRotationX = useRef(0);
  
  // Block positions in Solais-style stacked pattern
  const blocks = useMemo(() => {
    const positions: { pos: [number, number, number]; delay: number }[] = [];
    
    // Create a 3x4 stacked pattern like Solais
    const rows = 4;
    const cols = 3;
    const blockWidth = 1.4;
    const blockHeight = 0.35;
    const blockDepth = 0.6;
    const gapX = 0.15;
    const gapY = 0.2;
    
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        // Stagger pattern - offset based on row
        const offsetX = (row % 2) * 0.3;
        const x = (col - (cols - 1) / 2) * (blockWidth + gapX) + offsetX;
        const y = (row - (rows - 1) / 2) * (blockHeight + gapY);
        const z = -row * 0.15; // Slight depth offset
        
        positions.push({
          pos: [x, y, z],
          delay: row * 0.3 + col * 0.15,
        });
      }
    }
    
    return positions;
  }, []);

  useFrame(() => {
    if (!groupRef.current) return;
    
    // Calculate target rotation based on scroll (rotate on Y axis)
    targetRotationY.current = globalScrollY * 0.002;
    
    // Mouse parallax effect (subtle tilt)
    targetRotationX.current = globalMouseY * 0.15;
    const mouseRotationY = globalMouseX * 0.15;
    
    // Smooth interpolation (lerp)
    currentRotationY.current += (targetRotationY.current + mouseRotationY - currentRotationY.current) * 0.05;
    currentRotationX.current += (targetRotationX.current - currentRotationX.current) * 0.05;
    
    groupRef.current.rotation.y = currentRotationY.current;
    groupRef.current.rotation.x = currentRotationX.current;
  });

  return (
    <group ref={groupRef}>
      {blocks.map((block, i) => (
        <MetallicBlock
          key={i}
          position={block.pos}
          size={[1.4, 0.35, 0.6]}
          delay={block.delay}
        />
      ))}
    </group>
  );
}

// ─── Floating Binary Text ────────────────────────────────────
function FloatingCode() {
  const groupRef = useRef<THREE.Group>(null);
  
  const codes = useMemo(() => [
    { text: '01_', pos: [-3.5, 2, -2] },
    { text: '1__1011', pos: [3.2, 1.5, -1] },
    { text: '100__10_', pos: [4, -1, -1.5] },
    { text: '00001110_', pos: [-2, -2, -1] },
  ], []);

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.y = globalScrollY * 0.0005;
    }
  });

  // Note: For proper text, you'd use @react-three/drei Text component
  // Here we'll create simple placeholder sprites
  return (
    <group ref={groupRef}>
      {codes.map((code, i) => (
        <sprite key={i} position={code.pos as [number, number, number]} scale={[2, 0.3, 1]}>
          <spriteMaterial color={BLOCK_PRIMARY} transparent opacity={0.25} />
        </sprite>
      ))}
    </group>
  );
}

// ─── Scene Setup ─────────────────────────────────────────────
function Scene() {
  return (
    <>
      {/* Lighting for metallic effect */}
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 5, 5]} intensity={1.2} color="#ffffff" />
      <directionalLight position={[-5, 3, -5]} intensity={0.6} color={BLOCK_GLOW} />
      <pointLight position={[0, 3, 3]} intensity={1} color={BLOCK_GLOW} />
      
      {/* Main block formation - shifted right */}
      <group position={[2.5, 0, 0]}>
        <BlockFormation />
      </group>
      
      {/* Floating code elements */}
      <FloatingCode />
    </>
  );
}

// ─── Main Exported Component ─────────────────────────────────
export const SolaisAnimation: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Scroll listener
    const handleScroll = () => {
      globalScrollY = window.scrollY;
    };
    
    // Mouse listener
    const handleMouseMove = (e: MouseEvent) => {
      // Normalize to -1 to 1
      globalMouseX = (e.clientX / window.innerWidth - 0.5) * 2;
      globalMouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 pointer-events-none"
      style={{
        zIndex: 1,
        background: 'radial-gradient(ellipse at 60% 40%, rgba(0,224,138,0.12) 0%, transparent 50%)',
      }}
    >
      <Canvas
        camera={{ position: [0, 0, 8], fov: 45 }}
        dpr={[1, 2]}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
        }}
      >
        <Scene />
      </Canvas>
    </div>
  );
};
