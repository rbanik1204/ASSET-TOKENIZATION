import React, { useRef, useMemo, Component, type ErrorInfo, type ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

// ─── ERROR BOUNDARY ──────────────────────────────────────────
class WebGLErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn('[WebGL] Scene crashed, falling back to static bg:', error.message);
  }
  render() {
    if (this.state.hasError) return null;          // graceful: just hide the background
    return this.props.children;
  }
}

// ─── CONSTANTS (plain hex — avoid module-level THREE objects) ─
const ACCENT_HEX = '#00e08a';
const ACCENT_DIM_HEX = '#114531';
const GRID_HEX = '#0f2a1f';

// ─── WIREFRAME GRID FLOOR ────────────────────────────────────
function InfiniteGrid() {
  const ref = useRef<THREE.GridHelper>(null);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    // Slow drift to convey continuous process
    ref.current.position.z = (clock.elapsedTime * 0.3) % 2;
  });

  return (
    <gridHelper
      ref={ref}
      args={[120, 60, GRID_HEX, GRID_HEX]}
      position={[0, -3, 0]}
      rotation={[0, 0, 0]}
    />
  );
}

// ─── ROTATING WIREFRAME TOKEN CUBE ───────────────────────────
function TokenCube({
  position,
  size = 1,
  speed = 0.15,
  phaseOffset = 0,
}: {
  position: [number, number, number];
  size?: number;
  speed?: number;
  phaseOffset?: number;
}) {
  const outerRef = useRef<THREE.Mesh>(null);
  const innerRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime * speed + phaseOffset;
    if (outerRef.current) {
      outerRef.current.rotation.x = t * 0.7;
      outerRef.current.rotation.y = t;
    }
    if (innerRef.current) {
      innerRef.current.rotation.x = -t * 0.5;
      innerRef.current.rotation.z = t * 0.8;
    }
  });

  return (
    <group position={position}>
      <mesh ref={outerRef}>
        <boxGeometry args={[size, size, size]} />
        <meshBasicMaterial color={ACCENT_HEX} wireframe opacity={0.35} transparent />
      </mesh>
      <mesh ref={innerRef}>
        <boxGeometry args={[size * 0.55, size * 0.55, size * 0.55]} />
        <meshBasicMaterial color={ACCENT_HEX} wireframe opacity={0.2} transparent />
      </mesh>
    </group>
  );
}

// ─── NETWORK MESH (ownership / liquidity graph) ──────────────
function NetworkMesh({ nodeCount = 24 }: { nodeCount?: number }) {
  const groupRef = useRef<THREE.Group>(null);

  const { positions, edges } = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const edgeList: [number, number][] = [];

    for (let i = 0; i < nodeCount; i++) {
      pts.push(
        new THREE.Vector3(
          (Math.random() - 0.5) * 14,
          (Math.random() - 0.5) * 6,
          (Math.random() - 0.5) * 10
        )
      );
    }

    // Connect nearby nodes (Delaunay-ish)
    for (let i = 0; i < nodeCount; i++) {
      for (let j = i + 1; j < nodeCount; j++) {
        if (pts[i].distanceTo(pts[j]) < 5.5) {
          edgeList.push([i, j]);
        }
      }
    }

    return { positions: pts, edges: edgeList };
  }, [nodeCount]);

  // Edge geometry (static LineSegments)
  const lineGeo = useMemo(() => {
    const verts: number[] = [];
    edges.forEach(([a, b]) => {
      verts.push(positions[a].x, positions[a].y, positions[a].z);
      verts.push(positions[b].x, positions[b].y, positions[b].z);
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    return geo;
  }, [positions, edges]);

  // Node points
  const pointGeo = useMemo(() => {
    const verts: number[] = [];
    positions.forEach((p) => verts.push(p.x, p.y, p.z));
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    return geo;
  }, [positions]);

  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = clock.elapsedTime * 0.02;
    }
  });

  return (
    <group ref={groupRef}>
      <lineSegments geometry={lineGeo}>
        <lineBasicMaterial color={ACCENT_HEX} opacity={0.12} transparent />
      </lineSegments>
      <points geometry={pointGeo}>
        <pointsMaterial color={ACCENT_HEX} size={0.12} sizeAttenuation transparent opacity={0.5} />
      </points>
    </group>
  );
}

// ─── VALUE FLOW LINES ────────────────────────────────────────
function ValueFlowLine({
  start,
  end,
  speed = 0.4,
  phaseOffset = 0,
}: {
  start: [number, number, number];
  end: [number, number, number];
  speed?: number;
  phaseOffset?: number;
}) {
  const ref = useRef<THREE.Mesh>(null);

  const curve = useMemo(() => {
    const mid: [number, number, number] = [
      (start[0] + end[0]) / 2,
      (start[1] + end[1]) / 2 + 1.5,
      (start[2] + end[2]) / 2,
    ];
    return new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(...start),
      new THREE.Vector3(...mid),
      new THREE.Vector3(...end)
    );
  }, [start, end]);

  const tubeGeo = useMemo(() => {
    return new THREE.TubeGeometry(curve, 32, 0.015, 4, false);
  }, [curve]);

  // Traveling dot
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = ((clock.elapsedTime * speed + phaseOffset) % 1 + 1) % 1;
    const pos = curve.getPoint(t);
    ref.current.position.copy(pos);
  });

  return (
    <group>
      <mesh geometry={tubeGeo}>
        <meshBasicMaterial color={ACCENT_DIM_HEX} opacity={0.25} transparent />
      </mesh>
      <mesh ref={ref}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshBasicMaterial color={ACCENT_HEX} opacity={0.9} transparent />
      </mesh>
    </group>
  );
}

