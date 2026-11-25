"use client";

import React, { useEffect, useRef } from "react";
import * as THREE from "three";

export interface ExecutiveBackground3DProps {
  className?: string;
  intensity?: "normal" | "subtle";
  activeCategory?: "ALL" | "DHOTHI" | "SAREE";
}

const CATEGORY_ACCENT_HEX: Record<"ALL" | "DHOTHI" | "SAREE", number> = {
  ALL: 0xf59e0b, // Antique Zari Amber Gold
  DHOTHI: 0x10b981, // Handloom Cotton Emerald
  SAREE: 0xf43f5e, // Traditional Kanchipuram Crimson Silk
};

/**
 * Generates an extruded mechanical spur gear geometry with bore cutout.
 */
function createSpurGearGeometry(
  outerRadius: number,
  innerRadius: number,
  teeth: number,
  depth: number,
  boreRadius: number
): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  const step = (Math.PI * 2) / teeth;

  for (let i = 0; i < teeth; i++) {
    const a0 = i * step;
    const a1 = a0 + step * 0.2;
    const a2 = a0 + step * 0.32;
    const a3 = a0 + step * 0.68;
    const a4 = a0 + step * 0.8;

    const p0x = Math.cos(a0) * innerRadius;
    const p0y = Math.sin(a0) * innerRadius;
    if (i === 0) shape.moveTo(p0x, p0y);
    else shape.lineTo(p0x, p0y);

    shape.lineTo(Math.cos(a1) * innerRadius, Math.sin(a1) * innerRadius);
    shape.lineTo(Math.cos(a2) * outerRadius, Math.sin(a2) * outerRadius);
    shape.lineTo(Math.cos(a3) * outerRadius, Math.sin(a3) * outerRadius);
    shape.lineTo(Math.cos(a4) * innerRadius, Math.sin(a4) * innerRadius);
  }
  shape.closePath();

  if (boreRadius > 0) {
    const hole = new THREE.Path();
    hole.absarc(0, 0, boreRadius, 0, Math.PI * 2, true);
    shape.holes.push(hole);
  }

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.015,
    bevelSegments: 2,
    curveSegments: 12,
  });
  geo.center();
  return geo;
}

