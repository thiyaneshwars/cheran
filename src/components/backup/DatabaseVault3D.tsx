"use client";

import React, { useEffect, useRef } from "react";
import * as THREE from "three";

interface DatabaseVault3DProps {
  isBackingUp?: boolean;
  isRestoring?: boolean;
  dDriveConnected?: boolean;
}

export const DatabaseVault3D: React.FC<DatabaseVault3DProps> = ({
  isBackingUp = false,
  isRestoring = false,
  dDriveConnected = true,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 400;
    const height = container.clientHeight || 300;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 1.2, 5.2);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    // 2. Lighting Setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 2.0);
    dirLight1.position.set(5, 8, 5);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x10b981, 1.5); // Emerald rim light
    dirLight2.position.set(-5, -3, -2);
    scene.add(dirLight2);

    const vaultGlowLight = new THREE.PointLight(
      isRestoring ? 0xf59e0b : isBackingUp ? 0x10b981 : 0x059669,
      3,
      8
    );
    vaultGlowLight.position.set(0, 0, 0);
    scene.add(vaultGlowLight);

    // 3. Vault Group (Hierarchical Object)
    const vaultGroup = new THREE.Group();
    scene.add(vaultGroup);

    // Primary Cylinder Disks (Stack of 3 Platters representing SQLite DB storage)
    const diskGeometry = new THREE.CylinderGeometry(1.2, 1.2, 0.22, 48);
    const diskMaterial = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.85,
      roughness: 0.25,
    });

    const edgeGlowMaterial = new THREE.MeshStandardMaterial({
      color: isRestoring ? 0xd97706 : 0x10b981,
      emissive: isRestoring ? 0xd97706 : 0x059669,
      emissiveIntensity: 0.8,
      metalness: 0.5,
      roughness: 0.2,
    });

    const diskEdgeGeometry = new THREE.TorusGeometry(1.205, 0.025, 16, 48);

    // 3 Disk Platters
    [-0.55, 0, 0.55].forEach((yPos) => {
      const disk = new THREE.Mesh(diskGeometry, diskMaterial);
      disk.position.y = yPos;
      vaultGroup.add(disk);

      const edgeRing = new THREE.Mesh(diskEdgeGeometry, edgeGlowMaterial);
      edgeRing.rotation.x = Math.PI / 2;
      edgeRing.position.y = yPos;
      vaultGroup.add(edgeRing);
    });

    // Central Core Column (Glowing Quantum Energy Column)
    const coreGeometry = new THREE.CylinderGeometry(0.38, 0.38, 1.6, 32);
    const coreMaterial = new THREE.MeshStandardMaterial({
      color: isRestoring ? 0xf59e0b : 0x34d399,
      emissive: isRestoring ? 0xb45309 : 0x059669,
      emissiveIntensity: 1.2,
      roughness: 0.1,
      metalness: 0.9,
    });
    const coreMesh = new THREE.Mesh(coreGeometry, coreMaterial);
    vaultGroup.add(coreMesh);

    // Orbital Gyro Ring 1 (Horizontal / Tilted)
    const gyroGeometry1 = new THREE.TorusGeometry(1.7, 0.02, 16, 64);
    const gyroMaterial1 = new THREE.MeshBasicMaterial({
      color: isRestoring ? 0xf59e0b : 0x34d399,
      wireframe: false,
      transparent: true,
      opacity: 0.7,
    });
    const gyroRing1 = new THREE.Mesh(gyroGeometry1, gyroMaterial1);
    gyroRing1.rotation.x = Math.PI / 3;
    vaultGroup.add(gyroRing1);

    // Orbital Gyro Ring 2 (Vertical Tilted)
    const gyroGeometry2 = new THREE.TorusGeometry(1.9, 0.02, 16, 64);
    const gyroMaterial2 = new THREE.MeshBasicMaterial({
      color: 0x94a3b8,
      wireframe: false,
      transparent: true,
      opacity: 0.5,
    });
    const gyroRing2 = new THREE.Mesh(gyroGeometry2, gyroMaterial2);
    gyroRing2.rotation.y = Math.PI / 4;
    gyroRing2.rotation.z = Math.PI / 6;
    vaultGroup.add(gyroRing2);

    // Floating Data Particles (60 binary points drifting around the vault)
    const particleCount = 70;
    const particlePositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i += 3) {
      particlePositions[i] = (Math.random() - 0.5) * 5;
      particlePositions[i + 1] = (Math.random() - 0.5) * 4;
      particlePositions[i + 2] = (Math.random() - 0.5) * 4;
    }
    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(particlePositions, 3)
    );
    const particleMaterial = new THREE.PointsMaterial({
      size: 0.06,
      color: isRestoring ? 0xf59e0b : 0x10b981,
      transparent: true,
      opacity: 0.75,
    });
    const particleSystem = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particleSystem);

    // 4. Mouse Interactive Parallax Tracking
    let targetRotationX = 0.2;
    let targetRotationY = 0.4;
    let mouseX = 0;
    let mouseY = 0;

    const onPointerMove = (event: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      mouseX = x;
      mouseY = y;
    };

    container.addEventListener("pointermove", onPointerMove);

    // 5. Animation Loop
    let animationFrameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      const speedMultiplier = isBackingUp ? 3.5 : isRestoring ? 2.5 : 1.0;

      // Vault rotation & levitation
      vaultGroup.rotation.y += 0.008 * speedMultiplier;
      vaultGroup.position.y = Math.sin(elapsedTime * 1.5) * 0.08;

      // Gyro rings counter-rotation
      gyroRing1.rotation.z += 0.012 * speedMultiplier;
      gyroRing2.rotation.x -= 0.009 * speedMultiplier;

      // Smooth parallax response to pointer
      targetRotationY = 0.4 + mouseX * 0.6;
      targetRotationX = 0.2 + mouseY * 0.4;
      vaultGroup.rotation.x += (targetRotationX - vaultGroup.rotation.x) * 0.05;

      // Pulse Core Glow intensity
      const pulse = Math.sin(elapsedTime * 3) * 0.4 + 1.2;
      coreMaterial.emissiveIntensity = pulse * (isBackingUp ? 1.8 : 1.0);
      vaultGlowLight.intensity = (isBackingUp || isRestoring ? 4.5 : 2.5) * pulse;

      // Gentle particle drift
      particleSystem.rotation.y = elapsedTime * 0.04 * speedMultiplier;

      renderer.render(scene, camera);
    };

    animate();

    // 6. Resize Observer
    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries[0]) return;
      const { width: newWidth, height: newHeight } = entries[0].contentRect;
      if (newWidth > 0 && newHeight > 0) {
        camera.aspect = newWidth / newHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(newWidth, newHeight);
      }
    });
    resizeObserver.observe(container);

    // 7. Cleanup
    return () => {
      container.removeEventListener("pointermove", onPointerMove);
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }

      // Dispose Three.js objects
      diskGeometry.dispose();
      diskMaterial.dispose();
      diskEdgeGeometry.dispose();
      edgeGlowMaterial.dispose();
      coreGeometry.dispose();
      coreMaterial.dispose();
      gyroGeometry1.dispose();
      gyroMaterial1.dispose();
      gyroGeometry2.dispose();
      gyroMaterial2.dispose();
      particleGeometry.dispose();
      particleMaterial.dispose();
      renderer.dispose();
    };
  }, [isBackingUp, isRestoring, dDriveConnected]);

  return (
    <div className="relative w-full h-[280px] sm:h-[320px] rounded-3xl overflow-hidden bg-radial from-slate-900 via-slate-950 to-slate-900 border border-slate-800/80 shadow-inner flex items-center justify-center select-none group">
      {/* Three.js Canvas Container */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Floating 3D Telemetry Overlay Badge */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/80 backdrop-blur-md border border-slate-700/80 shadow-lg text-[11px] font-bold text-slate-300 pointer-events-none">
        <span
          className={`w-2 h-2 rounded-full ${
            dDriveConnected ? "bg-emerald-400 animate-pulse" : "bg-rose-400"
          }`}
        />
        <span>D: DRIVE VAULT CORE</span>
        <span className="text-[10px] text-slate-500 font-mono">THREE.JS 3D</span>
      </div>

      {/* Interactive Helper Hint */}
      <div className="absolute bottom-3 right-4 z-10 text-[10px] text-slate-500 font-medium tracking-wide uppercase pointer-events-none opacity-60 group-hover:opacity-100 transition">
        Drag to inspect vault • 60 FPS
      </div>
    </div>
  );
};
