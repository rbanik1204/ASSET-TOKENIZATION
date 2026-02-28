import React, { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const GOLD = '#caa44a';
const GOLD_BRIGHT = '#f5d27a';
const RAIL = '#1b3d2b';

function HeroCoinAnimation() {
  const coinRef = useRef<THREE.Group>(null);

  const radius = 0.58;
  const thickness = 0.12;
  const duration = 10;

  const railCurve = useMemo(
    () =>
      new THREE.CatmullRomCurve3(
        [
          new THREE.Vector3(-3.1, 0.12, -0.2),
          new THREE.Vector3(-1.5, 0.22, -0.12),
          new THREE.Vector3(0, 0.26, 0),
          new THREE.Vector3(1.7, 0.22, 0.1),
          new THREE.Vector3(3.1, 0.15, 0.18),
        ],
        false,
        'catmullrom',
        0.5
      ),
    []
  );

  const railLength = useMemo(() => railCurve.getLength(), [railCurve]);
  const railGeometry = useMemo(() => new THREE.TubeGeometry(railCurve, 120, 0.03, 6, false), [railCurve]);

  useFrame(({ clock }) => {
    if (!coinRef.current) return;

    const loop = (clock.elapsedTime % duration) / duration;
    const rollingPhase = 0.84;

    if (loop < rollingPhase) {
      const t = loop / rollingPhase;
      const pos = railCurve.getPoint(t);
      const tangent = railCurve.getTangent(t).normalize();

      coinRef.current.position.set(pos.x, pos.y + radius + 0.02, pos.z);

      const up = new THREE.Vector3(0, 1, 0);
      const right = new THREE.Vector3().crossVectors(tangent, up).normalize();
      const correctedUp = new THREE.Vector3().crossVectors(right, tangent).normalize();

      coinRef.current.quaternion.setFromRotationMatrix(
        new THREE.Matrix4().makeBasis(tangent, correctedUp, right)
      );

      const distance = t * railLength;
      const rollRadians = distance / radius;
      coinRef.current.rotateOnAxis(new THREE.Vector3(0, 0, 1), rollRadians);
      return;
    }

    const end = railCurve.getPoint(1);
    const dropT = (loop - rollingPhase) / (1 - rollingPhase);
    const dropDistance = 1.8;
    const dropY = end.y + radius - dropDistance * Math.pow(dropT, 1.35);

    coinRef.current.position.set(end.x, dropY, end.z);
    coinRef.current.rotateOnAxis(new THREE.Vector3(1, 0, 0), 0.05);
  });

  return (
    <group>
      <mesh geometry={railGeometry}>
        <meshBasicMaterial color={RAIL} transparent opacity={0.75} />
      </mesh>

      <group ref={coinRef}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[radius, radius, thickness, 32]} />
          <meshBasicMaterial color={GOLD} wireframe transparent opacity={0.88} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[radius * 0.62, 0.024, 10, 48]} />
          <meshBasicMaterial color={GOLD_BRIGHT} transparent opacity={0.7} />
        </mesh>
      </group>
    </group>
  );
}

export const HeroCoinRailScene: React.FC = () => {
  return (
    <div className="h-[300px] w-full border-4 border-foreground bg-card/35 backdrop-blur-[2px]">
      <Canvas
        camera={{ position: [0, 2.4, 7.8], fov: 40, near: 0.1, far: 120 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        style={{ pointerEvents: 'none' }}
      >
        <fog attach="fog" args={['#06140f', 6, 20]} />
        <HeroCoinAnimation />
      </Canvas>
    </div>
  );
};