/**
 * Custom Three.js r187 WebGL background:
 * "Kinematic Powerloom Machine Assembly"
 * Synchronized industrial weaving simulation featuring:
 * - Twin cast-iron gantry arch & shuttle boxes
 * - Turning spoked flywheel, meshing brass tappet gears, and crank linkage
 * - Alternating heald harnesses on upper rollers
 * - GPU-shader split warp shed parted cleanly between picks
 * - Reciprocating sley & steel reed beater
 * - Flying pointed boat shuttle laying glowing weft picks
 * - Rear Paavu warp beam and front woven cloth take-up roller
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

    // 1. Scene, Camera, Tone-Mapped Renderer
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x04070f, 0.032);

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 140);
    camera.position.set(-1.6, 2.6, 11.4);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = intensity === "subtle" ? 0.92 : 1.1;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    const accentTarget = new THREE.Color(CATEGORY_ACCENT_HEX[categoryRef.current]);
    const currentAccent = accentTarget.clone();
    const opacityScale = intensity === "subtle" ? 0.65 : 1.0;

    // Track disposable resources uniformly
    const disposables: { dispose: () => void }[] = [];
    const track = <T extends { dispose: () => void }>(res: T): T => {
      disposables.push(res);
      return res;
    };

    // 2. Calibrated Studio & Loom Worklight Rig
    const hemiLight = new THREE.HemisphereLight(0x93c5fd, 0x090d1a, 0.75);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff1d6, 2.4);
    keyLight.position.set(7, 10, 8);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xf59e0b, 1.8);
    rimLight.position.set(-8, 4, -7);
    scene.add(rimLight);

    // Physical candela point lights over the beating point & drive gears
    const loomWorkLight = new THREE.PointLight(0xfbbf24, 95, 22, 2);
    loomWorkLight.position.set(0.5, 2.8, 1.8);
    scene.add(loomWorkLight);

    const sideAccentLight = new THREE.PointLight(currentAccent.clone(), 60, 20, 2);
    sideAccentLight.position.set(-4.2, 0.8, 3.2);
    scene.add(sideAccentLight);

    // =========================================================================
    // 3. Shared PBR Materials
    // =========================================================================
    const castIronMat = track(
      new THREE.MeshStandardMaterial({
        color: 0x162033,
        metalness: 0.78,
        roughness: 0.44,
      })
    );
    const steelShaftMat = track(
      new THREE.MeshStandardMaterial({
        color: 0x94a3b8,
        metalness: 0.9,
        roughness: 0.22,
      })
    );
    const brassGearMat = track(
      new THREE.MeshStandardMaterial({
        color: 0xd97706,
        emissive: 0x78350f,
        emissiveIntensity: 0.25,
        metalness: 0.9,
        roughness: 0.26,
      })
    );
    const copperAccentMat = track(
      new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        emissive: 0x92400e,
        emissiveIntensity: 0.35,
        metalness: 0.88,
        roughness: 0.2,
      })
    );
    const shuttleWoodMat = track(
      new THREE.MeshStandardMaterial({
        color: 0xb45309,
        emissive: 0xd97706,
        emissiveIntensity: 0.45,
        metalness: 0.45,
        roughness: 0.35,
      })
    );
    const loomWireframeMat = track(
      new THREE.LineBasicMaterial({
        color: 0xf59e0b,
        transparent: true,
        opacity: 0.24 * opacityScale,
        blending: THREE.AdditiveBlending,
      })
    );

    // =========================================================================
    // 4. Master Powerloom Machine Group
    // =========================================================================
    const loomGroup = new THREE.Group();
    loomGroup.position.set(1.2, -0.45, -1.6);
    loomGroup.rotation.set(0.16, -0.48, 0);
    scene.add(loomGroup);

    const LOOM_WIDTH = 5.8; // X span (-2.9 to +2.9)
    const CLOTH_WIDTH = 4.5; // Woven cloth / warp bed width (-2.25 to +2.25)
    const FRAME_X = LOOM_WIDTH / 2;

    // 4A. Twin Cast-Iron Side Frames, Top Castle Arch & Tie-Bars
    const sideLegGeo = track(new THREE.BoxGeometry(0.18, 3.2, 3.4));
    const uprightPostGeo = track(new THREE.BoxGeometry(0.16, 1.5, 0.26));
    const archBeamGeo = track(new THREE.BoxGeometry(LOOM_WIDTH + 0.5, 0.2, 0.28));
    const tieRodGeo = track(new THREE.CylinderGeometry(0.055, 0.055, LOOM_WIDTH + 0.4, 16));
    tieRodGeo.rotateZ(Math.PI / 2);

    [-FRAME_X, FRAME_X].forEach((xPos) => {
      const sideBase = new THREE.Mesh(sideLegGeo, castIronMat);
      sideBase.position.set(xPos, -0.65, 0);
      loomGroup.add(sideBase);

      // Architectural wireframe contour highlight on side chassis
      const baseEdges = track(new THREE.EdgesGeometry(sideLegGeo, 20));
      const baseLines = new THREE.LineSegments(baseEdges, loomWireframeMat);
      baseLines.position.copy(sideBase.position);
      loomGroup.add(baseLines);

      const post = new THREE.Mesh(uprightPostGeo, castIronMat);
      post.position.set(xPos, 1.65, -0.15);
      loomGroup.add(post);
    });

    // Top Harness "Castle" Cross-Arch
    const topArch = new THREE.Mesh(archBeamGeo, castIronMat);
    topArch.position.set(0, 2.35, -0.15);
    loomGroup.add(topArch);

    const archEdges = track(new THREE.EdgesGeometry(archBeamGeo, 20));
    const archLines = new THREE.LineSegments(archEdges, loomWireframeMat);
    archLines.position.copy(topArch.position);
    loomGroup.add(archLines);

    // Lower Tie-Rods & Breast Beam
    [
      [0, -1.75, 1.3],
      [0, -1.75, -1.3],
      [0, 0.45, 1.45], // Front Breast Beam (over which woven cloth bends down)
      [0, 0.52, -1.55], // Rear Back-Rest Bar (guiding warp from Paavu beam)
    ].forEach(([x, y, z]) => {
      const rod = new THREE.Mesh(tieRodGeo, steelShaftMat);
      rod.position.set(x, y, z);
      loomGroup.add(rod);
    });

    // Left & Right Shuttle Boxes
    const shuttleBoxGeo = track(new THREE.BoxGeometry(0.95, 0.26, 0.38));
    [-FRAME_X - 0.52, FRAME_X + 0.52].forEach((xPos) => {
      const sBox = new THREE.Mesh(shuttleBoxGeo, castIronMat);
      sBox.position.set(xPos, 0.48, 0.72);
      loomGroup.add(sBox);
    });

    // =========================================================================
    // 4B. Drive Side Mechanical Gear Train, Spoked Flywheel & Cam Assembly
    // =========================================================================
    const driveX = -FRAME_X - 0.22;

    // Axle-aligned mount groups keep local Z rotation aligned strictly on X axle
    const flywheelMount = new THREE.Group();
    flywheelMount.position.set(driveX - 0.14, -0.15, 0.05);
    flywheelMount.rotation.y = Math.PI / 2;
    loomGroup.add(flywheelMount);

    const flywheelGroup = new THREE.Group();
    flywheelMount.add(flywheelGroup);

    const rimGeo = track(new THREE.TorusGeometry(0.88, 0.075, 14, 48));
    const rimMesh = new THREE.Mesh(rimGeo, brassGearMat);
    flywheelGroup.add(rimMesh);

    const spokeGeo = track(new THREE.CylinderGeometry(0.032, 0.032, 1.66, 8));
    for (let k = 0; k < 3; k++) {
      const spoke = new THREE.Mesh(spokeGeo, castIronMat);
      spoke.rotation.z = (k * Math.PI) / 3;
      flywheelGroup.add(spoke);
    }
    const hubGeo = track(new THREE.CylinderGeometry(0.18, 0.18, 0.22, 20));
    hubGeo.rotateX(Math.PI / 2);
    flywheelGroup.add(new THREE.Mesh(hubGeo, copperAccentMat));

    // Meshing Upper Crankshaft Gear (18 teeth) & Lower Tappet Cam Gear (36 teeth, 1:2 ratio)
    const crankGearMount = new THREE.Group();
    crankGearMount.position.set(driveX + 0.06, -0.15, 0.05);
    crankGearMount.rotation.y = Math.PI / 2;
    loomGroup.add(crankGearMount);
    const crankGearGeo = track(createSpurGearGeometry(0.46, 0.37, 18, 0.12, 0.1));
    const crankGear = new THREE.Mesh(crankGearGeo, brassGearMat);
    crankGearMount.add(crankGear);

    const camGearMount = new THREE.Group();
    camGearMount.position.set(driveX + 0.06, -1.42, 0.05);
    camGearMount.rotation.y = Math.PI / 2;
    loomGroup.add(camGearMount);
    const camGearGeo = track(createSpurGearGeometry(0.88, 0.78, 36, 0.12, 0.14));
    const camGear = new THREE.Mesh(camGearGeo, copperAccentMat);
    camGearMount.add(camGear);

    // Opposite Side Balance Pulley
    const pulleyMount = new THREE.Group();
    pulleyMount.position.set(FRAME_X + 0.2, -0.15, 0.05);
    pulleyMount.rotation.y = Math.PI / 2;
    loomGroup.add(pulleyMount);
    const pulleyGeo = track(new THREE.TorusGeometry(0.62, 0.05, 12, 40));
    const rightPulley = new THREE.Mesh(pulleyGeo, brassGearMat);
    pulleyMount.add(rightPulley);

    // Crank Shaft & Bottom Cam Shaft Bars
    const crankShaftMesh = new THREE.Mesh(tieRodGeo, steelShaftMat);
    crankShaftMesh.position.set(0, -0.15, 0.05);
    loomGroup.add(crankShaftMesh);

    const camShaftMesh = new THREE.Mesh(tieRodGeo, steelShaftMat);
    camShaftMesh.position.set(0, -1.42, 0.05);
    loomGroup.add(camShaftMesh);

    // Twin Shedding Tappet Rollers on Top Arch
    const topRollerGroup1 = new THREE.Group();
    const topRollerGroup2 = new THREE.Group();
    const rollerWheelGeo = track(new THREE.CylinderGeometry(0.16, 0.16, 0.08, 24));
    rollerWheelGeo.rotateZ(Math.PI / 2);

    topRollerGroup1.position.set(-0.9, 2.22, -0.15);
    topRollerGroup2.position.set(0.9, 2.22, -0.15);
    topRollerGroup1.add(new THREE.Mesh(rollerWheelGeo, brassGearMat));
    topRollerGroup2.add(new THREE.Mesh(rollerWheelGeo, brassGearMat));
    loomGroup.add(topRollerGroup1, topRollerGroup2);

    // =========================================================================
    // 4C. Alternating Heald Harness Frames (Harness 1 & Harness 2)
    // =========================================================================
    const buildHealdFrame = (zPos: number, accentMat: THREE.Material) => {
      const frame = new THREE.Group();
      frame.position.set(0, 0.45, zPos);

      const railGeo = track(new THREE.BoxGeometry(CLOTH_WIDTH + 0.3, 0.055, 0.05));
      const sideBarGeo = track(new THREE.BoxGeometry(0.055, 1.35, 0.05));

      const topRail = new THREE.Mesh(railGeo, steelShaftMat);
      topRail.position.y = 0.65;
      const botRail = new THREE.Mesh(railGeo, steelShaftMat);
      botRail.position.y = -0.65;

      const leftBar = new THREE.Mesh(sideBarGeo, accentMat);
      leftBar.position.x = -(CLOTH_WIDTH + 0.25) / 2;
      const rightBar = new THREE.Mesh(sideBarGeo, accentMat);
      rightBar.position.x = (CLOTH_WIDTH + 0.25) / 2;

      // Dense metallic heald wires in 1 single LineSegments call
      const wireCount = 54;
      const wireVerts = new Float32Array(wireCount * 2 * 3);
      for (let i = 0; i < wireCount; i++) {
        const x = ((i / (wireCount - 1)) - 0.5) * CLOTH_WIDTH;
        wireVerts[i * 6] = x;
        wireVerts[i * 6 + 1] = -0.62;
        wireVerts[i * 6 + 2] = 0;
        wireVerts[i * 6 + 3] = x;
        wireVerts[i * 6 + 4] = 0.62;
        wireVerts[i * 6 + 5] = 0;
      }
      const wiresGeo = track(new THREE.BufferGeometry());
      wiresGeo.setAttribute("position", new THREE.BufferAttribute(wireVerts, 3));
      const wiresMat = track(
        new THREE.LineBasicMaterial({
          color: 0xe2e8f0,
          transparent: true,
          opacity: 0.28 * opacityScale,
        })
      );
      const healdWires = new THREE.LineSegments(wiresGeo, wiresMat);

      frame.add(topRail, botRail, leftBar, rightBar, healdWires);
      loomGroup.add(frame);
      return frame;
    };

    const harnessFrame1 = buildHealdFrame(-0.24, brassGearMat);
    const harnessFrame2 = buildHealdFrame(-0.04, copperAccentMat);

    // =========================================================================
    // 4D. Reciprocating Sley Sword Pivot Assembly, Reed Comb & Boat Shuttle
    // =========================================================================
    const sleyPivot = new THREE.Group();
    sleyPivot.position.set(0, -1.65, 0.72); // Bottom rock-shaft pivot
    loomGroup.add(sleyPivot);

    // Left & Right Sley Swords
    const swordGeo = track(new THREE.BoxGeometry(0.08, 2.25, 0.14));
    [-FRAME_X + 0.18, FRAME_X - 0.18].forEach((xPos) => {
      const sword = new THREE.Mesh(swordGeo, castIronMat);
      sword.position.set(xPos, 1.12, 0);
      sleyPivot.add(sword);
    });

    // Shuttle Raceboard + Reed Top Cap
    const raceGeo = track(new THREE.BoxGeometry(CLOTH_WIDTH + 1.8, 0.08, 0.34));
    const raceBoard = new THREE.Mesh(raceGeo, castIronMat);
    raceBoard.position.set(0, 2.02, 0.02);
    sleyPivot.add(raceBoard);

    const reedCapGeo = track(new THREE.BoxGeometry(CLOTH_WIDTH + 0.5, 0.085, 0.09));
    const reedCap = new THREE.Mesh(reedCapGeo, brassGearMat);
    reedCap.position.set(0, 2.52, -0.05);
    sleyPivot.add(reedCap);

    // Steel Reed Comb Teeth (72 gleaming vertical dents in 1 draw call)
    const dentCount = 72;
    const dentVerts = new Float32Array(dentCount * 2 * 3);
    for (let d = 0; d < dentCount; d++) {
      const x = ((d / (dentCount - 1)) - 0.5) * (CLOTH_WIDTH + 0.1);
      dentVerts[d * 6] = x;
      dentVerts[d * 6 + 1] = 2.06;
      dentVerts[d * 6 + 2] = -0.05;
      dentVerts[d * 6 + 3] = x;
      dentVerts[d * 6 + 4] = 2.49;
      dentVerts[d * 6 + 5] = -0.05;
    }
    const reedGeo = track(new THREE.BufferGeometry());
    reedGeo.setAttribute("position", new THREE.BufferAttribute(dentVerts, 3));
    const reedMat = track(
      new THREE.LineBasicMaterial({
        color: 0xfde68a,
        transparent: true,
        opacity: 0.45 * opacityScale,
      })
    );
    const reedDents = new THREE.LineSegments(reedGeo, reedMat);
    sleyPivot.add(reedDents);

    // Mechanical Crank Connecting Rods linking Crankshaft to Sley Swords
    const crankArmGeo = track(new THREE.CylinderGeometry(0.04, 0.04, 0.85, 10));
    crankArmGeo.rotateX(Math.PI / 2);
    const leftConnectingRod = new THREE.Mesh(crankArmGeo, steelShaftMat);
    const rightConnectingRod = new THREE.Mesh(crankArmGeo, steelShaftMat);
    loomGroup.add(leftConnectingRod, rightConnectingRod);

    // Pointed Powerloom Boat Shuttle (Lathe Spindle + Steel Tips + Pirn Coil)
    const shuttleGroup = new THREE.Group();
    const shuttleProfile = [
      new THREE.Vector2(0.0, -0.52),
      new THREE.Vector2(0.025, -0.42),
      new THREE.Vector2(0.095, -0.2),
      new THREE.Vector2(0.11, 0.0),
      new THREE.Vector2(0.095, 0.2),
      new THREE.Vector2(0.025, 0.42),
      new THREE.Vector2(0.0, 0.52),
    ];
    const shuttleBodyGeo = track(new THREE.LatheGeometry(shuttleProfile, 14));
    shuttleBodyGeo.rotateZ(Math.PI / 2);
    const shuttleBody = new THREE.Mesh(shuttleBodyGeo, shuttleWoodMat);
    shuttleGroup.add(shuttleBody);

    // Inner bright golden weft Pirn bobbin inside the shuttle
    const pirnGeo = track(new THREE.CylinderGeometry(0.052, 0.052, 0.34, 14));
    pirnGeo.rotateZ(Math.PI / 2);
    const pirnMesh = new THREE.Mesh(pirnGeo, copperAccentMat);
    pirnMesh.position.y = 0.03;
    shuttleGroup.add(pirnMesh);

    shuttleGroup.position.set(0, 2.13, 0.05);
    sleyPivot.add(shuttleGroup);

    // =========================================================================
    // 4E. Rear Paavu Warp Beam & Front Woven Cloth Take-Up Roller
    // =========================================================================
    // Rear Warp Beam (wound yarn beam)
    const paavuBeamGroup = new THREE.Group();
    paavuBeamGroup.position.set(0, -0.48, -1.62);
    loomGroup.add(paavuBeamGroup);

    const beamBarrelGeo = track(new THREE.CylinderGeometry(0.42, 0.42, CLOTH_WIDTH + 0.1, 32));
    beamBarrelGeo.rotateZ(Math.PI / 2);
    const yarnBeamMat = track(
      new THREE.MeshStandardMaterial({
        color: 0xd97706,
        emissive: 0x451a03,
        emissiveIntensity: 0.3,
        metalness: 0.25,
        roughness: 0.72,
      })
    );
    const paavuBarrel = new THREE.Mesh(beamBarrelGeo, yarnBeamMat);
    paavuBeamGroup.add(paavuBarrel);

    // Metallic Beam Flanges
    const flangeGeo = track(new THREE.CylinderGeometry(0.56, 0.56, 0.06, 32));
    flangeGeo.rotateZ(Math.PI / 2);
    [-CLOTH_WIDTH / 2 - 0.08, CLOTH_WIDTH / 2 + 0.08].forEach((xPos) => {
      const flange = new THREE.Mesh(flangeGeo, castIronMat);
      flange.position.x = xPos;
      paavuBeamGroup.add(flange);
    });

    // Front Take-Up Cloth Roller (winding finished cloth below breast beam)
    const clothRollerGroup = new THREE.Group();
    clothRollerGroup.position.set(0, -0.62, 1.28);
    loomGroup.add(clothRollerGroup);

    const clothBarrelGeo = track(new THREE.CylinderGeometry(0.32, 0.32, CLOTH_WIDTH + 0.1, 28));
    clothBarrelGeo.rotateZ(Math.PI / 2);
    const clothRollerMat = track(
      new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        emissive: currentAccent.clone(),
        emissiveIntensity: 0.15,
        metalness: 0.2,
        roughness: 0.75,
      })
    );
    clothRollerGroup.add(new THREE.Mesh(clothBarrelGeo, clothRollerMat));

    // =========================================================================
    // 4F. GPU-Driven Split Warp Threads (Odd/Even Shed Parting Shader)
    // =========================================================================
    // Each of 68 threads is subdivided into 28 segments from Rear Beam -> Heald -> Fell
    const warpThreadCount = 68;
    const warpSegs = 28;
    const warpVertPositions = new Float32Array(warpThreadCount * warpSegs * 2 * 3);
    const warpAttributes = new Float32Array(warpThreadCount * warpSegs * 2 * 3); // [progress u, parity (+1/-1), lateralNorm]

    for (let t = 0; t < warpThreadCount; t++) {
      const latNorm = (t / (warpThreadCount - 1)) * 2 - 1; // -1 to +1
      const x = latNorm * (CLOTH_WIDTH / 2);
      const parity = t % 2 === 0 ? 1.0 : -1.0;

      for (let s = 0; s < warpSegs; s++) {
        const u0 = s / warpSegs;
        const u1 = (s + 1) / warpSegs;
        const z0 = THREE.MathUtils.lerp(-1.55, 0.96, u0);
        const z1 = THREE.MathUtils.lerp(-1.55, 0.96, u1);
        const yBase = 0.47;

        const base = (t * warpSegs + s) * 6;
        warpVertPositions[base] = x;
        warpVertPositions[base + 1] = yBase;
        warpVertPositions[base + 2] = z0;
        warpVertPositions[base + 3] = x;
        warpVertPositions[base + 4] = yBase;
        warpVertPositions[base + 5] = z1;

        warpAttributes[base] = u0;
        warpAttributes[base + 1] = parity;
        warpAttributes[base + 2] = latNorm;
        warpAttributes[base + 3] = u1;
        warpAttributes[base + 4] = parity;
        warpAttributes[base + 5] = latNorm;
      }
    }

    const warpGeo = track(new THREE.BufferGeometry());
    warpGeo.setAttribute("position", new THREE.BufferAttribute(warpVertPositions, 3));
    warpGeo.setAttribute("aWarp", new THREE.BufferAttribute(warpAttributes, 3));

    const warpMat = track(
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uShedOffset: { value: 0 },
          uGoldColor: { value: new THREE.Color(0xfbbf24) },
          uAccentColor: { value: currentAccent.clone() },
          uOpacityScale: { value: opacityScale },
        },
        vertexShader: /* glsl */ `
          attribute vec3 aWarp;
          uniform float uShedOffset;
          varying float vBorderFactor;
          varying float vProgress;
          varying float vParity;

          void main() {
            float u = aWarp.x;
            float parity = aWarp.y;
            vBorderFactor = smoothstep(0.76, 0.98, abs(aWarp.z));
            vProgress = u;
            vParity = parity;

            vec3 pos = position;
            // Anchor ends cleanly at Rear Bar (u=0) and Fell of Cloth (u=1); peak lift at Heald frame (u~0.58)
            float envelope = u < 0.58
              ? smoothstep(0.0, 0.58, u)
              : smoothstep(1.0, 0.58, u);
            pos.y += parity * uShedOffset * envelope;

            gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          uniform vec3 uGoldColor;
          uniform vec3 uAccentColor;
          uniform float uOpacityScale;
          varying float vBorderFactor;
          varying float vProgress;
          varying float vParity;

          void main() {
            // Subtle warm cotton ivory center + vivid Zari & accent selvedge borders
            vec3 bodyColor = mix(vec3(0.88, 0.91, 0.98), uGoldColor, 0.35 + vParity * 0.12);
            vec3 borderColor = mix(uGoldColor, uAccentColor, 0.5);
            vec3 col = mix(bodyColor, borderColor, vBorderFactor);

            float alpha = mix(0.32, 0.72, vBorderFactor) * uOpacityScale;
            gl_FragColor = vec4(col, alpha);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
          }
        `,
      })
    );

    const warpShedMesh = new THREE.LineSegments(warpGeo, warpMat);
    loomGroup.add(warpShedMesh);

    // =========================================================================
    // 4G. Front Woven Cloth Sheet Scrolling Over Breast Beam Down to Cloth Roller
    // =========================================================================
    // Curved path from Cloth Fell (z=0.96, y=0.47) -> Breast Beam (z=1.45, y=0.47) -> Take-up Roller (z=1.32, y=-0.55)
    const clothCols = 48;
    const clothRows = 28;
    const clothVertCount = (clothCols + 1) * (clothRows + 1);
    const clothPos = new Float32Array(clothVertCount * 3);
    const clothUv = new Float32Array(clothVertCount * 2);
    const clothIdx = new Uint16Array(clothCols * clothRows * 6);

    const clothPath = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.47, 0.96),
      new THREE.Vector3(0, 0.49, 1.38),
      new THREE.Vector3(0, 0.4, 1.49),
      new THREE.Vector3(0, -0.58, 1.35),
    ]);

    for (let r = 0; r <= clothRows; r++) {
      const v = r / clothRows;
      const pt = clothPath.getPointAt(v);
      for (let c = 0; c <= clothCols; c++) {
        const u = c / clothCols;
        const x = (u - 0.5) * CLOTH_WIDTH;
        const vi = r * (clothCols + 1) + c;
        clothPos[vi * 3] = x;
        clothPos[vi * 3 + 1] = pt.y;
        clothPos[vi * 3 + 2] = pt.z;
        clothUv[vi * 2] = u;
        clothUv[vi * 2 + 1] = v;
      }
    }

    let cIdx = 0;
    for (let r = 0; r < clothRows; r++) {
      for (let c = 0; c < clothCols; c++) {
        const a = r * (clothCols + 1) + c;
        const b = a + 1;
        const d = (r + 1) * (clothCols + 1) + c;
        const e = d + 1;
        clothIdx[cIdx++] = a;
        clothIdx[cIdx++] = d;
        clothIdx[cIdx++] = b;
        clothIdx[cIdx++] = b;
        clothIdx[cIdx++] = d;
        clothIdx[cIdx++] = e;
      }
    }

    const wovenClothGeo = track(new THREE.BufferGeometry());
    wovenClothGeo.setAttribute("position", new THREE.BufferAttribute(clothPos, 3));
    wovenClothGeo.setAttribute("uv", new THREE.BufferAttribute(clothUv, 2));
    wovenClothGeo.setIndex(new THREE.BufferAttribute(clothIdx, 1));
    wovenClothGeo.computeVertexNormals();

    const wovenClothMat = track(
      new THREE.ShaderMaterial({
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
        uniforms: {
          uScroll: { value: 0 },
          uGoldColor: { value: new THREE.Color(0xf59e0b) },
          uAccentColor: { value: currentAccent.clone() },
          uOpacityScale: { value: opacityScale },
        },
        vertexShader: /* glsl */ `
          varying vec2 vUv;
          varying vec3 vNormalView;
          varying vec3 vViewPos;

          void main() {
            vUv = uv;
            vNormalView = normalize(normalMatrix * normal);
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            vViewPos = -mv.xyz;
            gl_Position = projectionMatrix * mv;
          }
        `,
        fragmentShader: /* glsl */ `
          uniform float uScroll;
          uniform vec3 uGoldColor;
          uniform vec3 uAccentColor;
          uniform float uOpacityScale;
          varying vec2 vUv;
          varying vec3 vNormalView;
          varying vec3 vViewPos;

          void main() {
            // Micro-woven warp + advancing weft picks scrolling along woven cloth
            float warpLine = sin(vUv.x * 240.0) * 0.5 + 0.5;
            float weftLine = sin((vUv.y - uScroll) * 180.0) * 0.5 + 0.5;
            float fabricGrid = mix(warpLine, weftLine, 0.5);

            // Traditional South Indian Zari selvedge borders along left & right cloth edges
            float edgeDist = abs(vUv.x - 0.5) * 2.0;
            float isBorder = smoothstep(0.76, 0.85, edgeDist);
            float zariStripe = step(0.87, edgeDist) * (0.55 + 0.45 * sin((vUv.y - uScroll) * 40.0));

            vec3 clothBody = vec3(0.11, 0.16, 0.28) + fabricGrid * 0.08;
            vec3 borderBody = mix(uAccentColor * 0.72, uGoldColor, zariStripe * 0.85);
            vec3 col = mix(clothBody, borderBody, isBorder);

            // Bright freshly beaten cloth edge highlight at fell (vUv.y near 0)
            float fellGlow = smoothstep(0.12, 0.0, vUv.y);
            col += uGoldColor * fellGlow * 0.35;

            // Specular fabric sheen
            vec3 N = normalize(vNormalView);
            vec3 V = normalize(vViewPos);
            float fresnel = pow(1.0 - max(dot(N, V), 0.0), 2.2);
            col += uGoldColor * fresnel * 0.25;

            float bottomFade = smoothstep(1.0, 0.78, vUv.y);
            float alpha = (0.72 + isBorder * 0.16) * bottomFade * uOpacityScale;

            gl_FragColor = vec4(col, alpha);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
          }
        `,
      })
    );

    const wovenClothMesh = new THREE.Mesh(wovenClothGeo, wovenClothMat);
    loomGroup.add(wovenClothMesh);

    // Trailing Glowing Weft Thread linking Fell of Cloth to the Shuttle in Flight
    const weftTrailVerts = new Float32Array(6);
    const weftTrailGeo = track(new THREE.BufferGeometry());
    weftTrailGeo.setAttribute("position", new THREE.BufferAttribute(weftTrailVerts, 3));
    const weftTrailMat = track(
      new THREE.LineBasicMaterial({
        color: 0xfde68a,
        transparent: true,
        opacity: 0.75 * opacityScale,
        blending: THREE.AdditiveBlending,
      })
    );
    const weftTrailLine = new THREE.Line(weftTrailGeo, weftTrailMat);
    loomGroup.add(weftTrailLine);

    // =========================================================================
    // 5. Distant Ghosted Loom Fleet Silhouette (Weaving Shed Depth)
    // =========================================================================
    const ghostLoomGroup = new THREE.Group();
    ghostLoomGroup.position.set(-6.5, -0.55, -8.2);
    ghostLoomGroup.rotation.set(0.14, -0.42, 0);
    ghostLoomGroup.scale.setScalar(0.82);
    scene.add(ghostLoomGroup);

    const ghostArch = new THREE.LineSegments(archEdges, loomWireframeMat);
    ghostArch.position.copy(topArch.position);
    ghostLoomGroup.add(ghostArch);

    const ghostSideGeo = track(new THREE.EdgesGeometry(sideLegGeo, 20));
    [-FRAME_X, FRAME_X].forEach((xPos) => {
      const gl = new THREE.LineSegments(ghostSideGeo, loomWireframeMat);
      gl.position.set(xPos, -0.65, 0);
      ghostLoomGroup.add(gl);
    });
    const ghostBeamEdges = track(new THREE.EdgesGeometry(beamBarrelGeo, 28));
    const ghostBeam = new THREE.LineSegments(ghostBeamEdges, loomWireframeMat);
    ghostBeam.position.set(0, -0.48, -1.62);
    ghostLoomGroup.add(ghostBeam);

    // =========================================================================
    // 6. Subtle Cotton/Silk Lint & Zari Dust Motes (GPU Shader, 1 Draw Call)
    // =========================================================================
    const moteCount = 95;
    const motePos = new Float32Array(moteCount * 3);
    const moteMeta = new Float32Array(moteCount * 3);
    for (let i = 0; i < moteCount; i++) {
      motePos[i * 3] = (Math.random() - 0.5) * 28;
      motePos[i * 3 + 1] = (Math.random() - 0.5) * 16;
      motePos[i * 3 + 2] = -1 - Math.random() * 14;
      moteMeta[i * 3] = 9.0 + Math.random() * 13.0;
      moteMeta[i * 3 + 1] = 0.14 + Math.random() * 0.28;
      moteMeta[i * 3 + 2] = Math.random() * 6.283;
    }

    const motesGeo = track(new THREE.BufferGeometry());
    motesGeo.setAttribute("position", new THREE.BufferAttribute(motePos, 3));
    motesGeo.setAttribute("aMote", new THREE.BufferAttribute(moteMeta, 3));

    const motesMat = track(
      new THREE.ShaderMaterial({
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
            float span = 16.0;
            pos.y = mod(pos.y + uTime * aMote.y + span * 0.5, span) - span * 0.5;
            pos.x += sin(uTime * 0.35 + aMote.z) * 0.4;

            vAlpha = smoothstep(-8.0, -3.5, pos.y) * smoothstep(8.0, 3.5, pos.y);
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
            gl_FragColor = vec4(uGoldColor, disc * vAlpha * 0.36 * uOpacityScale);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
          }
        `,
      })
    );

    scene.add(new THREE.Points(motesGeo, motesMat));

    // Subtle Atelier Horizon Floor Grid (engineered machine bay plane)
    const floorGrid = new THREE.GridHelper(34, 34, 0x334155, 0x0f172a);
    floorGrid.position.set(0, -2.26, -3);
    (floorGrid.material as THREE.Material).transparent = true;
    (floorGrid.material as THREE.Material).opacity = 0.28 * opacityScale;
    scene.add(floorGrid);

    // =========================================================================
    // 7. Pointer Parallax, ResizeObserver & Synchronized Loom Loop
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

    // Master Crankshaft Speed (smooth executive cadence: ~1.5 picks/sec)
    const CRANK_SPEED = 2.6;
    let crankTheta = 0;
    let timeElapsed = 0;

    const animate = (timestamp?: number) => {
      timer.update(timestamp);
      const delta = Math.min(timer.getDelta(), 0.05);
      const speedScale = prefersReducedMotion ? 0.18 : 1.0;

      timeElapsed += delta * speedScale;
      crankTheta += delta * CRANK_SPEED * speedScale;

      // 1. Category Accent Transition
      accentTarget.setHex(CATEGORY_ACCENT_HEX[categoryRef.current]);
      const colorBlend = 1 - Math.exp(-3.5 * delta);
      currentAccent.lerp(accentTarget, colorBlend);

      warpMat.uniforms.uAccentColor.value.copy(currentAccent);
      wovenClothMat.uniforms.uAccentColor.value.copy(currentAccent);
      sideAccentLight.color.copy(currentAccent);
      clothRollerMat.emissive.copy(currentAccent);
      motesMat.uniforms.uTime.value = timeElapsed;

      // 2. Drive Gears, Flywheel & Yarn Beams Rotation
      flywheelGroup.rotation.z = crankTheta;
      crankGear.rotation.z = crankTheta;
      camGear.rotation.z = -crankTheta * 0.5; // Meshed 18T -> 36T half-speed tappet ratio
      rightPulley.rotation.z = crankTheta;

      paavuBeamGroup.rotation.x = -crankTheta * 0.045;
      clothRollerGroup.rotation.x = crankTheta * 0.055;
      wovenClothMat.uniforms.uScroll.value = crankTheta * 0.018;

      // 3. Alternating Heald Shed Motion (flat-dwell harmonic so shuttle crosses open shed!)
      const halfPhase = crankTheta * 0.5;
      const shedLift = Math.tanh(2.1 * Math.sin(halfPhase)) * 0.42;

      harnessFrame1.position.y = 0.45 + shedLift;
      harnessFrame2.position.y = 0.45 - shedLift;
      topRollerGroup1.rotation.x = shedLift * 2.4;
      topRollerGroup2.rotation.x = -shedLift * 2.4;
      warpMat.uniforms.uShedOffset.value = shedLift;

      // 4. Reciprocating Sley Beat Motion:
      // At crankTheta = 0 (beatCos = +1): sley tilts FORWARD (+Z) so reed beats at fell (z ~ 0.96)
      // At crankTheta = PI (beatCos = -1): sley swings BACK (-Z) clearing space for shuttle flight
      const beatCos = Math.cos(crankTheta);
      const sleyTilt = beatCos * 0.11 + 0.01;
      sleyPivot.rotation.x = sleyTilt;

      const sleyAdvanceZ = beatCos * 0.22;
      const rodLiftY = Math.sin(crankTheta) * 0.09;
      leftConnectingRod.position.set(-FRAME_X + 0.18, 0.2 + rodLiftY, 0.36 + sleyAdvanceZ);
      rightConnectingRod.position.set(FRAME_X - 0.18, 0.2 + rodLiftY, 0.36 + sleyAdvanceZ);

      // 5. Pointed Boat Shuttle Projectile Across Open Shed (Pick Direction Alternates Each Revolution!)
      const pickIndex = Math.floor(crankTheta / (Math.PI * 2));
      const inPickPhase = (crankTheta % (Math.PI * 2)) / (Math.PI * 2); // 0 to 1
      // Shuttle flies smoothly while sley is swung back (phase 0.22 -> 0.78)
      const flightT = THREE.MathUtils.clamp((inPickPhase - 0.22) / 0.56, 0, 1);
      const easedT = flightT * flightT * (3 - 2 * flightT);

      const shuttleStroke = FRAME_X + 0.45;
      const isLeftToRight = pickIndex % 2 === 0;
      const shuttleX = isLeftToRight
        ? THREE.MathUtils.lerp(-shuttleStroke, shuttleStroke, easedT)
        : THREE.MathUtils.lerp(shuttleStroke, -shuttleStroke, easedT);
      shuttleGroup.position.x = shuttleX;
      pirnMesh.rotation.x = shuttleX * 3.5;

      // Exact rotated shuttle coordinate in loom space for trailing weft pick filament
      const sinS = Math.sin(sleyTilt);
      const cosS = Math.cos(sleyTilt);
      const shuttleLocalY = 2.13;
      const shuttleLocalZ = 0.05;
      const shuttleLoomY = -1.65 + (shuttleLocalY * cosS - shuttleLocalZ * sinS);
      const shuttleLoomZ = 0.72 + (shuttleLocalY * sinS + shuttleLocalZ * cosS);

      const trailPosAttr = weftTrailGeo.attributes.position as THREE.BufferAttribute;
      const trailArr = trailPosAttr.array as Float32Array;
      const anchorX = isLeftToRight ? -CLOTH_WIDTH / 2 : CLOTH_WIDTH / 2;
      const shuttleTipX = THREE.MathUtils.clamp(shuttleX, -CLOTH_WIDTH / 2 - 0.3, CLOTH_WIDTH / 2 + 0.3);
      trailArr[0] = anchorX;
      trailArr[1] = 0.47;
      trailArr[2] = 0.96;
      trailArr[3] = shuttleTipX;
      trailArr[4] = shuttleLoomY;
      trailArr[5] = shuttleLoomZ;
      trailPosAttr.needsUpdate = true;

      // 6. Damped Interactive Camera Parallax
      const damp = 1 - Math.exp(-4.0 * delta);
      currentMouseX += (targetMouseX - currentMouseX) * damp;
      currentMouseY += (targetMouseY - currentMouseY) * damp;

      camera.position.x = -1.6 + currentMouseX * 0.85;
      camera.position.y = 2.6 + currentMouseY * 0.45;
      camera.lookAt(0.4, 0.1, -1.6);

      renderer.render(scene, camera);
    };

    renderer.setAnimationLoop(animate);

    // 8. Dispose All Geometries, Materials, Timers & Observer Cleanly
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

      floorGrid.geometry.dispose();
      (floorGrid.material as THREE.Material).dispose();
      for (const item of disposables) {
        item.dispose();
      }
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
          "radial-gradient(ellipse 105% 75% at 62% 28%, #0e1932 0%, #060b18 54%, #03060d 100%)",
      }}
    />
  );
};