// ─── TOKEN COIN ON RAIL ──────────────────────────────────────
function CoinOnRail() {
  const coinRef = useRef<THREE.Group>(null);
  const COIN_RADIUS = 0.3;
  const COIN_THICKNESS = 0.06;

  // Gentle curved track
  const trackCurve = useMemo(() => {
    return new THREE.CatmullRomCurve3(
      [
        new THREE.Vector3(-6, -1.5, 2),
        new THREE.Vector3(-3, -1.0, 0),
        new THREE.Vector3(0, -0.6, -1),
        new THREE.Vector3(3, -1.0, 0),
        new THREE.Vector3(6, -1.5, 2),
      ],
      false,
      'catmullrom',
      0.5
    );
  }, []);

  const trackLength = useMemo(() => trackCurve.getLength(), [trackCurve]);

  const railGeo = useMemo(() => {
    return new THREE.TubeGeometry(trackCurve, 64, 0.02, 4, false);
  }, [trackCurve]);

  useFrame(({ clock }) => {
    if (!coinRef.current) return;
    // Loop every ~14 seconds
    const t = (clock.elapsedTime * 0.07) % 1;
    const pos = trackCurve.getPoint(t);
    const tangent = trackCurve.getTangent(t);
    coinRef.current.position.copy(pos);

    // Orient coin to roll along the tangent
    const up = new THREE.Vector3(0, 1, 0);
    const right = new THREE.Vector3().crossVectors(tangent, up).normalize();
    coinRef.current.quaternion.setFromRotationMatrix(
      new THREE.Matrix4().makeBasis(tangent, up, right)
    );

    // Roll spin = distance traveled / circumference * 2π
    const circumference = 2 * Math.PI * COIN_RADIUS;
    const distanceTraveled = t * trackLength;
    const rollAngle = (distanceTraveled / circumference) * Math.PI * 2;
    coinRef.current.rotateOnAxis(new THREE.Vector3(0, 0, 1), rollAngle * 0.016);
  });

  return (
    <group>
      {/* Rail */}
      <mesh geometry={railGeo}>
        <meshBasicMaterial color={ACCENT_DIM_HEX} opacity={0.3} transparent />
      </mesh>
      {/* Coin */}
      <group ref={coinRef}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[COIN_RADIUS, COIN_RADIUS, COIN_THICKNESS, 16]} />
          <meshBasicMaterial color={ACCENT_HEX} wireframe opacity={0.5} transparent />
        </mesh>
        {/* Inner ring on coin face */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[COIN_RADIUS * 0.6, 0.015, 6, 16]} />
          <meshBasicMaterial color={ACCENT_HEX} opacity={0.4} transparent />
        </mesh>
      </group>
    </group>
  );
}

// ─── SCENE COMPOSITION ──────────────────────────────────────
function Scene() {
  return (
    <>
      <InfiniteGrid />

      {/* Network mesh */}
      <NetworkMesh nodeCount={22} />

      {/* Value flow arcs */}
      <ValueFlowLine start={[-5, 1.2, -3]} end={[3, 2.2, -5]} speed={0.22} phaseOffset={0.1} />
      <ValueFlowLine start={[-3, 0.8, -6]} end={[5, 1.4, -3]} speed={0.2} phaseOffset={0.6} />
    </>
  );
}

// ─── CAMERA PARALLAX ─────────────────────────────────────────
function CameraRig() {
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);

  useFrame(({ camera, clock }) => {
    const t = clock.elapsedTime;
    // Subtle breathing motion
    camera.position.x = Math.sin(t * 0.08) * 0.4;
    camera.position.y = 2 + Math.sin(t * 0.06) * 0.25;
    camera.lookAt(0, 0, -3);
  });

  return null;
}

// ─── ENHANCED SCENE ──────────────────────────────────────────
function EnhancedScene() {
  return (
    <>
      <CameraRig />
      <InfiniteGrid />
      <NetworkMesh nodeCount={30} />
      {/* Multiple flow lines for activity */}
      <ValueFlowLine start={[-8, 2, -4]} end={[6, 3, -8]} speed={0.18} phaseOffset={0} />
      <ValueFlowLine start={[7, 1.5, -3]} end={[-6, 4, -10]} speed={0.22} phaseOffset={0.35} />
      <ValueFlowLine start={[-4, 3.5, -6]} end={[4, 1, -5]} speed={0.15} phaseOffset={0.7} />
    </>
  );
}

// ─── EXPORTED CANVAS ─────────────────────────────────────────
export const WebGLBackground: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <WebGLErrorBoundary>
    <div 
      className={`fixed inset-0 -z-10 ${className ?? ''}`} 
      style={{ 
        background: 'linear-gradient(180deg, #050d0a 0%, #07110d 30%, #0a1914 70%, #0d2318 100%)'
      }}
    >
      <Canvas
        camera={{ position: [0, 2, 10], fov: 50, near: 0.1, far: 200 }}
        dpr={[1, 1.5]}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
        }}
        style={{ pointerEvents: 'none' }}
      >
        <fog attach="fog" args={['#07110d', 10, 35]} />
        <EnhancedScene />
      </Canvas>
    </div>
    </WebGLErrorBoundary>
  );
};
