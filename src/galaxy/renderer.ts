import * as THREE from "three";
import sitesData from "../Data/sites.json";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SiteData {
  id: string;
  traffic: number;
  category: string;
  x: number;
  y: number;
  z: number;
  link: string;
  orbits?: string;
}

interface StarSystem {
  transformRoot: THREE.Object3D;
  visualParent: THREE.Object3D;
  sunMesh: THREE.Mesh;
  planets: THREE.Mesh[];
  orbitRadius: number;
}

interface WormholeEntry {
  line: THREE.Line;
  source: THREE.Object3D;
  target: THREE.Object3D;
  packet: THREE.Mesh;
  weight: number; // drives packet speed
}

interface PacketEntry {
  mesh: THREE.Mesh;
  source: THREE.Object3D;
  target: THREE.Object3D;
  curve: THREE.QuadraticBezierCurve3;
  progress: number;
  speed: number; // derived from wormhole weight
}

// ─── Main factory ─────────────────────────────────────────────────────────────

export function createGalaxy(
  container: HTMLDivElement,
  initialSearchTerm: string,
  initialActiveCategories: Set<string>
) {
  container.innerHTML = "";

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(
    75,
    container.clientWidth / container.clientHeight,
    0.1,
    1000
  );
  camera.position.set(0, 200, 400);

  // Mutable filter state updated from React without re-creating the scene
  const state = {
    searchTerm: initialSearchTerm,
    activeCategories: new Set(initialActiveCategories),
    locked: false,
  };

  // ─── Category colours ───────────────────────────────────────────────────────

  const categories = new Set<string>();
  sitesData.planets.forEach((p) => categories.add(p.category));

  const colorMap: Record<string, number> = {}; // fixed color for tech-giant category
  categories.forEach((c) => {
      colorMap[c] = randomColorHexNumber();
  });
  sitesData.suns.forEach((s) => categories.add(s.category));
  // ─── Scene objects ───────────────────────────────────────────────────────────

  let backgroundStars: THREE.Points = new THREE.Points();
  const starSystemRoots: THREE.Object3D[] = [];
  const galaxyOrbitPivots: { pivot: THREE.Object3D; speed: number }[] = [];
  const planetOrbitPivots: { pivot: THREE.Object3D; speed: number }[] = [];
  const starSystems: Record<string, StarSystem> = {};
  const planetMap: Record<string, THREE.Mesh> = {};
  const planets: THREE.Mesh[] = [];

  // Consistent orbital spacing per sun (stable across frames)
  const orbitOffset: Record<string, number> = {};
  sitesData.suns.forEach((sun) => {
    orbitOffset[sun.id] = 3 + Math.floor(Math.random() * 4);
  });

  const wormholes: WormholeEntry[] = [];
  const packets: PacketEntry[] = [];

  // ─── Tooltip ─────────────────────────────────────────────────────────────────

  const tooltip = document.createElement("div");
  Object.assign(tooltip.style, {
    position: "absolute",
    pointerEvents: "none",
    padding: "6px 10px",
    background: "rgba(0,0,0,0.75)",
    color: "white",
    borderRadius: "6px",
    fontSize: "12px",
    lineHeight: "1.6",
    display: "none",
    whiteSpace: "nowrap",
    border: "1px solid rgba(255,255,255,0.15)",
  });
  container.style.position = "relative";
  container.appendChild(tooltip);

  // ─── Lock icon UI ─────────────────────────────────────────────────────────────

  const lockBtn = document.createElement("button");
  lockBtn.title = "Unlock camera";
  lockBtn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
         fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <!-- locked padlock -->
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>`;
  Object.assign(lockBtn.style, {
    position: "absolute",
    bottom: "24px",
    left: "24px",
    zIndex: "20",
    pointerEvents: "auto",
    background: "rgba(20,20,20,0.85)",
    border: "1px solid rgba(255,255,255,0.25)",
    borderRadius: "8px",
    color: "white",
    padding: "8px 14px",
    cursor: "pointer",
    fontSize: "13px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    backdropFilter: "blur(6px)",
    transition: "background 0.2s",
  });
  const lockLabel = document.createElement("span");
  lockLabel.textContent = "Locked";
  lockBtn.appendChild(lockLabel);

  lockBtn.addEventListener("mouseenter", () => {
    lockBtn.style.background = "rgba(60,60,60,0.9)";
  });
  lockBtn.addEventListener("mouseleave", () => {
    lockBtn.style.background = "rgba(20,20,20,0.85)";
  });
  lockBtn.addEventListener("click", () => {
    unlockCamera();
  });
  container.appendChild(lockBtn);

  // ─── Raycaster & mouse ───────────────────────────────────────────────────────

  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  let cameraTarget: THREE.Object3D | null = null;

  function onMouseMove(event: MouseEvent) {
    const rect = container.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  function onClick(event: MouseEvent) {
    const rect = container.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(planets.filter((p) => p.visible));
    if (hits.length > 0) {
      lockOnTarget(hits[0].object);
    }
  }

  function onDblClick() {
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(planets.filter((p) => p.visible));
    if (hits.length > 0) {
      const url = hits[0].object.userData.url as string;
      if (url) window.open(url, "_blank");
    }
  }

  function lockOnTarget(obj: THREE.Object3D) {
    cameraTarget = obj;
    state.locked = true;
    controls.enabled = false;
    lockBtn.style.display = "flex";
  }

  function unlockCamera() {
    cameraTarget = null;
    state.locked = false;
    controls.enabled = true;
    lockBtn.style.display = "none";
  }

  window.addEventListener("mousemove", onMouseMove);
  window.addEventListener("click", onClick);
  window.addEventListener("dblclick", onDblClick);

  // ─── Renderer ─────────────────────────────────────────────────────────────────

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setClearColor(0x000000);
  container.appendChild(renderer.domElement);

  // ─── Controls ────────────────────────────────────────────────────────────────

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.maxDistance = 200000;
  controls.minDistance = 10;

  // ─── Resize handler ──────────────────────────────────────────────────────────

  const resizeObserver = new ResizeObserver(() => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  });
  resizeObserver.observe(container);

  // ─── Build the galaxy ────────────────────────────────────────────────────────

  sitesData.suns.forEach((sun) => {
    const orbit = createOrbit(10, sun.id);
    scene.add(orbit);
    starSystemRoots.push(orbit);
  });

  const center = createGalaxyCenter();
  scene.add(center);
  createBackgroundStars();

  // Ensure world matrices are up-to-date before computing wormhole positions
  scene.updateMatrixWorld(true);
  createEdges();

  // ─── Animation loop ──────────────────────────────────────────────────────────

  let time = 0;

  function animate() {
    requestAnimationFrame(animate);
    time += 0.02;

    // Apply search / category filters
    planets.forEach((planet) => {
      planet.scale.set(1, 1, 1);
      const matchesSearch = planet.userData.name
        .toLowerCase()
        .includes(state.searchTerm.toLowerCase());
      const planetCategory = ((planet.userData.category as string) || "").trim();
      const matchesCategory =
        state.activeCategories.size === 0 ||
        state.activeCategories.has(planetCategory);
      planet.visible = matchesSearch && matchesCategory;
    });

    Object.values(starSystems).forEach((system) => {
      const matchesSearch = (system.sunMesh.userData.name as string)
        .toLowerCase()
        .includes(state.searchTerm.toLowerCase());
      const sunCategory = ((system.sunMesh.userData.category as string) || "").trim();
      const matchesCategory =
        state.activeCategories.size === 0 ||
        state.activeCategories.has(sunCategory);
      system.sunMesh.visible = matchesCategory && matchesSearch;
    });

    // Hover detection & tooltip
    raycaster.setFromCamera(mouse, camera);
    const visiblePlanets = planets.filter((p) => p.visible);
    const hits = raycaster.intersectObjects(visiblePlanets);

    if (hits.length > 0) {
      const hovered = hits[0].object;
      hovered.scale.set(1.2, 1.2, 1.2);

      const mouseX = (mouse.x * 0.5 + 0.5) * container.clientWidth;
      const mouseY = (-mouse.y * 0.5 + 0.5) * container.clientHeight;
      tooltip.style.left = mouseX + 14 + "px";
      tooltip.style.top = mouseY + 14 + "px";
      tooltip.innerHTML =
        `<b>${hovered.userData.name}</b><br>` +
        `Traffic: ${hovered.userData.traffic}<br>` +
        `Category: ${hovered.userData.category}`;
      tooltip.style.display = "block";
    } else {
      tooltip.style.display = "none";
    }

    // Orbital rotation
    backgroundStars.rotation.y += 0.0002;
    galaxyOrbitPivots.forEach(({ pivot, speed }) => {
      pivot.rotation.y += speed;
    });
    planetOrbitPivots.forEach(({ pivot, speed }) => {
      pivot.rotation.y += speed;
    });
    Object.values(starSystems).forEach((system) => {
      system.transformRoot.rotation.y += 0.0004;
    });

    // Wormhole lines & packets — reuse geometry instead of disposing each frame
    wormholes.forEach((w) => {
      const sourceVisible = w.source.visible;
      const targetVisible = w.target.visible;
      w.line.visible = sourceVisible && targetVisible;
      w.packet.visible = sourceVisible && targetVisible;

      const start = new THREE.Vector3();
      const end = new THREE.Vector3();
      w.source.getWorldPosition(start);
      w.target.getWorldPosition(end);

      const mid = start.clone().add(end).multiplyScalar(0.5);
      const direction = new THREE.Vector3().subVectors(end, start);
      const perpendicular = new THREE.Vector3(
        -direction.z,
        direction.y,
        direction.x
      ).normalize();
      const distance = start.distanceTo(end);
      mid.add(perpendicular.multiplyScalar(distance * 0.25));

      const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
      const points = curve.getPoints(40);

      // Reuse geometry — avoid dispose/recreate every frame
      (w.line.geometry as THREE.BufferGeometry).setFromPoints(points);
      w.line.computeLineDistances();

      // Update corresponding packet curve
      const packetEntry = packets.find((p) => p.mesh === w.packet);
      if (packetEntry) packetEntry.curve = curve;

      const material = w.line.material as THREE.LineDashedMaterial;
      material.opacity = 0.5 + Math.sin(time) * 0.1;
      material.scale += 0.01;
    });

    // Advance packets — speed is driven by wormhole weight
    packets.forEach((p) => {
      p.progress += p.speed;
      if (p.progress > 1) p.progress = 0;
      const position = p.curve.getPoint(p.progress);
      p.mesh.position.copy(position);
    });

    // Camera lock: follow target with lerp
    if (cameraTarget && state.locked) {
      const targetPosition = new THREE.Vector3();
      cameraTarget.getWorldPosition(targetPosition);
      const desiredPosition = targetPosition
        .clone()
        .add(new THREE.Vector3(0, 10, 30));
      camera.position.lerp(desiredPosition, 0.05);
      controls.target.lerp(targetPosition, 0.05);
    }

    controls.update();
    renderer.render(scene, camera);
  }

  animate();

  // ─── Helper functions ────────────────────────────────────────────────────────

  function createBackgroundStars() {
    const starCount = 1000;
    const positions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i++) {
      positions[i] = (Math.random() - 0.5) * 2000;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 1,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.8,
    });
    backgroundStars = new THREE.Points(geometry, material);
    scene.add(backgroundStars);
  }

  function createOrbit(distance: number, sunId: string) {
    const sun = sitesData.suns.find((s) => s.id === sunId)!;
    const transformRoot = new THREE.Object3D();
    transformRoot.position.set(sun.x * 10, sun.y * 10, sun.z * 10);
    transformRoot.rotation.x = Math.random() * Math.PI;
    transformRoot.rotation.z = Math.random() * Math.PI;
    scene.add(transformRoot);

    const visualParent = new THREE.Object3D();
    transformRoot.add(visualParent);

    const sunMesh = createPlanetFromData(sun as SiteData, "sun");
    visualParent.add(sunMesh);

    const orbiters = sitesData.planets.filter((p) => p.orbits === sunId);
    const systemPlanets: THREE.Mesh[] = [];

    orbiters.forEach((site, index) => {
      const planet = createPlanetFromData(site as SiteData, "planet");
      const angle = Math.random() * Math.PI * 2;
      const orbitDistance = distance + index * (orbitOffset[sunId] || 5);
      const orbitPivot = new THREE.Object3D();
      const direction = Math.random() < 0.5 ? -1 : 1;

      orbitPivot.rotation.y = angle;
      visualParent.add(orbitPivot);

      planet.position.set(orbitDistance, 0, 0);
      orbitPivot.add(planet);
      planetOrbitPivots.push({
        pivot: orbitPivot,
        speed: direction * (0.003 + Math.random() * 0.004),
      });
      systemPlanets.push(planet);
    });

    starSystems[sunId] = {
      transformRoot,
      visualParent,
      sunMesh,
      planets: systemPlanets,
      orbitRadius: distance,
    };
    return transformRoot;
  }

  /**
   * Pass `null` as site to create the galaxy-center placeholder body.
   */
  function createPlanetFromData(site: SiteData | null, type: string): THREE.Mesh {
    if (site === null) {
      const geometry = new THREE.SphereGeometry(5, 32, 32);
      const material = new THREE.MeshBasicMaterial({ color: 0x78fcff });
      return new THREE.Mesh(geometry, material);
    }

    const size = type === "sun" ? 5 : site.traffic / 100;
    const geometry = new THREE.SphereGeometry(size, 32, 32);
    const material = new THREE.MeshBasicMaterial({
      color: colorMap[site.category] ?? (type === "sun" ? 0xffcc33 : 0x00ff00),
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.userData = {
      name: site.id,
      url: site.link,
      traffic: site.traffic,
      category: site.category,
      type,
    };
    planetMap[site.id] = mesh;
    planets.push(mesh);
    return mesh;
  }

  function createEdges() {
    sitesData.wormholes.forEach((edge) => {
      const sourcePlanet = planetMap[edge.source];
      const targetPlanet = planetMap[edge.target];
      if (!sourcePlanet || !targetPlanet) return;

      const start = sourcePlanet.getWorldPosition(new THREE.Vector3());
      const end = targetPlanet.getWorldPosition(new THREE.Vector3());
      const distance = start.distanceTo(end);

      const mid = start.clone().add(end).multiplyScalar(0.5);
      const direction = new THREE.Vector3().subVectors(end, start);
      const perpendicular = new THREE.Vector3(
        -direction.z,
        direction.y,
        direction.x
      ).normalize();
      mid.add(perpendicular.multiplyScalar(distance * 0.3));

      const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
      const points = curve.getPoints(40);
      const geometry = new THREE.BufferGeometry().setFromPoints(points);

      const color = new THREE.Color().setHSL(Math.random(), 1, 0.6);
      const material = new THREE.LineDashedMaterial({
        color,
        dashSize: 2,
        gapSize: 1,
        scale: 1,
        transparent: true,
        opacity: 0.5,
      });

      const line = new THREE.Line(geometry, material);
      line.computeLineDistances();

      // Weight (0–1) maps to packet speed: heavier links carry faster packets
      const weight = typeof edge.weight === "number" ? edge.weight : 0.5;
      const packet = createPacket(sourcePlanet, targetPlanet, color, curve, weight);

      wormholes.push({ line, source: sourcePlanet, target: targetPlanet, packet, weight });
      scene.add(line);
    });
  }

  function createPacket(
    sourcePlanet: THREE.Object3D,
    targetPlanet: THREE.Object3D,
    color: THREE.Color,
    curve: THREE.QuadraticBezierCurve3,
    weight: number
  ): THREE.Mesh {
    const packetGeometry = new THREE.SphereGeometry(0.2, 8, 8);
    const packetMaterial = new THREE.MeshBasicMaterial({ color });
    const mesh = new THREE.Mesh(packetGeometry, packetMaterial);
    scene.add(mesh);

    // Map weight [0, 1] → speed [0.005, 0.04] so heavier = faster
    const speed = 0.005 + weight * 0.035;

    packets.push({
      mesh,
      source: sourcePlanet,
      target: targetPlanet,
      curve,
      progress: Math.random(),
      speed,
    });

    return mesh;
  }

  function randomColorHexNumber(): number {
    return Math.floor(Math.random() * 0x1000000);
  }

  function createGalaxyCenter() {
    const transformRoot = new THREE.Object3D();
    transformRoot.position.set(0, 0, 0);
    scene.add(transformRoot);

    const visualParent = new THREE.Object3D();
    transformRoot.add(visualParent);

    // Use null to get the teal placeholder body
    const centerMesh = createPlanetFromData(null, "sun");
    centerMesh.scale.setScalar(2.5);
    visualParent.add(centerMesh);

    const systemPlanets: THREE.Mesh[] = [];

    starSystemRoots.forEach((star, index) => {
      const angle = Math.random() * Math.PI * 2;
      const orbitDistance = 40 + index * 20;
      const orbitPivot = new THREE.Object3D();

      orbitPivot.rotation.y = angle;
      visualParent.add(orbitPivot);

      star.position.set(orbitDistance, 0, 0);
      orbitPivot.add(star);

      const direction = Math.random() < 0.5 ? -1 : 1;
      galaxyOrbitPivots.push({
        pivot: orbitPivot,
        speed: direction * (0.0005 + Math.random() * 0.0015),
      });

      systemPlanets.push(star as THREE.Mesh);
    });

    transformRoot.userData = {
      transformRoot,
      visualParent,
      sunMesh: centerMesh,
      planets: systemPlanets,
      orbitRadius: 20,
    };
    return transformRoot;
  }

  // ─── Cleanup ─────────────────────────────────────────────────────────────────

  function dispose() {
    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("click", onClick);
    window.removeEventListener("dblclick", onDblClick);
    resizeObserver.disconnect();
    renderer.dispose();
    if (renderer.domElement.parentNode) {
      renderer.domElement.parentNode.removeChild(renderer.domElement);
    }
  }

  // ─── Public API ───────────────────────────────────────────────────────────────

  return {
    updateFilters: (newSearchTerm: string, newActiveCategories: Set<string>) => {
      state.searchTerm = newSearchTerm;
      state.activeCategories = new Set(newActiveCategories);
    },
    dispose,
  };
}