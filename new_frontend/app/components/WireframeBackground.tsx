import React, { useRef, useEffect } from 'react';

interface Node {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
}

export const WireframeBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodesRef = useRef<Node[]>([]);
  const frameRef = useRef<number>();
  const timeRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Initialize nodes for 3D network
    const nodeCount = 80;
    nodesRef.current = Array.from({ length: nodeCount }, () => ({
      x: Math.random() * 2000 - 1000,
      y: Math.random() * 2000 - 1000,
      z: Math.random() * 2000 - 1000,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      vz: (Math.random() - 0.5) * 0.4,
    }));

    let rotation = { x: 0, y: 0, z: 0 };

    const project = (x: number, y: number, z: number) => {
      // Simple perspective projection
      const fov = 800;
      const scale = fov / (fov + z);
      return {
        x: x * scale + canvas.width / 2,
        y: y * scale + canvas.height / 2,
        scale,
      };
    };

    const rotatePoint = (x: number, y: number, z: number) => {
      // Rotate around Y axis
      let cosY = Math.cos(rotation.y);
      let sinY = Math.sin(rotation.y);
      let tempX = x * cosY - z * sinY;
      let tempZ = x * sinY + z * cosY;
      x = tempX;
      z = tempZ;

      // Rotate around X axis
      let cosX = Math.cos(rotation.x);
      let sinX = Math.sin(rotation.x);
      let tempY = y * cosX - z * sinX;
      tempZ = y * sinX + z * cosX;
      y = tempY;
      z = tempZ;

      return { x, y, z };
    };

    const animate = () => {
      // Fade effect for trails
      ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Slow continuous rotation
      rotation.y += 0.002;
      rotation.x += 0.001;
      
      // Pulsing effect
      timeRef.current += 0.02;
      const pulse = Math.sin(timeRef.current) * 0.2 + 1;

      // Update and draw nodes
      const nodes = nodesRef.current;
      
      // Update positions
      nodes.forEach(node => {
        node.x += node.vx;
        node.y += node.vy;
        node.z += node.vz;

        // Boundary constraints with bounce
        if (Math.abs(node.x) > 1000) node.vx *= -1;
        if (Math.abs(node.y) > 1000) node.vy *= -1;
        if (Math.abs(node.z) > 1000) node.vz *= -1;
      });

      // Draw connections (wireframe)
      ctx.strokeStyle = 'rgba(0, 255, 0, 0.15)';
      ctx.lineWidth = 1;

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dz = nodes[i].z - nodes[j].z;
          const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

          if (distance < 450) {
            const rotated1 = rotatePoint(nodes[i].x, nodes[i].y, nodes[i].z);
            const rotated2 = rotatePoint(nodes[j].x, nodes[j].y, nodes[j].z);
            
            const proj1 = project(rotated1.x, rotated1.y, rotated1.z);
            const proj2 = project(rotated2.x, rotated2.y, rotated2.z);

            const opacity = Math.max(0, 1 - distance / 450) * 0.4 * pulse;
            ctx.strokeStyle = `rgba(0, 255, 0, ${opacity})`;
            
            ctx.beginPath();
            ctx.moveTo(proj1.x, proj1.y);
            ctx.lineTo(proj2.x, proj2.y);
            ctx.stroke();
          }
        }
      }

      // Draw nodes with glow
      nodes.forEach(node => {
        const rotated = rotatePoint(node.x, node.y, node.z);
        const projected = project(rotated.x, rotated.y, rotated.z);
        
        if (projected.x >= -100 && projected.x <= canvas.width + 100 && 
            projected.y >= -100 && projected.y <= canvas.height + 100) {
          const size = projected.scale * 4 * pulse;
          
          // Glow effect
          ctx.shadowBlur = 15;
          ctx.shadowColor = '#00ff00';
          
          ctx.fillStyle = 'rgba(0, 255, 0, 0.9)';
          ctx.beginPath();
          ctx.arc(projected.x, projected.y, size, 0, Math.PI * 2);
          ctx.fill();

          ctx.shadowBlur = 0;

          // Wireframe cube at each node
          ctx.strokeStyle = 'rgba(0, 255, 0, 0.4)';
          ctx.lineWidth = 1.5;
          const cubeSize = size * 4;
          ctx.strokeRect(
            projected.x - cubeSize / 2,
            projected.y - cubeSize / 2,
            cubeSize,
            cubeSize
          );
        }
      });

      // Draw animated grid overlay
      ctx.strokeStyle = 'rgba(0, 255, 0, 0.03)';
      ctx.lineWidth = 1;
      
      const gridSpacing = 60;
      const offset = (timeRef.current * 10) % gridSpacing;
      
      for (let x = -offset; x < canvas.width + gridSpacing; x += gridSpacing) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = -offset; y < canvas.height + gridSpacing; y += gridSpacing) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      frameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 -z-10 opacity-70"
      style={{ background: '#000' }}
    />
  );
};