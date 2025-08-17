'use client';

import React, { Suspense, useRef, useState, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Sphere, Text } from '@react-three/drei';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import * as THREE from 'three';

interface ValidatorData {
  id: string;
  country: string;
  city: string;
  lat: number;
  lng: number;
  latency: number;
  status: 'online' | 'offline' | 'moderate' | 'good';
  lastChecked: Date;
  ip: string;
}

interface ValidatorPointProps {
  position: [number, number, number];
  validator: ValidatorData;
  onClick: (validator: ValidatorData) => void;
}

function ValidatorPoint({ position, validator, onClick }: ValidatorPointProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const color = useMemo(() => {
    switch (validator.status) {
      case 'good': return '#10b981'; // green
      case 'moderate': return '#f59e0b'; // yellow
      case 'offline': return '#ef4444'; // red
      default: return '#6b7280'; // gray
    }
  }, [validator.status]);

  return (
    <mesh
      ref={meshRef}
      position={position}
      onClick={() => onClick(validator)}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
      scale={hovered ? 1.5 : 1}
    >
      <sphereGeometry args={[0.02, 8, 8]} />
      <meshBasicMaterial color={color} />
      {hovered && (
        <Text
          position={[0, 0.1, 0]}
          fontSize={0.05}
          color="white"
          anchorX="center"
          anchorY="middle"
        >
          {validator.city}
        </Text>
      )}
    </mesh>
  );
}

function Globe() {
  return (
    <Sphere args={[2, 64, 64]}>
      <meshBasicMaterial
        map={null}
        color="#1e40af"
        transparent
        opacity={0.6}
        wireframe
      />
    </Sphere>
  );
}

interface GlobalValidatorMapProps {
  validators: ValidatorData[];
}

export function GlobalValidatorMap({ validators }: GlobalValidatorMapProps) {
  const [selectedValidator, setSelectedValidator] = useState<ValidatorData | null>(null);

  // Convert lat/lng to 3D coordinates
  const validatorPositions = useMemo(() => {
    return validators.map(validator => {
      const phi = (90 - validator.lat) * (Math.PI / 180);
      const theta = (validator.lng + 180) * (Math.PI / 180);
      const radius = 2.01; // Slightly above globe surface
      
      const x = -(radius * Math.sin(phi) * Math.cos(theta));
      const z = radius * Math.sin(phi) * Math.sin(theta);
      const y = radius * Math.cos(phi);
      
      return { position: [x, y, z] as [number, number, number], validator };
    });
  }, [validators]);

  const stats = useMemo(() => {
    const online = validators.filter(v => v.status !== 'offline').length;
    const avgLatency = validators.reduce((sum, v) => sum + v.latency, 0) / validators.length;
    const regions = new Set(validators.map(v => v.country)).size;
    
    return { online, total: validators.length, avgLatency: Math.round(avgLatency), regions };
  }, [validators]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Global Validator Network</span>
          <div className="flex gap-2">
            <Badge variant="outline">{stats.online}/{stats.total} Online</Badge>
            <Badge variant="outline">{stats.regions} Countries</Badge>
            <Badge variant="outline">{stats.avgLatency}ms Avg</Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 3D Globe */}
          <div className="lg:col-span-2 h-96 bg-slate-950 rounded-lg overflow-hidden">
            <Canvas camera={{ position: [0, 0, 5], fov: 50 }}>
              <Suspense fallback={null}>
                <ambientLight intensity={0.6} />
                <pointLight position={[10, 10, 10]} />
                
                <Globe />
                
                {validatorPositions.map(({ position, validator }) => (
                  <ValidatorPoint
                    key={validator.id}
                    position={position}
                    validator={validator}
                    onClick={setSelectedValidator}
                  />
                ))}
                
                <OrbitControls 
                  enablePan={false}
                  enableZoom={true}
                  minDistance={3}
                  maxDistance={8}
                  autoRotate
                  autoRotateSpeed={0.5}
                />
              </Suspense>
            </Canvas>
          </div>

          {/* Validator Details */}
          <div className="space-y-4">
            <div className="space-y-2">
              <h3 className="font-semibold text-sm text-muted-foreground">STATUS LEGEND</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="text-sm">Good (&lt;100ms)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <span className="text-sm">Moderate (100-300ms)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <span className="text-sm">Poor (&gt;300ms)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-gray-500"></div>
                  <span className="text-sm">Offline</span>
                </div>
              </div>
            </div>

            {selectedValidator && (
              <div className="border rounded-lg p-4 space-y-2">
                <h3 className="font-semibold">Selected Validator</h3>
                <div className="space-y-1 text-sm">
                  <p><strong>Location:</strong> {selectedValidator.city}, {selectedValidator.country}</p>
                  <p><strong>Latency:</strong> {selectedValidator.latency}ms</p>
                  <p><strong>Status:</strong> 
                    <Badge 
                      variant={selectedValidator.status === 'good' ? 'default' : 
                               selectedValidator.status === 'moderate' ? 'secondary' : 'destructive'}
                      className="ml-2"
                    >
                      {selectedValidator.status}
                    </Badge>
                  </p>
                  <p><strong>Last Check:</strong> {selectedValidator.lastChecked.toLocaleTimeString()}</p>
                  <p className="text-xs text-muted-foreground">IP: {selectedValidator.ip}</p>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <h3 className="font-semibold text-sm text-muted-foreground">QUICK STATS</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-muted-foreground">Active</p>
                  <p className="font-semibold">{stats.online}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total</p>
                  <p className="font-semibold">{stats.total}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Avg Latency</p>
                  <p className="font-semibold">{stats.avgLatency}ms</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Countries</p>
                  <p className="font-semibold">{stats.regions}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}