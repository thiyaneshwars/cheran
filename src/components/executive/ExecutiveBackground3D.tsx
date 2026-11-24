"use client";

import React, { useEffect, useRef } from "react";
import * as THREE from "three";

interface ExecutiveBackground3DProps {
  className?: string;
  intensity?: "normal" | "subtle";
}

export const ExecutiveBackground3D: React.FC<ExecutiveBackground3DProps> = ({
  className = "",
  intensity = "normal",
}) => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let width = container.clientWidth || window.innerWidth;
    let height = container.clientHeight || window.innerHeight;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x06090f, 0.038);

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    camera.position.set(0, 3, 14);

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
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const goldLight = new THREE.PointLight(0xf59e0b, 2.8, 40);
    goldLight.position.set(12, 10, 10);
    scene.add(goldLight);

    const emeraldLight = new THREE.PointLight(0x10b981, 2.5, 40);
    emeraldLight.position.set(-12, -8, -6);
    scene.add(emeraldLight);

    const cyanLight = new THREE.PointLight(0x06b6d4, 1.8, 35);
    cyanLight.position.set(0, -10, 8);
    scene.add(cyanLight);

    // 3. Woven Textile Warp Matrix (Particle Wave Field)
    const particleCountX = 55;
    const particleCountZ = 55;
    const totalParticles = particleCountX * particleCountZ;

    const positions = new Float32Array(totalParticles * 3);
    const colors = new Float32Array(totalParticles * 3);

    const colorGold = new THREE.Color(0xf59e0b);
    const colorEmerald = new THREE.Color(0x10b981);
    const colorRoyal = new THREE.Color(0x38bdf8);

    let idx = 0;
    const spacing = 0.65;
    const offsetX = (particleCountX * spacing) / 2;
    const offsetZ = (particleCountZ * spacing) / 2;

    for (let ix = 0; ix < particleCountX; ix++) {
      for (let iz = 0; iz < particleCountZ; iz++) {
        const x = ix * spacing - offsetX;
        const z = iz * spacing - offsetZ;
        const y = 0;

        positions[idx * 3] = x;
        positions[idx * 3 + 1] = y;
        positions[idx * 3 + 2] = z;

        // Gradient blend between gold, emerald, and cyan
        const ratio = (ix + iz) / (particleCountX + particleCountZ);
        const col = new THREE.Color();
        if (ratio < 0.5) {
          col.lerpColors(colorEmerald, colorGold, ratio * 2);
        } else {
          col.lerpColors(colorGold, colorRoyal, (ratio - 0.5) * 2);
        }

        colors[idx * 3] = col.r;
        colors[idx * 3 + 1] = col.g;
        colors[idx * 3 + 2] = col.b;

        idx++;
      }
    }

    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    particleGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    // Create circular dot texture for smooth particle glow
    const canvas = document.createElement("canvas");
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
      gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
      gradient.addColorStop(0.3, "rgba(255, 255, 255, 0.8)");
      gradient.addColorStop(0.7, "rgba(255, 255, 255, 0.2)");
      gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 32, 32);
    }
    const particleTexture = new THREE.CanvasTexture(canvas);

    const particleMaterial = new THREE.PointsMaterial({
      size: intensity === "subtle" ? 0.16 : 0.24,
      vertexColors: true,
      map: particleTexture,
      transparent: true,
      opacity: intensity === "subtle" ? 0.55 : 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const particleSystem = new THREE.Points(particleGeometry, particleMaterial);
    particleSystem.position.y = -2.8;
    scene.add(particleSystem);

    // 4. Central Majestic Woven Torus Knot (Symbol of Textile Weaving & Perfection)
    const knotGeometry = new THREE.TorusKnotGeometry(4.2, 0.9, 140, 24, 2, 3);
    const knotWireframe = new THREE.WireframeGeometry(knotGeometry);
    const knotLineMaterial = new THREE.LineBasicMaterial({
      color: 0xd97706, // Warm metallic gold
      transparent: true,
      opacity: 0.22,
      blending: THREE.AdditiveBlending,
    });
    const knotLines = new THREE.LineSegments(knotWireframe, knotLineMaterial);
    knotLines.position.set(0, 1.2, -3);
    scene.add(knotLines);

    // Glowing halo ring around the knot
    const ringGeo = new THREE.RingGeometry(5.8, 6.0, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.18,
      blending: THREE.AdditiveBlending,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.position.set(0, 1.2, -3.2);
    ringMesh.rotation.x = Math.PI / 3;
    scene.add(ringMesh);

    // 5. Floating Dust / Silk Yarn Strands (Individual drifting golden embers)
    const embersCount = 80;
    const emberPositions = new Float32Array(embersCount * 3);
    const emberSpeeds = new Float32Array(embersCount);

    for (let e = 0; e < embersCount; e++) {
      emberPositions[e * 3] = (Math.random() - 0.5) * 30;
      emberPositions[e * 3 + 1] = (Math.random() - 0.5) * 20;
      emberPositions[e * 3 + 2] = (Math.random() - 0.5) * 25;
      emberSpeeds[e] = 0.008 + Math.random() * 0.015;
    }

    const embersGeo = new THREE.BufferGeometry();
    embersGeo.setAttribute("position", new THREE.BufferAttribute(emberPositions, 3));

    const embersMat = new THREE.PointsMaterial({
      size: 0.28,
      color: 0xfbbf24,
      map: particleTexture,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const embersSystem = new THREE.Points(embersGeo, embersMat);
    scene.add(embersSystem);

    // 6. Interactive Mouse Parallax
    let targetMouseX = 0;
    let targetMouseY = 0;
    let currentMouseX = 0;
    let currentMouseY = 0;

    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
      targetMouseX = (clientX / window.innerWidth) * 2 - 1;
      targetMouseY = -(clientY / window.innerHeight) * 2 + 1;
    };

    window.addEventListener("mousemove", handlePointerMove, { passive: true });
    window.addEventListener("touchmove", handlePointerMove, { passive: true });

    // 7. Resize Observer
    const handleResize = () => {
      if (!container) return;
      width = container.clientWidth || window.innerWidth;
      height = container.clientHeight || window.innerHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    };

    window.addEventListener("resize", handleResize);

    // 8. Animation Loop
    let animationFrameId: number;
    const startTime = performance.now();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const elapsedTime = (performance.now() - startTime) * 0.001;

      // Smooth mouse damping
      currentMouseX += (targetMouseX - currentMouseX) * 0.05;
      currentMouseY += (targetMouseY - currentMouseY) * 0.05;

      // Subtle camera tilt
      camera.position.x = currentMouseX * 1.8;
      camera.position.y = 3 + currentMouseY * 1.2;
      camera.lookAt(0, 0.8, 0);

      // Rotate Knot and Halo
      knotLines.rotation.x = elapsedTime * 0.12;
      knotLines.rotation.y = elapsedTime * 0.18;
      ringMesh.rotation.z = -elapsedTime * 0.15;

      // Animate Textile Warp Wave (Particles)
      const posAttr = particleGeometry.attributes.position as THREE.BufferAttribute;
      const posArray = posAttr.array as Float32Array;

      let pIdx = 0;
      for (let ix = 0; ix < particleCountX; ix++) {
        for (let iz = 0; iz < particleCountZ; iz++) {
          const x = ix * spacing - offsetX;
          const z = iz * spacing - offsetZ;

          // Multi-harmonic sine waves representing textile weaving ripples
          const wave1 = Math.sin(x * 0.35 + elapsedTime * 1.2) * 0.7;
          const wave2 = Math.cos(z * 0.4 + elapsedTime * 1.0) * 0.6;
          const wave3 = Math.sin((x + z) * 0.25 + elapsedTime * 0.8) * 0.4;

          posArray[pIdx * 3 + 1] = wave1 + wave2 + wave3;
          pIdx++;
        }
      }
      posAttr.needsUpdate = true;

      // Animate floating embers
      const emberPosAttr = embersGeo.attributes.position as THREE.BufferAttribute;
      const emberArray = emberPosAttr.array as Float32Array;
      for (let e = 0; e < embersCount; e++) {
        emberArray[e * 3 + 1] += emberSpeeds[e];
        if (emberArray[e * 3 + 1] > 10) {
          emberArray[e * 3 + 1] = -10;
        }
      }
      emberPosAttr.needsUpdate = true;

      renderer.render(scene, camera);
    };

    animate();

    // 9. Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("mousemove", handlePointerMove);
      window.removeEventListener("touchmove", handlePointerMove);
      window.removeEventListener("resize", handleResize);

      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }

      particleGeometry.dispose();
      particleMaterial.dispose();
      particleTexture.dispose();
      knotGeometry.dispose();
      knotWireframe.dispose();
      knotLineMaterial.dispose();
      ringGeo.dispose();
      ringMat.dispose();
      embersGeo.dispose();
      embersMat.dispose();
      renderer.dispose();
    };
  }, [intensity]);

  return (
    <div
      ref={mountRef}
      className={`fixed inset-0 pointer-events-none z-0 overflow-hidden ${className}`}
      style={{
        background:
          "radial-gradient(circle at 50% 25%, #0f172a 0%, #090d16 55%, #050811 100%)",
      }}
    />
  );
};
