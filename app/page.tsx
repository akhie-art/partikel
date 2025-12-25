'use client';

import { useRef } from 'react';
import dynamic from 'next/dynamic';
import HandTracker from '@/components/HandTracker';

const Scene = dynamic(() => import('@/components/Scene'), { 
  ssr: false, 
  loading: () => null 
});

export default function Home() {
  // PERBAIKAN: Menambahkan 'loveMode' ke dalam inisialisasi useRef
  // dan mendefinisikan tipe datanya secara eksplisit agar TypeScript tidak bingung.
  const handPosRef = useRef<{
    x: number;
    y: number;
    grip: number;
    isTriangle: boolean;
    loveMode: 'none' | 'single' | 'double'; // Properti Wajib Baru
    isPinch: boolean;
    fingerCount: number;
    landmarks: any[];
  }>({ 
    x: 0, 
    y: 0, 
    grip: 0, 
    isTriangle: false, 
    loveMode: 'none', // Default value
    isPinch: false, 
    fingerCount: 0, 
    landmarks: [] 
  });

  return (
    <main className="w-full h-screen overflow-hidden relative bg-black">
      <HandTracker handPosRef={handPosRef} />
      <Scene handPosRef={handPosRef} />
      
      <div className="absolute bottom-8 w-full text-center z-50 pointer-events-none opacity-60">
        <span className="text-[12px] text-pink-200 font-sans tracking-[0.3em] uppercase drop-shadow-md">
          Magic Interface Ready
        </span>
      </div>
    </main>
  );
}
