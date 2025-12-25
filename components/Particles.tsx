'use client';

import { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

type Props = {
  handPosRef: React.MutableRefObject<{ 
    x: number; y: number; grip: number; isTriangle: boolean; loveMode: 'none' | 'single' | 'double'; fingerCount: number; 
  }>;
};

type ParticleData = {
  x: number; y: number; z: number;
  rotX: number; rotY: number; rotZ: number; 
  rotSpeedX: number; rotSpeedY: number; rotSpeedZ: number;
  
  ox: number; oy: number; oz: number; // Bola
  px: number; py: number; pz: number; // Piramida
  lx: number; ly: number; lz: number; // LOVE
  
  scatterX: number; scatterY: number; scatterZ: number;
  color: THREE.Color;
  baseScale: number;    
  currentScale: number; 
};

function generateTextPoints(text: string, count: number): Float32Array {
  if (typeof document === 'undefined') return new Float32Array(count * 3);
  const canvas = document.createElement('canvas');
  const size = 100; canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new Float32Array(count * 3);
  ctx.fillStyle = 'black'; ctx.fillRect(0, 0, size, size);
  ctx.font = 'bold 80px Arial'; ctx.fillStyle = 'white';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, size / 2, size / 2);
  const data = ctx.getImageData(0, 0, size, size).data;
  const result = new Float32Array(count * 3);
  const points = [];
  for (let y = 0; y < size; y += 2) {
    for (let x = 0; x < size; x += 2) {
      if (data[(y * size + x) * 4] > 128) points.push((x / size - 0.5) * 10, -(y / size - 0.5) * 10);
    }
  }
  for (let i = 0; i < count; i++) {
    const rnd = Math.floor(Math.random() * (points.length / 2)) * 2;
    result[i * 3] = points.length > 0 ? points[rnd] : (Math.random()-0.5)*10;
    result[i * 3 + 1] = points.length > 0 ? points[rnd + 1] : (Math.random()-0.5)*10;
    result[i * 3 + 2] = 0;
  }
  return result;
}

