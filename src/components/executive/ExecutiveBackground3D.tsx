"use client";

import React, { useEffect, useRef } from "react";
import * as THREE from "three";

export interface ExecutiveBackground3DProps {
  className?: string;
  intensity?: "normal" | "subtle";
  activeCategory?: "ALL" | "DHOTHI" | "SAREE";
}

const CATEGORY_ACCENT_HEX: Record<"ALL" | "DHOTHI" | "SAREE", number> = {
  ALL: 0xd97706, // Antique Kanchipuram zari amber over deep indigo
  DHOTHI: 0x10b981, // Handloom cotton emerald
  SAREE: 0xf43f5e, // Traditional Kanchipuram crimson silk
};

/**
 * Custom Three.js r187 WebGL backdrop:
 * "Sovereign Jacquard Loom & Zari Silk Undulation"
 * 100% GPU shader-driven silk canopy, travelling zari shuttle pulses along
 * cubic splines, architectural meridian vernier rings, and drifting silk motes.
 */
export const ExecutiveBackground3D: React.FC<ExecutiveBackground3DProps> = ({
  className = "",
  intensity = "normal",
  activeCategory = "ALL",
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const categoryRef = useRef<"ALL" | "DHOTHI" | "SAREE">(activeCategory);

  useEffect(() => {
    categoryRef.current = activeCategory;
  }, [activeCategory]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let width = container.clientWidth || window.innerWidth;
    let height = container.clientHeight || window.innerHeight;

    // 1. Scene, Camera, Tone-Mapped WebGL Renderer
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x050811, 0.026);

    const camera = new THREE.PerspectiveCamera(46, width / height, 0.1, 160);
    camera.position.set(0, 2.2, 13.5);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = intensity === "subtle" ? 0.92 : 1.08;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    const accentTarget = new THREE.Color(CATEGORY_ACCENT_HEX[categoryRef.current]);
    const currentAccent = accentTarget.clone();
    const opacityScale = intensity === "subtle" ? 0.65 : 1.0;

    // =========================================================================
    // 2. GPU Shader Layer A: Woven Silk Canopy (Micro-Weave + Zari Fresnel)
    // =========================================================================
    const silkGeometry = new THREE.PlaneGeometry(48, 28, 160, 96);
    const silkMaterial = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      uniforms: {
        uTime: { value: 0 },
        uMouse: { value: new THREE.Vector2(0, 0) },
        uAccentColor: { value: currentAccent.clone() },
        uGoldColor: { value: new THREE.Color(0xeab308) },
        uDeepColor: { value: new THREE.Color(0x071126) },
        uMidColor: { value: new THREE.Color(0x11254a) },
        uOpacityScale: { value: opacityScale },
      },
      vertexShader: /* glsl */ `
        uniform float uTime;
        uniform vec2 uMouse;
        varying vec2 vUv;
        varying vec3 vNormalView;
        varying vec3 vViewPos;
        varying float vCrest;

        float silkHeight(vec2 p, float t) {
          float w1 = sin(p.x * 0.24 + t * 0.55) * cos(p.y * 0.21 + t * 0.35) * 1.15;
          float w2 = sin((p.x * 0.18 - p.y * 0.28) + t * 0.7) * 0.62;
          float w3 = cos(p.x * 0.45 + p.y * 0.14 - t * 0.45) * 0.26;
          float mouseRipple = sin(length(p - uMouse * 5.0) * 0.35 - t * 0.9) * 0.12;
          return w1 + w2 + w3 + mouseRipple;
        }

        void main() {
          vUv = uv;
          vec3 pos = position;
          float h = silkHeight(pos.xy, uTime);
          pos.z += h;

          // Finite-difference normal so silk rim light tracks genuine folds
          float eps = 0.08;
          float hx = silkHeight(pos.xy + vec2(eps, 0.0), uTime) - h;
          float hy = silkHeight(pos.xy + vec2(0.0, eps), uTime) - h;
          vec3 displacedNormal = normalize(vec3(-hx / eps, -hy / eps, 1.0));

          vCrest = smoothstep(-0.9, 1.35, h);
          vNormalView = normalize(normalMatrix * displacedNormal);

          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          vViewPos = -mvPosition.xyz;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uAccentColor;
        uniform vec3 uGoldColor;
        uniform vec3 uDeepColor;
        uniform vec3 uMidColor;
        uniform float uOpacityScale;
        varying vec2 vUv;
        varying vec3 vNormalView;
        varying vec3 vViewPos;
        varying float vCrest;

        void main() {
          vec3 N = normalize(vNormalView);
          vec3 V = normalize(vViewPos);

          // Procedural silk warp & weft weave texture
          float warpThread = sin(vUv.x * 460.0) * 0.5 + 0.5;
          float weftThread = sin(vUv.y * 280.0) * 0.5 + 0.5;
          float weavePattern = mix(warpThread, weftThread, 0.5);
          float weaveSheen = smoothstep(0.25, 0.9, weavePattern) * 0.16;

          // Anisotropic Fresnel silk sheen & warm zari crest highlight
          float fresnel = pow(1.0 - abs(dot(N, V)), 2.3);
          float rimSpec = pow(max(dot(N, normalize(vec3(0.45, 0.72, 0.65))), 0.0), 3.0);

          vec3 col = mix(uDeepColor, uMidColor, vCrest * 0.85 + weaveSheen);
          col = mix(col, uAccentColor * 0.75, fresnel * 0.36);
          col += uGoldColor * (rimSpec * 0.42 + fresnel * vCrest * 0.52 + weaveSheen * vCrest * 0.35);

          // Soft radial/edge vignette dissolving cleanly into obsidian background
          float edgeX = smoothstep(0.0, 0.22, vUv.x) * smoothstep(1.0, 0.78, vUv.x);
          float edgeY = smoothstep(0.0, 0.24, vUv.y) * smoothstep(1.0, 0.76, vUv.y);
          float alpha = edgeX * edgeY * (0.28 + fresnel * 0.34 + vCrest * 0.14) * uOpacityScale;

          gl_FragColor = vec4(col, alpha);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }
      `,
    });

    const silkCanopy = new THREE.Mesh(silkGeometry, silkMaterial);
    silkCanopy.rotation.x = -Math.PI * 0.36;
    silkCanopy.rotation.z = -0.14;
    silkCanopy.position.set(0, -1.9, -4.5);
    scene.add(silkCanopy);

    // =========================================================================
    // 3. GPU Layer B: Merged 18 Zari Warp Shuttle Strands (1 Single Draw Call)
    // =========================================================================
    const strandCount = 18;
    const segmentsPerStrand = 96;
    const vertsPerStrand = (segmentsPerStrand + 1) * 2;
    const trisPerStrand = segmentsPerStrand * 6;

    const strandPositions = new Float32Array(strandCount * vertsPerStrand * 3);
    const strandUvs = new Float32Array(strandCount * vertsPerStrand * 2);
    const strandMeta = new Float32Array(strandCount * vertsPerStrand * 3); // [phase, speed, tint]
    const strandIndices = new Uint32Array(strandCount * trisPerStrand);

    const tempUp = new THREE.Vector3(0, 1, 0);
    const tangent = new THREE.Vector3();
    const binormal = new THREE.Vector3();

    for (let s = 0; s < strandCount; s++) {
      const tNorm = s / (strandCount - 1);
      const ySpread = (tNorm - 0.5) * 7.8;
      const zSpread = -1.5 - Math.sin(tNorm * Math.PI) * 5.2;
      const archLift = 1.6 + Math.cos(tNorm * Math.PI * 1.5) * 1.4;

      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-22, ySpread - 2.2, zSpread - 1.5),
        new THREE.Vector3(-8, ySpread + archLift, zSpread + 1.2),
        new THREE.Vector3(6, ySpread + archLift * 0.45, zSpread - 0.8),
        new THREE.Vector3(22, ySpread + 1.4, zSpread + 1.6),
      ]);

      const phase = ((s * 0.37) % 1.0);
      const speed = 0.08 + ((s * 0.023) % 0.09);
      const tint = s % 3 === 0 ? 1.0 : 0.0; // alternate warm zari & category accent
      const halfWidth = s % 4 === 0 ? 0.022 : 0.013;

      const baseVertOffset = s * vertsPerStrand;
      const baseIndexOffset = s * trisPerStrand;

      for (let i = 0; i <= segmentsPerStrand; i++) {
        const u = i / segmentsPerStrand;
        const pt = curve.getPointAt(u);
        curve.getTangentAt(u, tangent).normalize();
        binormal.crossVectors(tangent, tempUp).normalize();
        if (binormal.lengthSq() < 0.001) binormal.set(0, 0, 1);

        const vOffset = (baseVertOffset + i * 2) * 3;
        const uvOffset = (baseVertOffset + i * 2) * 2;
        const mOffset = (baseVertOffset + i * 2) * 3;

        // Top/left edge vertex
        strandPositions[vOffset] = pt.x + binormal.x * halfWidth;
        strandPositions[vOffset + 1] = pt.y + binormal.y * halfWidth;
        strandPositions[vOffset + 2] = pt.z + binormal.z * halfWidth;
        // Bottom/right edge vertex
        strandPositions[vOffset + 3] = pt.x - binormal.x * halfWidth;
        strandPositions[vOffset + 4] = pt.y - binormal.y * halfWidth;
        strandPositions[vOffset + 5] = pt.z - binormal.z * halfWidth;

        strandUvs[uvOffset] = u;
        strandUvs[uvOffset + 1] = 0;
        strandUvs[uvOffset + 2] = u;
        strandUvs[uvOffset + 3] = 1;

        strandMeta[mOffset] = phase;
        strandMeta[mOffset + 1] = speed;
        strandMeta[mOffset + 2] = tint;
        strandMeta[mOffset + 3] = phase;
        strandMeta[mOffset + 4] = speed;
        strandMeta[mOffset + 5] = tint;

        if (i < segmentsPerStrand) {
          const a = baseVertOffset + i * 2;
          const b = a + 1;
          const c = a + 2;
          const d = a + 3;
          const idxPos = baseIndexOffset + i * 6;
          strandIndices[idxPos] = a;
          strandIndices[idxPos + 1] = b;
          strandIndices[idxPos + 2] = c;
          strandIndices[idxPos + 3] = b;
          strandIndices[idxPos + 4] = d;
          strandIndices[idxPos + 5] = c;
        }
      }
    }

    const strandsGeo = new THREE.BufferGeometry();
    strandsGeo.setAttribute("position", new THREE.BufferAttribute(strandPositions, 3));
    strandsGeo.setAttribute("uv", new THREE.BufferAttribute(strandUvs, 2));
    strandsGeo.setAttribute("aMeta", new THREE.BufferAttribute(strandMeta, 3));
    strandsGeo.setIndex(new THREE.BufferAttribute(strandIndices, 1));

    const strandsMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uGoldColor: { value: new THREE.Color(0xfbbf24) },
        uAccentColor: { value: currentAccent.clone() },
        uOpacityScale: { value: opacityScale },
      },
      vertexShader: /* glsl */ `
        attribute vec3 aMeta;
        uniform float uTime;
        varying vec2 vUv;
        varying vec3 vMeta;

        void main() {
          vUv = uv;
          vMeta = aMeta;
          vec3 pos = position;
          pos.y += sin(pos.x * 0.16 + uTime * 0.45 + aMeta.x * 6.28) * 0.25;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform vec3 uGoldColor;
        uniform vec3 uAccentColor;
        uniform float uOpacityScale;
        varying vec2 vUv;
        varying vec3 vMeta;

        void main() {
          float widthFalloff = pow(1.0 - abs(vUv.y * 2.0 - 1.0), 1.8);
          float edgeFade = smoothstep(0.0, 0.12, vUv.x) * smoothstep(1.0, 0.88, vUv.x);

          // Travelling shuttle pulse packet along warp spline
          float cycle = fract(vUv.x - uTime * vMeta.y + vMeta.x);
          float pulseHead = smoothstep(0.84, 0.99, cycle);
          float pulseTail = smoothstep(0.58, 0.98, cycle) * 0.35;
          float shuttleGlow = pulseHead + pulseTail;

          vec3 baseTone = mix(uGoldColor, uAccentColor, vMeta.z * 0.65);
          vec3 col = baseTone * (0.28 + shuttleGlow * 1.75);
          float alpha = widthFalloff * edgeFade * (0.14 + shuttleGlow * 0.68) * uOpacityScale;

          gl_FragColor = vec4(col, alpha);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }
      `,
    });

    const loomStrandsMesh = new THREE.Mesh(strandsGeo, strandsMat);
    loomStrandsMesh.position.set(0, 1.3, -1.5);
    scene.add(loomStrandsMesh);

    // =========================================================================
    // 4. Architectural Focal Emblem: Precision Jacquard Astrolabe Rings
    // =========================================================================
    const sealGroup = new THREE.Group();
    sealGroup.position.set(5.8, 2.0, -6.5);
    sealGroup.rotation.x = 0.35;
    sealGroup.rotation.y = -0.4;
    scene.add(sealGroup);

    const ringOuterGeo = new THREE.TorusGeometry(4.4, 0.012, 8, 128);
    const ringOuterMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.16 * opacityScale,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const ringOuter = new THREE.Mesh(ringOuterGeo, ringOuterMat);
    sealGroup.add(ringOuter);

    const ringMidGeo = new THREE.TorusGeometry(3.6, 0.01, 8, 112);
    const ringMidMat = new THREE.MeshBasicMaterial({
      color: 0x94a3b8,
      transparent: true,
      opacity: 0.13 * opacityScale,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const ringMid = new THREE.Mesh(ringMidGeo, ringMidMat);
    ringMid.rotation.x = Math.PI * 0.18;
    sealGroup.add(ringMid);

    const ringInnerGeo = new THREE.TorusGeometry(2.75, 0.012, 8, 96);
    const ringInnerMat = new THREE.MeshBasicMaterial({
      color: currentAccent.clone(),
      transparent: true,
      opacity: 0.15 * opacityScale,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const ringInner = new THREE.Mesh(ringInnerGeo, ringInnerMat);
    ringInner.rotation.y = Math.PI * 0.22;
    sealGroup.add(ringInner);

    // Radial Vernier Calibration Ticks (72 precision architectural marks)
    const tickCount = 72;
    const tickPositions = new Float32Array(tickCount * 2 * 3);
    for (let i = 0; i < tickCount; i++) {
      const ang = (i / tickCount) * Math.PI * 2;
      const rIn = i % 6 === 0 ? 3.92 : 4.08;
      const rOut = 4.22;
      const offset = i * 6;
      tickPositions[offset] = Math.cos(ang) * rIn;
      tickPositions[offset + 1] = Math.sin(ang) * rIn;
      tickPositions[offset + 2] = 0;
      tickPositions[offset + 3] = Math.cos(ang) * rOut;
      tickPositions[offset + 4] = Math.sin(ang) * rOut;
      tickPositions[offset + 5] = 0;
    }
    const ticksGeo = new THREE.BufferGeometry();
    ticksGeo.setAttribute("position", new THREE.BufferAttribute(tickPositions, 3));
    const ticksMat = new THREE.LineBasicMaterial({
      color: 0xfbbf24,
      transparent: true,
      opacity: 0.18 * opacityScale,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const vernierTicks = new THREE.LineSegments(ticksGeo, ticksMat);
    sealGroup.add(vernierTicks);

    // =========================================================================
    // 5. GPU Layer C: Floating Zari Dust Motes (Zero JS Array Loops)
    // =========================================================================
    const moteCount = 110;
    const motePos = new Float32Array(moteCount * 3);
    const moteMeta = new Float32Array(moteCount * 3); // [size, speed, phase]
    for (let i = 0; i < moteCount; i++) {
      motePos[i * 3] = (Math.random() - 0.5) * 34;
      motePos[i * 3 + 1] = (Math.random() - 0.5) * 18;
      motePos[i * 3 + 2] = -2 - Math.random() * 14;
      moteMeta[i * 3] = 10.0 + Math.random() * 16.0;
      moteMeta[i * 3 + 1] = 0.18 + Math.random() * 0.35;
      moteMeta[i * 3 + 2] = Math.random() * 6.283;
    }

    const motesGeo = new THREE.BufferGeometry();
    motesGeo.setAttribute("position", new THREE.BufferAttribute(motePos, 3));
    motesGeo.setAttribute("aMote", new THREE.BufferAttribute(moteMeta, 3));

    const motesMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
        uGoldColor: { value: new THREE.Color(0xfde68a) },
        uOpacityScale: { value: opacityScale },
      },
      vertexShader: /* glsl */ `
        attribute vec3 aMote;
        uniform float uTime;
        uniform float uPixelRatio;
        varying float vAlpha;

        void main() {
          vec3 pos = position;
          float span = 18.0;
          float yMoved = mod(pos.y + uTime * aMote.y + span * 0.5, span) - span * 0.5;
          pos.y = yMoved;
          pos.x += sin(uTime * 0.35 + aMote.z) * 0.45;

          vAlpha = smoothstep(-9.0, -4.0, pos.y) * smoothstep(9.0, 4.0, pos.y);
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = aMote.x * uPixelRatio * (10.0 / max(-mvPosition.z, 1.0));
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uGoldColor;
        uniform float uOpacityScale;
        varying float vAlpha;

        void main() {
          float dist = length(gl_PointCoord - 0.5);
          float disc = smoothstep(0.5, 0.08, dist);
          gl_FragColor = vec4(uGoldColor, disc * vAlpha * 0.42 * uOpacityScale);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }
      `,
    });

    const motesPoints = new THREE.Points(motesGeo, motesMat);
    scene.add(motesPoints);

    // =========================================================================
    // 6. Pointer Parallax, ResizeObserver & Three.js r187 Timer Loop
    // =========================================================================
    let targetMouseX = 0;
    let targetMouseY = 0;
    let currentMouseX = 0;
    let currentMouseY = 0;

    const handlePointerMove = (e: PointerEvent) => {
      targetMouseX = (e.clientX / window.innerWidth) * 2 - 1;
      targetMouseY = -(e.clientY / window.innerHeight) * 2 + 1;
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });

    const handleResize = () => {
      if (!container) return;
      width = container.clientWidth || window.innerWidth;
      height = container.clientHeight || window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(dpr);
      renderer.setSize(width, height);
      motesMat.uniforms.uPixelRatio.value = dpr;
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);
    window.addEventListener("resize", handleResize);

    const timer = new THREE.Timer();
    timer.connect(document);

    let elapsed = 0;
    const animate = (timestamp?: number) => {
      timer.update(timestamp);
      const delta = Math.min(timer.getDelta(), 0.05);
      elapsed += prefersReducedMotion ? delta * 0.12 : delta;

      // Smooth category accent color transition
      accentTarget.setHex(CATEGORY_ACCENT_HEX[categoryRef.current]);
      const colorBlend = 1 - Math.exp(-3.2 * delta);
      currentAccent.lerp(accentTarget, colorBlend);
      silkMaterial.uniforms.uAccentColor.value.copy(currentAccent);
      strandsMat.uniforms.uAccentColor.value.copy(currentAccent);
      ringInnerMat.color.copy(currentAccent);

      // Update shader uniforms
      silkMaterial.uniforms.uTime.value = elapsed;
      strandsMat.uniforms.uTime.value = elapsed;
      motesMat.uniforms.uTime.value = elapsed;

      // Damped mouse parallax
      const damp = 1 - Math.exp(-4.5 * delta);
      currentMouseX += (targetMouseX - currentMouseX) * damp;
      currentMouseY += (targetMouseY - currentMouseY) * damp;
      silkMaterial.uniforms.uMouse.value.set(currentMouseX, currentMouseY);

      camera.position.x = currentMouseX * 0.95;
      camera.position.y = 2.2 + currentMouseY * 0.55;
      camera.lookAt(0, 0.4, -2.5);

      // Architectural astrolabe calm gimbal rotation
      vernierTicks.rotation.z = elapsed * 0.025;
      ringMid.rotation.z = -elapsed * 0.032;
      ringInner.rotation.z = elapsed * 0.04;
      sealGroup.rotation.y = -0.4 + Math.sin(elapsed * 0.15) * 0.08;

      renderer.render(scene, camera);
    };

    renderer.setAnimationLoop(animate);

    // 7. Complete GPU Disposal on Unmount
    return () => {
      renderer.setAnimationLoop(null);
      timer.disconnect();
      timer.dispose();
      resizeObserver.disconnect();
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("resize", handleResize);

      if (container && renderer.domElement && renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }

      silkGeometry.dispose();
      silkMaterial.dispose();
      strandsGeo.dispose();
      strandsMat.dispose();
      ringOuterGeo.dispose();
      ringOuterMat.dispose();
      ringMidGeo.dispose();
      ringMidMat.dispose();
      ringInnerGeo.dispose();
      ringInnerMat.dispose();
      ticksGeo.dispose();
      ticksMat.dispose();
      motesGeo.dispose();
      motesMat.dispose();
      renderer.dispose();
    };
  }, [intensity]);

  return (
    <div
      ref={mountRef}
      aria-hidden="true"
      className={`fixed inset-0 pointer-events-none z-0 overflow-hidden ${className}`}
      style={{
        background:
          "radial-gradient(ellipse 110% 75% at 72% 18%, #0f1b38 0%, #070c1a 52%, #04070f 100%)",
      }}
    />
  );
};
