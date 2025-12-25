'use client';

import { useEffect, useRef } from 'react';
import Webcam from 'react-webcam';

type Props = {
  handPosRef: React.MutableRefObject<{ 
    x: number; 
    y: number; 
    grip: number; 
    isTriangle: boolean; 
    loveMode: 'none' | 'single' | 'double'; // STATUS BARU
    fingerCount: number; 
    landmarks: any[]; 
  }>;
};

export default function HandTracker({ handPosRef }: Props) {
  const webcamRef = useRef<Webcam>(null);
  const requestRef = useRef<number>(null);

  useEffect(() => {
    let hands: any = null;
    let isCancelled = false;

    const loadLibraryAndStart = async () => {
      const mpHands = await import('@mediapipe/hands');
      if (isCancelled) return;

      hands = new mpHands.Hands({
        locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
      });

      hands.setOptions({
        maxNumHands: 2, 
        modelComplexity: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      hands.onResults((results: any) => {
        const rawLandmarks = results.multiHandLandmarks;
        
        let totalFingers = 0;
        let isTriangle = false;
        let loveMode: 'none' | 'single' | 'double' = 'none';
        let maxGrip = 0;
        let targetX = 0;
        let targetY = 0;
        let hasHand = false;
        let activeLandmarks: any[] = []; 

        if (rawLandmarks && rawLandmarks.length > 0) {
          // --- DETEKSI PER TANGAN ---
          rawLandmarks.forEach((hand: any) => {
             // Jari logic
             if (hand[8].y < hand[6].y) totalFingers++;
             if (hand[12].y < hand[10].y) totalFingers++;
             if (hand[16].y < hand[14].y) totalFingers++;
             if (hand[20].y < hand[18].y) totalFingers++;
             const isThumbUp = Math.abs(hand[4].x - hand[17].x) > Math.abs(hand[3].x - hand[17].x); 
             if (isThumbUp) totalFingers++;

             // Grip logic
             const distGrip = Math.hypot(hand[12].x - hand[0].x, hand[12].y - hand[0].y);
             let g = 0;
             if (distGrip < 0.15) g = 1; 
             else if (distGrip > 0.35) g = 0; 
             else g = 1 - ((distGrip - 0.15) / (0.35 - 0.15));
             if (g > maxGrip) maxGrip = g;

             // --- DETEKSI SARANGHAE (Finger Heart) ---
             // Jarak Jempol (4) dan Telunjuk (8) sangat dekat
             const distPinch = Math.hypot(hand[8].x - hand[4].x, hand[8].y - hand[4].y);
             // Jika Pinch terdeteksi, anggap itu Saranghae
             if (distPinch < 0.05) {
                loveMode = 'single';
             }
          });

          // --- DETEKSI 2 TANGAN (BIG LOVE & PYRAMID) ---
          if (rawLandmarks.length === 2) {
            const h1 = rawLandmarks[0];
            const h2 = rawLandmarks[1];
            
            const distIndex = Math.hypot(h1[8].x - h2[8].x, h1[8].y - h2[8].y);
            const distThumb = Math.hypot(h1[4].x - h2[4].x, h1[4].y - h2[4].y);
            
            if (distIndex < 0.15 && distThumb < 0.15) {
                loveMode = 'double'; // Prioritas tertinggi
                activeLandmarks = h1;
                hasHand = true;
            }
            else if (distIndex < 0.15 && distThumb > 0.20) {
                isTriangle = true;
                activeLandmarks = h1;
                hasHand = true;
            }
          }

          // Posisi Tangan Utama
          if (!isTriangle && loveMode !== 'double' && rawLandmarks.length > 0) {
             const h = rawLandmarks[0]; 
             targetX = h[9].x; 
             targetY = h[9].y;
             hasHand = true;
             activeLandmarks = h; 
          }
        }
        
        if (hasHand) {
            handPosRef.current.x += (targetX - handPosRef.current.x) * 0.2;
            handPosRef.current.y += (targetY - handPosRef.current.y) * 0.2;
        }
        
        handPosRef.current.grip = maxGrip;
        handPosRef.current.isTriangle = isTriangle;
        handPosRef.current.loveMode = loveMode; // Kirim status Love
        handPosRef.current.fingerCount = totalFingers;
        handPosRef.current.landmarks = activeLandmarks;
      });

      startDetectionLoop();
    };

    const startDetectionLoop = () => {
      const detect = async () => {
        if (webcamRef.current?.video?.readyState === 4 && hands) {
          try { await hands.send({ image: webcamRef.current.video }); } 
          catch (e) { console.error(e); }
        }
        if (!isCancelled) requestRef.current = requestAnimationFrame(detect);
      };
      detect();
    };

    loadLibraryAndStart();
    return () => { isCancelled = true; };
  }, [handPosRef]);

  return (
    <div className="fixed inset-0 z-0 w-full h-full bg-black">
      <Webcam 
        ref={webcamRef} 
        className="w-full h-full object-cover transform -scale-x-100 opacity-60"
        videoConstraints={{ width: 640, height: 480, facingMode: "user" }}
      />
    </div>
  );
}