export default function Particles({ handPosRef }: Props) {
  const count = 2000; 
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const particlesRef = useRef<ParticleData[]>([]);
  const { viewport, size } = useThree(); 
  
  const numberTargets = useRef<Float32Array>(new Float32Array(count * 3));
  const lastFingerCount = useRef<number>(-1);

  useEffect(() => {
    const temp: ParticleData[] = [];
    const palette = ['#00ffff', '#ff00ff', '#ffffff', '#ffd700', '#70a1ff']; 
    
    const pTop = new THREE.Vector3(0, 2.5, 0);
    const pBase1 = new THREE.Vector3(0, -1.5, 2.0);
    const pBase2 = new THREE.Vector3(1.8, -1.5, -1.0);
    const pBase3 = new THREE.Vector3(-1.8, -1.5, -1.0);
    const edges = [[pTop, pBase1], [pTop, pBase2], [pTop, pBase3], [pBase1, pBase2], [pBase2, pBase3], [pBase3, pBase1]];

    const radius = 1.5;

    for (let i = 0; i < count; i++) {
      // 1. Bola
      const phi = Math.acos(-1 + (2 * i) / count);
      const theta = Math.sqrt(count * Math.PI) * phi;
      const ox = radius * Math.sin(phi) * Math.cos(theta);
      const oy = radius * Math.sin(phi) * Math.sin(theta);
      const oz = radius * Math.cos(phi);

      // 2. Piramida
      const edgeIndex = i % edges.length;
      const startPoint = edges[edgeIndex][0];
      const endPoint = edges[edgeIndex][1];
      const lerpFactor = Math.random();
      const px = THREE.MathUtils.lerp(startPoint.x, endPoint.x, lerpFactor) + (Math.random()-0.5)*0.2;
      const py = THREE.MathUtils.lerp(startPoint.y, endPoint.y, lerpFactor) + (Math.random()-0.5)*0.2;
      const pz = THREE.MathUtils.lerp(startPoint.z, endPoint.z, lerpFactor) + (Math.random()-0.5)*0.2;

      // 3. LOVE Parametrik
      const t = (i / count) * Math.PI * 2; 
      const scaleLove = 0.12; 
      const thickness = (Math.random() - 0.5) * 1.5; 
      const lx = (16 * Math.pow(Math.sin(t), 3)) * scaleLove;
      const ly = (13 * Math.cos(t) - 5 * Math.cos(2*t) - 2 * Math.cos(3*t) - Math.cos(4*t)) * scaleLove;
      const lz = thickness;

      // Scatter
      const scatterX = (Math.random() - 0.5) * 15;
      const scatterY = (Math.random() - 0.5) * 15;
      const scatterZ = (Math.random() - 0.5) * 10;
      
      const color = new THREE.Color(palette[Math.floor(Math.random() * palette.length)]);
      const baseScale = 0.5 + Math.random() * 1.5; 

      temp.push({ 
          x: scatterX, y: scatterY, z: scatterZ, 
          rotX: Math.random() * Math.PI, rotY: Math.random() * Math.PI, rotZ: Math.random() * Math.PI,
          rotSpeedX: (Math.random() - 0.5) * 0.1, rotSpeedY: (Math.random() - 0.5) * 0.1, rotSpeedZ: (Math.random() - 0.5) * 0.1,
          ox, oy, oz, 
          px, py, pz,
          lx, ly, lz,
          scatterX, scatterY, scatterZ, color, baseScale, currentScale: 0 
      });

      if (meshRef.current) meshRef.current.setColorAt(i, color);
    }
    if (meshRef.current) meshRef.current.instanceColor!.needsUpdate = true;
    particlesRef.current = temp;
  }, []);

  useFrame((state) => {
    if (!meshRef.current || particlesRef.current.length === 0 || !handPosRef.current) return;
    
    const { x: rawX, y: rawY, grip, isTriangle, loveMode, fingerCount } = handPosRef.current;
    
    // Koordinat Kompensasi
    let fixedX = 1 - rawX; let fixedY = rawY;
    const screenAspect = size.width / size.height;
    const webcamAspect = 640 / 480; 
    if (screenAspect > webcamAspect) {
        const scale = screenAspect / webcamAspect;
        fixedY = (fixedY - 0.5) * scale + 0.5;
    } else {
        const scale = webcamAspect / screenAspect;
        fixedX = (fixedX - 0.5) * scale + 0.5;
    }
    const handVector = new THREE.Vector3(
        (fixedX - 0.5) * viewport.width,
        -(fixedY - 0.5) * viewport.height,
        0
    );
    const centerVector = new THREE.Vector3(0, 0, 0);

    // --- LOGIKA TARGET POSISI ---
    let targetCenterPos = handVector;
    
    // Jika Cinta 2 Tangan / Segitiga => Di Tengah
    if (loveMode === 'double' || isTriangle) {
        targetCenterPos = centerVector;
    }
    // Jika Saranghae (Single Love) => Di Tangan (handVector)
    else if (loveMode === 'single') {
        targetCenterPos = handVector;
    }

    if (fingerCount !== lastFingerCount.current && !isTriangle && loveMode === 'none' && grip < 0.5) {
      numberTargets.current = generateTextPoints(fingerCount.toString(), count);
      lastFingerCount.current = fingerCount;
    }

    const isNumberMode = fingerCount > 0 && !isTriangle && loveMode === 'none' && grip < 0.5;
    const isBallMode = grip > 0.7 && !isTriangle && loveMode === 'none';

    const time = state.clock.getElapsedTime();
    const cosT = Math.cos(time * 2.0); 
    const sinT = Math.sin(time * 2.0);

    particlesRef.current.forEach((p, i) => {
      let tx, ty, tz;
      let speed = 0.1;
      p.rotX += p.rotSpeedX; p.rotY += p.rotSpeedY; p.rotZ += p.rotSpeedZ;

      if (loveMode !== 'none') {
        // --- MODE LOVE (SINGLE & DOUBLE) ---
        const pulse = 1 + Math.sin(time * 8.0) * 0.1;
        
        // Jika Saranghae (Single), ukuran hati diperkecil 50%
        const finalScale = (loveMode === 'single') ? 0.5 : 1.0;
        
        tx = targetCenterPos.x + (p.lx * pulse * finalScale);
        ty = targetCenterPos.y + (p.ly * pulse * finalScale);
        tz = targetCenterPos.z + (p.lz * finalScale);
        speed = 0.15;
      }
      else if (isTriangle) {
        const rotX = p.px * cosT - p.pz * sinT;
        const rotZ = p.px * sinT + p.pz * cosT;
        tx = targetCenterPos.x + rotX;
        ty = targetCenterPos.y + p.py;
        tz = targetCenterPos.z + rotZ;
        speed = 0.15;
      } 
      else if (isBallMode) {
        const density = 0.8;
        tx = targetCenterPos.x + (p.ox * density);
        ty = targetCenterPos.y + (p.oy * density);
        tz = (p.oz * density);
        speed = 0.2;
      }
      else if (isNumberMode) {
        tx = targetCenterPos.x + numberTargets.current[i*3];
        ty = targetCenterPos.y + numberTargets.current[i*3+1];
        tz = numberTargets.current[i*3+2];
        speed = 0.1;
      } 
      else {
        const waveX = Math.sin(time * 0.5 + p.scatterY) * 0.5;
        const waveY = Math.cos(time * 0.3 + p.scatterX) * 0.5;
        tx = targetCenterPos.x + p.scatterX + waveX;
        ty = targetCenterPos.y + p.scatterY + waveY;
        tz = p.scatterZ;
        speed = 0.03; 
      }

      p.x += (tx - p.x) * speed;
      p.y += (ty - p.y) * speed;
      p.z += (tz - p.z) * speed;

      dummy.position.set(p.x, p.y, p.z);
      
      if (isTriangle || loveMode !== 'none' || isBallMode) dummy.lookAt(targetCenterPos);
      else dummy.rotation.set(p.rotX, p.rotY, p.rotZ);

      let modeSize = 0.08; 
      if (isBallMode) modeSize = 0.15;
      if (isTriangle) modeSize = 0.10;
      if (loveMode !== 'none') modeSize = 0.12; 

      const targetScale = modeSize * p.baseScale;
      p.currentScale += (targetScale - p.currentScale) * 0.1;
      dummy.scale.setScalar(p.currentScale);
      
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;

    if (meshRef.current.material instanceof THREE.MeshStandardMaterial) {
       const scatterColor = new THREE.Color('#00ffff'); 
       const ballColor = new THREE.Color('#ffffff');    
       const pyramidColor = new THREE.Color('#ffd700'); 
       const loveColor = new THREE.Color('#ff0055'); // Merah Cinta

       let target = scatterColor;
       let targetEmissive = 1.0;

       if (loveMode !== 'none') {
         target = loveColor;
         targetEmissive = 3.0; // GLOW KUAT
       }
       else if (isTriangle) {
         target = pyramidColor;
         targetEmissive = 3.0; 
       }
       else if (isBallMode) {
         target = ballColor;
         targetEmissive = 1.5;
       }

       meshRef.current.material.color.lerp(target, 0.1);
       meshRef.current.material.emissive.lerp(target, 0.1);
       meshRef.current.material.emissiveIntensity += (targetEmissive - meshRef.current.material.emissiveIntensity) * 0.1;
    }
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <octahedronGeometry args={[0.3, 0]} /> 
      <meshStandardMaterial 
        color="#ffffff" 
        emissive="#00ffff"
        emissiveIntensity={1}
        roughness={0.1}
        metalness={0.9}
        transparent={true}
        opacity={0.9}
      />
    </instancedMesh>
  );
}