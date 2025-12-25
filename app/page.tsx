'use client';

import { useRef } from 'react';
import dynamic from 'next/dynamic';
import HandTracker from '@/components/HandTracker';

const Scene = dynamic(() => import('@/components/Scene'), { 
  ssr: false, 
  loading: () => null 
});

export default function Home() {
  const handPosRef = useRef({ 
    x: 0, y: 0, grip: 0, isTriangle: false, isPinch: false, fingerCount: 0, landmarks: [] 
  });

  return (
    <main className="w-full h-screen overflow-hidden relative bg-black">
      <HandTracker handPosRef={handPosRef} />
      <Scene handPosRef={handPosRef} />
      
      <div className="absolute bottom-8 w-full text-center z-50 pointer-events-none opacity-60">
        <span className="text-[12px] text-pink-200 font-sans tracking-[0.3em] uppercase drop-shadow-md">
          Flower Magic Interface
        </span>
      </div>
    </main>
  );
}