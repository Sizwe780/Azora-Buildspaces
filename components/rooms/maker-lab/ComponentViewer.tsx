"use client";

import React, { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Box, Cylinder, Sphere, MeshDistortMaterial } from '@react-three/drei';

function CircuitBoard() {
  const groupRef = useRef<any>(null);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.2;
    }
  });

  return (
    <group ref={groupRef} castShadow receiveShadow>
      {/* Main PCB */}
      <mesh position={[0, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[4, 0.1, 2.5]} />
        <meshStandardMaterial color="#055920" roughness={0.7} metalness={0.2} />
      </mesh>

      {/* Microcontroller MCU (ESP32 / ATMega) */}
      <mesh position={[0.5, 0.15, 0]} castShadow>
        <boxGeometry args={[1.2, 0.2, 1.2]} />
        <meshStandardMaterial color="#222222" roughness={0.6} metalness={0.8} />
      </mesh>

      {/* Wifi Antenna area */}
      <mesh position={[1.5, 0.06, 0]} castShadow>
        <boxGeometry args={[0.6, 0.02, 0.8]} />
        <meshStandardMaterial color="#b8860b" roughness={0.4} metalness={1} />
      </mesh>

      {/* USB Port */}
      <mesh position={[-1.9, 0.15, 0]} castShadow>
        <boxGeometry args={[0.3, 0.2, 0.5]} />
        <meshStandardMaterial color="#c0c0c0" roughness={0.3} metalness={0.9} />
      </mesh>

      {/* Header Pins */}
      {Array.from({ length: 12 }).map((_, i) => (
        <mesh key={`pin-top-${i}`} position={[-1.5 + i * 0.25, 0.2, 1.1]} castShadow>
          <boxGeometry args={[0.05, 0.3, 0.05]} />
          <meshStandardMaterial color="#ffd700" roughness={0.2} metalness={1} />
        </mesh>
      ))}
      {Array.from({ length: 12 }).map((_, i) => (
        <mesh key={`pin-bot-${i}`} position={[-1.5 + i * 0.25, 0.2, -1.1]} castShadow>
          <boxGeometry args={[0.05, 0.3, 0.05]} />
          <meshStandardMaterial color="#ffd700" roughness={0.2} metalness={1} />
        </mesh>
      ))}

      {/* Voltage Regulator */}
      <mesh position={[-1.2, 0.15, 0.6]} castShadow>
        <boxGeometry args={[0.4, 0.2, 0.3]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.8} metalness={0.1} />
      </mesh>
      
      {/* Reset Button */}
      <mesh position={[-1.2, 0.15, -0.6]} castShadow>
        <cylinderGeometry args={[0.1, 0.1, 0.15, 16]} />
        <meshStandardMaterial color="#880000" roughness={0.5} />
      </mesh>
    </group>
  );
}

export default function ComponentViewer() {
  return (
    <div className="w-full h-full relative bg-slate-950 rounded-lg border border-slate-800 overflow-hidden">
      <div className="absolute top-3 left-3 z-10 text-xs font-mono text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded">
        Interactive 3D Viewer (WebGL)
      </div>
      <Canvas shadows camera={{ position: [5, 4, 5], fov: 45 }}>
        <ambientLight intensity={0.5} />
        <directionalLight
          castShadow
          position={[5, 10, 5]}
          intensity={1.5}
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />
        <pointLight position={[-5, 5, -5]} intensity={0.5} color="#4ade80" />
        <CircuitBoard />
        <OrbitControls 
            enablePan={true} 
            enableZoom={true} 
            enableRotate={true}
            autoRotate={true}
            autoRotateSpeed={0.5}
        />
      </Canvas>
    </div>
  );
}
