'use client';

import { useRef, useEffect, useState, Suspense } from 'react';
import { useFrame, Canvas } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import Particles from './Particles';

type Props = {
  handPosRef: React.MutableRefObject<{ 
    x: number; 
    y: number; 
    grip: number; 
    isTriangle: boolean; 
    loveMode: 'none'|'single'|'double'; 
    isPinch: boolean; // <--- PERBAIKAN: Menambahkan ini
    fingerCount: number; 
    landmarks: any[];
  }>;
};

function EffectsController({ handPosRef }: Props) {
  const bloomRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const isVoiceEnabled = useRef(false);
  const lastFingerCount = useRef(-1);
  const wasTriangle = useRef(false);
  const wasLoveMode = useRef<'none'|'single'|'double'>('none');
  const wasPinch = useRef(false);

  useEffect(() => {
    setReady(true);
    const enableAudio = () => {
      if (!isVoiceEnabled.current) {
        isVoiceEnabled.current = true;
        if (typeof window !== 'undefined' && window.speechSynthesis) {
           window.speechSynthesis.cancel();
           const u = new SpeechSynthesisUtterance("Sistem Aktif"); 
           u.lang = 'id-ID'; 
           window.speechSynthesis.speak(u);
        }
      }
    };
    if (typeof window !== 'undefined') window.addEventListener('click', enableAudio);
    return () => { if (typeof window !== 'undefined') window.removeEventListener('click', enableAudio); };
  }, []);

  const speak = (text: string) => {
    if (!isVoiceEnabled.current || typeof window === 'undefined') return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text); u.lang = 'id-ID'; u.rate = 1.1;
    window.speechSynthesis.speak(u);
  };

  useFrame(() => {
    if (!handPosRef.current) return;
    const { grip, isTriangle, loveMode, isPinch, fingerCount } = handPosRef.current;
    
    // Bloom Animation
    if (bloomRef.current) {
        let target = 0.5;
        if (loveMode !== 'none') target = 3.5; 
        else if (isTriangle) target = 3.0;
        else if (isPinch) target = 2.0;
        else if (grip > 0.5) target = 1.0;
        bloomRef.current.intensity += (target - bloomRef.current.intensity) * 0.1;
    }

    // Audio Trigger Logic
    if (loveMode === 'single' && wasLoveMode.current !== 'single') speak("Saranghae");
    if (loveMode === 'double' && wasLoveMode.current !== 'double') speak("Cinta Besar");
    wasLoveMode.current = loveMode;

    if (isTriangle && !wasTriangle.current) speak("Piramida");
    wasTriangle.current = isTriangle;

    if (isPinch && !wasPinch.current && !isTriangle && loveMode === 'none') speak("Fokus");
    wasPinch.current = isPinch;

    if (!isTriangle && loveMode === 'none' && !isPinch && grip < 0.5 && fingerCount !== lastFingerCount.current) {
        if (fingerCount > 0) speak(fingerCount.toString());
        lastFingerCount.current = fingerCount;
    }
  });

  if (!ready) return null;

  return (
    <EffectComposer enableNormalPass={false} enabled={true}>
      <Bloom ref={bloomRef} luminanceThreshold={0.2} luminanceSmoothing={0.9} height={300} />
    </EffectComposer>
  );
}

export default function Scene({ handPosRef }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return (
    <div className="absolute inset-0 z-10 pointer-events-none">
      <Canvas 
        camera={{ position: [0, 0, 12], fov: 50 }} 
        gl={{ antialias: true, powerPreference: "high-performance", alpha: true }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.2} />
        <directionalLight position={[5, 5, 5]} intensity={2} color="#ffffff" />
        <directionalLight position={[-5, -5, 2]} intensity={1} color="#00ffff" />
        <pointLight position={[0, 0, 5]} intensity={1} color="#ffd700" distance={10} />

        <Suspense fallback={null}>
            <Particles handPosRef={handPosRef} />
            <EffectsController handPosRef={handPosRef} />
        </Suspense>
      </Canvas>
    </div>
  );
}
