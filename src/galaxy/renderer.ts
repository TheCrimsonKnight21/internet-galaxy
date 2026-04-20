import * as THREE from "three";
import sitesData from "../Data/new_sites.json";
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

// COMMENTED OUT - wormhole/packet system inactive
// interface WormholeData {
//   source: string;
//   target: string;
//   weight: number;
//   type: string;
// }

interface StarSystem {
  transformRoot: THREE.Object3D;
  visualParent: THREE.Object3D;
  sunMesh: THREE.Mesh;
  orbitRadius: number;
}

interface PlanetInstance {
  index: number;
  mesh: THREE.InstancedMesh;
  category: string;
  placeholder: THREE.Object3D;
  orbitPivot: THREE.Object3D;
  worldPos: THREE.Vector3;
  userData: {
    name: string;
    url: string;
    traffic: number;
    category: string;
    type: string;
  };
  visible: boolean;
}

// COMMENTED OUT - wormhole/packet system inactive
// interface WormholeEntry {
//   line: THREE.Line;
//   sourceInstance: PlanetInstance;
//   targetInstance: PlanetInstance;
//   packet: THREE.Mesh;
//   weight: number;
//   speed: number;
//   curve: THREE.QuadraticBezierCurve3;
// }

// ─── Constants ────────────────────────────────────────────────────────────────

// COMMENTED OUT - wormhole/packet system inactive
// const MAX_WORMHOLES = 200;
const PLANET_GEO = new THREE.SphereGeometry(1, 12, 8);

// Scratch objects allocated ONCE — never inside the animation loop
const _m4 = new THREE.Matrix4();
const _v3a = new THREE.Vector3();
const _v3b = new THREE.Vector3();
const _v3c = new THREE.Vector3();

// ─── Main factory ─────────────────────────────────────────────────────────────

export function createGalaxy(
  container: HTMLDivElement,
  initialSearchTerm: string,
  initialActiveCategories: Set<string>,
  initialLocked: boolean,
  onLockChange: (locked: boolean) => void,
  onTooltipUpdate: (
    visible: boolean,
    content?: { name: string; traffic: number; category: string },
    pos?: { x: number; y: number },
  ) => void,
) {
  container.innerHTML = "";

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x000000, 0.0015);

  const camera = new THREE.PerspectiveCamera(
    75,
    container.clientWidth / container.clientHeight,
    0.1,
    8000,
  );
  camera.position.set(0, 200, 400);

  const state = {
    searchTerm: initialSearchTerm,
    activeCategories: new Set(initialActiveCategories),
    locked: initialLocked,
    filterDirty: true,
    orbitsPaused: false,
  };

  // ── Categories & colours ──────────────────────────────────────────────────

  const categories = new Set<string>();
  (sitesData.planets as SiteData[]).forEach((p) => categories.add(p.category));
  (sitesData.suns as SiteData[]).forEach((s) => categories.add(s.category));

  const colorMap = new Map<string, THREE.Color>();
  const hueStep = 1 / Math.max(categories.size, 1);
  let hueIdx = 0;
  categories.forEach((c) => {
    colorMap.set(c, new THREE.Color().setHSL(hueIdx * hueStep, 0.85, 0.55));
    hueIdx++;
  });

  // ── InstancedMesh — one per category ─────────────────────────────────────

  const categoryCount = new Map<string, number>();
  (sitesData.planets as SiteData[]).forEach((p) => {
    categoryCount.set(p.category, (categoryCount.get(p.category) ?? 0) + 1);
  });

  const instancedMeshes = new Map<string, THREE.InstancedMesh>();
  const categorySlotCounter = new Map<string, number>();

  categoryCount.forEach((count, cat) => {
    const mat = new THREE.MeshBasicMaterial({ color: colorMap.get(cat) });
    const im = new THREE.InstancedMesh(PLANET_GEO, mat, count);
    im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    im.frustumCulled = false;
    im.count = count;
    scene.add(im);
    instancedMeshes.set(cat, im);
    categorySlotCounter.set(cat, 0);
  });

  // ── Scene collections ─────────────────────────────────────────────────────

  const starSystemRoots: THREE.Object3D[] = [];
  const galaxyOrbitPivots: { pivot: THREE.Object3D; speed: number }[] = [];
  const planetOrbitEntries: {
    pivot: THREE.Object3D;
    speed: number;
    inst: PlanetInstance;
  }[] = [];
  const starSystems: Record<string, StarSystem> = {};
  const planetInstanceMap = new Map<string, PlanetInstance>();
  const allPlanetInstances: PlanetInstance[] = [];
  const sunMeshes: Map<string, { mesh: THREE.Mesh; baseScale: number }> =
    new Map();

  const orbitOffset: Record<string, number> = {};
  (sitesData.suns as SiteData[]).forEach((sun) => {
    orbitOffset[sun.id] = 3 + Math.floor(Math.random() * 4);
  });

  // COMMENTED OUT - wormhole/packet system inactive
  // const wormholes: WormholeEntry[] = [];
  // const packets: {
  //   mesh: THREE.Mesh;
  //   wormhole: WormholeEntry;
  //   progress: number;
  // }[] = [];

  // ── Background stars — separate scene with NO FOG ─────────────────────────
  // Rendered in a first pass before the main scene so fog never touches them.
  // Camera follows main camera position & rotation so stars rotate with world
  // and don't get affected by orbital camera movement.

  const bgScene = new THREE.Scene();
  const bgCamera = new THREE.PerspectiveCamera(
    75,
    container.clientWidth / container.clientHeight,
    1,
    10000,
  );
  bgCamera.position.set(0, 0, 0);

  {
    const count = 3000;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i++) pos[i] = (Math.random() - 0.5) * 6000;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    bgScene.add(
      new THREE.Points(
        geo,
        new THREE.PointsMaterial({
          color: 0xffffff,
          size: 1.2,
          sizeAttenuation: true,
          transparent: true,
          opacity: 0.7,
        }),
      ),
    );
  }

  // ── Tooltip ───────────────────────────────────────────────────────────────
  // MOVED TO APP.TSX - tooltip creation and management

  // ── Lock button ───────────────────────────────────────────────────────────
  // MOVED TO APP.TSX - lock button creation and management

  // ── Raycaster ─────────────────────────────────────────────────────────────

  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  let cameraTarget: PlanetInstance | null = null;
  let cameraTargetSunId: string | null = null;
  let hoveredInstance: PlanetInstance | null = null;
  let hoveredSunId: string | null = null;
  let prevHovered: PlanetInstance | null = null;
  let prevHoveredSunId: string | null = null;

  // Touch handling for mobile
  let touchStartTime = 0;
  let touchStartX = 0;
  let touchStartY = 0;
  let longPressTimeout: ReturnType<typeof setTimeout> | null = null;

  function onMouseMove(e: MouseEvent) {
    const r = container.getBoundingClientRect();
    mouse.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    mouse.y = -((e.clientY - r.top) / r.height) * 2 + 1;
  }

  function onTouchStart(e: TouchEvent) {
    if (e.touches.length !== 1) return;
    touchStartTime = Date.now();
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;

    // Set up long-press timer (500ms)
    longPressTimeout = setTimeout(() => {
      const r = container.getBoundingClientRect();
      mouse.x = ((e.touches[0].clientX - r.left) / r.width) * 2 - 1;
      mouse.y = -((e.touches[0].clientY - r.top) / r.height) * 2 + 1;
      onLongPress();
    }, 500);
  }

  function onTouchEnd(e: TouchEvent) {
    if (longPressTimeout) {
      clearTimeout(longPressTimeout);
      longPressTimeout = null;
    }

    // Check if it was a tap (short duration, minimal movement)
    const duration = Date.now() - touchStartTime;
    const distance = Math.sqrt(
      Math.pow(e.changedTouches[0].clientX - touchStartX, 2) +
        Math.pow(e.changedTouches[0].clientY - touchStartY, 2),
    );

    if (duration < 500 && distance < 10) {
      // It's a tap
      const r = container.getBoundingClientRect();
      mouse.x = ((e.changedTouches[0].clientX - r.left) / r.width) * 2 - 1;
      mouse.y = -((e.changedTouches[0].clientY - r.top) / r.height) * 2 + 1;
      const hitPlanet = raycastInstances();
      const hitSun = raycastSuns();
      if (hitPlanet) {
        lockOnTarget(hitPlanet);
      } else if (hitSun) {
        cameraTargetSunId = hitSun;
        state.locked = true;
        controls.enabled = false;
        onLockChange(true);
      }
    }
  }

  function onLongPress() {
    const hitPlanet = raycastInstances();
    if (hitPlanet?.userData.url) {
      window.open(hitPlanet.userData.url, "_blank");
      return;
    }
    const hitSun = raycastSuns();
    if (hitSun) {
      const sunSystem = starSystems[hitSun];
      if (sunSystem.sunMesh.userData.url) {
        window.open(sunSystem.sunMesh.userData.url, "_blank");
      }
    }
  }

  function onClick(e: MouseEvent) {
    const r = container.getBoundingClientRect();
    mouse.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    mouse.y = -((e.clientY - r.top) / r.height) * 2 + 1;
    const hitPlanet = raycastInstances();
    const hitSun = raycastSuns();
    if (hitPlanet) {
      lockOnTarget(hitPlanet);
    } else if (hitSun) {
      cameraTargetSunId = hitSun;
      state.locked = true;
      controls.enabled = false;
      onLockChange(true);
    }
  }

  function onDblClick() {
    const hitPlanet = raycastInstances();
    if (hitPlanet?.userData.url) {
      window.open(hitPlanet.userData.url, "_blank");
      return;
    }
    const hitSun = raycastSuns();
    if (hitSun) {
      const sunSystem = starSystems[hitSun];
      if (sunSystem.sunMesh.userData.url) {
        window.open(sunSystem.sunMesh.userData.url, "_blank");
      }
    }
  }

  function raycastInstances(): PlanetInstance | null {
    raycaster.setFromCamera(mouse, camera);
    let best: { dist: number; inst: PlanetInstance } | null = null;
    for (const im of instancedMeshes.values()) {
      const hits = raycaster.intersectObject(im);
      if (!hits.length) continue;
      const id = (hits[0] as THREE.Intersection & { instanceId?: number })
        .instanceId;
      if (id === undefined) continue;
      const inst = allPlanetInstances.find(
        (pi) => pi.mesh === im && pi.index === id && pi.visible,
      );
      if (inst !== undefined && (!best || hits[0].distance < best.dist)) {
        best = { dist: hits[0].distance, inst };
      }
    }
    if (best) return best.inst;
    return null;
  }

  function raycastSuns(): string | null {
    raycaster.setFromCamera(mouse, camera);
    let best: { dist: number; sunId: string } | null = null;
    for (const [sunId, { mesh: sunMesh }] of sunMeshes) {
      const hits = raycaster.intersectObject(sunMesh);
      if (!hits.length) continue;
      const sys = starSystems[sunId];
      if (
        sys &&
        sys.sunMesh.visible &&
        (!best || hits[0].distance < best.dist)
      ) {
        best = { dist: hits[0].distance, sunId };
      }
    }
    if (best) return best.sunId;
    return null;
  }

  function lockOnTarget(inst: PlanetInstance) {
    cameraTarget = inst;
    state.locked = true;
    controls.enabled = false;
    onLockChange(true);
  }

  // unlockCamera function no longer needed - unlocking is handled by App.tsx through updateLockState

  window.addEventListener("mousemove", onMouseMove);
  window.addEventListener("click", onClick);
  window.addEventListener("dblclick", onDblClick);

  // Touch events for mobile
  window.addEventListener("touchstart", onTouchStart, { passive: true });
  window.addEventListener("touchend", onTouchEnd, { passive: true });

  // ── Renderer ──────────────────────────────────────────────────────────────

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000);
  renderer.autoClear = false; // required for two-pass rendering
  container.appendChild(renderer.domElement);

  // ── Controls ──────────────────────────────────────────────────────────────

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.maxDistance = 2000;
  controls.minDistance = 5;

  // ── Resize handler ────────────────────────────────────────────────────────

  const resizeObserver = new ResizeObserver(() => {
    const w = container.clientWidth,
      h = container.clientHeight;
    camera.aspect = bgCamera.aspect = w / h;
    camera.updateProjectionMatrix();
    bgCamera.updateProjectionMatrix();
    renderer.setSize(w, h);
  });
  resizeObserver.observe(container);

  // ── Build scene ───────────────────────────────────────────────────────────

  (sitesData.suns as SiteData[]).forEach((sun) => {
    const root = createOrbit(10, sun.id);
    scene.add(root);
    starSystemRoots.push(root);
  });
  createGalaxyCenter();

  // ONE updateMatrixWorld at startup — after this we track positions manually
  scene.updateMatrixWorld(true);

  allPlanetInstances.forEach((pi) => {
    pi.placeholder.getWorldPosition(pi.worldPos);
    writeInstanceMatrix(pi, pi.worldPos, getInstanceScale(pi.userData.traffic));
  });
  instancedMeshes.forEach((im) => (im.instanceMatrix.needsUpdate = true));

  // createEdges(); // COMMENTED OUT - wormhole/packet system inactive

  // ── Animation loop ────────────────────────────────────────────────────────

  let time = 0;

  function animate() {
    requestAnimationFrame(animate);
    time += 0.02;

    // 1. Filter — only runs when updateFilters() was called ──────────────────
    if (state.filterDirty) {
      state.filterDirty = false;
      let dirty = false;
      allPlanetInstances.forEach((pi) => {
        const show =
          pi.userData.name
            .toLowerCase()
            .includes(state.searchTerm.toLowerCase()) &&
          (state.activeCategories.size === 0 ||
            state.activeCategories.has(pi.category));
        if (show !== pi.visible) {
          pi.visible = show;
          writeInstanceMatrix(
            pi,
            pi.worldPos,
            show ? getInstanceScale(pi.userData.traffic) : 0,
          );
          dirty = true;
        }
      });
      Object.values(starSystems).forEach((sys) => {
        const show =
          (sys.sunMesh.userData.name as string)
            .toLowerCase()
            .includes(state.searchTerm.toLowerCase()) &&
          (state.activeCategories.size === 0 ||
            state.activeCategories.has(
              (sys.sunMesh.userData.category as string).trim(),
            ));
        sys.sunMesh.visible = show;
      });
      if (dirty)
        instancedMeshes.forEach((im) => (im.instanceMatrix.needsUpdate = true));
    }

    // 2. Orbital rotation + manual world-position tracking ───────────────────
    // Rotating a pivot and calling pivot.updateMatrixWorld(false) is O(1) per
    // pivot — far cheaper than scene.updateMatrixWorld which traverses everything.

    if (!state.orbitsPaused) {
      Object.values(starSystems).forEach((sys) => {
        sys.transformRoot.rotation.y += 0.0004;
      });
      galaxyOrbitPivots.forEach(({ pivot, speed }) => {
        pivot.rotation.y += speed;
      });

      planetOrbitEntries.forEach(({ pivot, speed, inst }) => {
        pivot.rotation.y += speed;
        pivot.updateMatrixWorld(false);
        // placeholder is always at (orbitDist, 0, 0) in pivot-local space.
        // applyMatrix4(pivot.matrixWorld) gives us world space in one call.
        _v3a.copy(inst.placeholder.position).applyMatrix4(pivot.matrixWorld);
        inst.worldPos.copy(_v3a);
        writeInstanceMatrix(
          inst,
          inst.worldPos,
          inst.visible ? getInstanceScale(inst.userData.traffic) : 0,
        );
      });
    } else {
      // When paused, still need to update instance matrices for visibility changes
      planetOrbitEntries.forEach(({ inst }) => {
        writeInstanceMatrix(
          inst,
          inst.worldPos,
          inst.visible ? getInstanceScale(inst.userData.traffic) : 0,
        );
      });
    }
    instancedMeshes.forEach((im) => (im.instanceMatrix.needsUpdate = true));

    // 3. Hover ────────────────────────────────────────────────────────────────
    raycaster.setFromCamera(mouse, camera);
    hoveredInstance = raycastInstances();
    hoveredSunId = raycastSuns();

    // Reset previous planet hover
    if (prevHovered && prevHovered !== hoveredInstance && prevHovered.visible) {
      writeInstanceMatrix(
        prevHovered,
        prevHovered.worldPos,
        getInstanceScale(prevHovered.userData.traffic),
      );
      prevHovered.mesh.instanceMatrix.needsUpdate = true;
    }

    // Reset previous sun hover
    if (prevHoveredSunId && prevHoveredSunId !== hoveredSunId) {
      const prevSun = sunMeshes.get(prevHoveredSunId);
      if (prevSun) {
        prevSun.mesh.scale.setScalar(1);
      }
    }

    // Handle planet hover
    if (hoveredInstance) {
      writeInstanceMatrix(
        hoveredInstance,
        hoveredInstance.worldPos,
        getInstanceScale(hoveredInstance.userData.traffic) * 1.5,
      );
      hoveredInstance.mesh.instanceMatrix.needsUpdate = true;
      const mx = (mouse.x * 0.5 + 0.5) * container.clientWidth;
      const my = (-mouse.y * 0.5 + 0.5) * container.clientHeight;
      onTooltipUpdate(
        true,
        {
          name: hoveredInstance.userData.name,
          traffic: Math.round(hoveredInstance.userData.traffic * 100) / 100,
          category: hoveredInstance.userData.category,
        },
        { x: mx, y: my },
      );
    } else if (hoveredSunId) {
      // Handle sun hover
      const sunData = sunMeshes.get(hoveredSunId);
      if (sunData) {
        sunData.mesh.scale.setScalar(1.5);
        const sunSystem = starSystems[hoveredSunId];
        const mx = (mouse.x * 0.5 + 0.5) * container.clientWidth;
        const my = (-mouse.y * 0.5 + 0.5) * container.clientHeight;
        onTooltipUpdate(
          true,
          {
            name: sunSystem.sunMesh.userData.name as string,
            traffic:
              Math.round((sunSystem.sunMesh.userData.traffic as number) * 100) /
              100,
            category: sunSystem.sunMesh.userData.category as string,
          },
          { x: mx, y: my },
        );
      }
    } else {
      onTooltipUpdate(false);
    }
    prevHovered = hoveredInstance;
    prevHoveredSunId = hoveredSunId;

    // 4. Packets — lines are STATIC, only tiny packet spheres move ───────────
    // COMMENTED OUT - wormhole/packet system inactive
    // packets.forEach((p) => {
    //   p.progress += p.wormhole.speed;
    //   if (p.progress > 1) p.progress = 0;
    //   p.wormhole.curve.getPoint(p.progress, _v3a); // writes into _v3a, no allocation
    //   p.mesh.position.copy(_v3a);
    //   p.mesh.visible =
    //     p.wormhole.sourceInstance.visible && p.wormhole.targetInstance.visible;
    // });

    // 5. Camera lock ──────────────────────────────────────────────────────────
    if (state.locked) {
      if (cameraTarget) {
        _v3b.copy(cameraTarget.worldPos).add(_v3c.set(0, 8, 20));
        camera.position.lerp(_v3b, 0.05);
        controls.target.lerp(cameraTarget.worldPos, 0.05);
      } else if (cameraTargetSunId) {
        const sunSystem = starSystems[cameraTargetSunId];
        if (sunSystem) {
          const sunWorldPos = new THREE.Vector3();
          sunSystem.sunMesh.getWorldPosition(sunWorldPos);
          _v3b.copy(sunWorldPos).add(_v3c.set(0, 8, 20));
          camera.position.lerp(_v3b, 0.05);
          controls.target.lerp(sunWorldPos, 0.05);
        }
      }
    }

    controls.update();

    // ── Update background camera to match main camera ─────────────────────
    // This keeps background stars locked to world rotation but unaffected by
    // camera movement. We sync position & rotation so stars rotate with scene.
    bgCamera.position.copy(camera.position);
    bgCamera.quaternion.copy(camera.quaternion);

    // Slowly rotate the star field
    bgScene.rotation.z += 0.00006;
    bgScene.rotation.y += 0.00009;

    // 6. Two-pass render ──────────────────────────────────────────────────────
    renderer.clear();
    renderer.render(bgScene, bgCamera); // background stars, no fog
    renderer.clearDepth(); // don't let stars occlude the galaxy
    renderer.render(scene, camera); // galaxy, with fog
  }

  animate();

  // ── Helpers ───────────────────────────────────────────────────────────────

  /** Set instance matrix using only position + uniform scale — no decompose. */
  function writeInstanceMatrix(
    pi: PlanetInstance,
    pos: THREE.Vector3,
    scale: number,
  ) {
    _m4.makeScale(scale, scale, scale);
    _m4.setPosition(pos);
    pi.mesh.setMatrixAt(pi.index, _m4);
  }

  function getInstanceScale(traffic: number): number {
    return 0.4 + ((traffic - 80) / 20) * 0.8;
  }

  function addPlanetInstance(
    site: SiteData,
    visualParent: THREE.Object3D,
    orbitDist: number,
  ): PlanetInstance | null {
    const im = instancedMeshes.get(site.category);
    if (!im) return null;
    const slot = categorySlotCounter.get(site.category) ?? 0;
    categorySlotCounter.set(site.category, slot + 1);

    const orbitPivot = new THREE.Object3D();
    orbitPivot.rotation.y = Math.random() * Math.PI * 2;
    visualParent.add(orbitPivot);

    const placeholder = new THREE.Object3D();
    placeholder.position.set(orbitDist, 0, 0);
    orbitPivot.add(placeholder);

    _m4.makeScale(0, 0, 0);
    im.setMatrixAt(slot, _m4);

    const pi: PlanetInstance = {
      index: slot,
      mesh: im,
      category: site.category,
      placeholder,
      orbitPivot,
      worldPos: new THREE.Vector3(),
      userData: {
        name: site.id,
        url: site.link,
        traffic: site.traffic,
        category: site.category,
        type: "planet",
      },
      visible: true,
    };

    planetInstanceMap.set(site.id, pi);
    allPlanetInstances.push(pi);
    return pi;
  }

  function createOrbit(distance: number, sunId: string): THREE.Object3D {
    const sun = (sitesData.suns as SiteData[]).find((s) => s.id === sunId)!;
    const transformRoot = new THREE.Object3D();
    transformRoot.position.set(sun.x * 2, sun.y * 2, sun.z * 2);
    transformRoot.rotation.x = Math.random() * Math.PI;
    transformRoot.rotation.z = Math.random() * Math.PI;
    scene.add(transformRoot);

    const visualParent = new THREE.Object3D();
    transformRoot.add(visualParent);

    const sunGeo = new THREE.SphereGeometry(3, 16, 12);
    const sunMat = new THREE.MeshBasicMaterial({
      color: 0xffcc33,
    });
    const sunMesh = new THREE.Mesh(sunGeo, sunMat);
    sunMesh.userData = {
      name: sun.id,
      url: sun.link,
      traffic: sun.traffic,
      category: sun.category,
      type: "sun",
    };
    visualParent.add(sunMesh);
    sunMeshes.set(sun.id, { mesh: sunMesh, baseScale: 1 });

    (sitesData.planets as SiteData[])
      .filter((p) => p.orbits === sunId)
      .forEach((site, index) => {
        const orbitDist = distance + index * (orbitOffset[sunId] || 5);
        const direction = Math.random() < 0.5 ? -1 : 1;
        const pi = addPlanetInstance(site, visualParent, orbitDist);
        if (!pi) return;
        planetOrbitEntries.push({
          pivot: pi.orbitPivot,
          speed: direction * (0.003 + Math.random() * 0.004),
          inst: pi,
        });
      });

    starSystems[sunId] = {
      transformRoot,
      visualParent,
      sunMesh,
      orbitRadius: distance,
    };
    return transformRoot;
  }

  function createGalaxyCenter() {
    const root = new THREE.Object3D();
    const vp = new THREE.Object3D();
    root.add(vp);
    scene.add(root);
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(5, 24, 16),
      new THREE.MeshBasicMaterial({ color: 0x78fcff }),
    );
    mesh.scale.setScalar(2.5);
    vp.add(mesh);
    starSystemRoots.forEach((star, i) => {
      const pivot = new THREE.Object3D();
      pivot.rotation.y = Math.random() * Math.PI * 2;
      vp.add(pivot);
      star.position.set(50 + i * 15, 0, 0);
      pivot.add(star);
      const dir = Math.random() < 0.5 ? -1 : 1;
      galaxyOrbitPivots.push({
        pivot,
        speed: dir * (0.0003 + Math.random() * 0.0008),
      });
    });
  }

  // COMMENTED OUT - Wormhole/packet creation system inactive
  // function createEdges() {
  //   const sorted = [...(sitesData.wormholes as WormholeData[])]
  //     .sort((a, b) => b.weight - a.weight)
  //     .slice(0, MAX_WORMHOLES);
  //
  //   sorted.forEach((edge) => {
  //     const src = planetInstanceMap.get(edge.source);
  //     const tgt = planetInstanceMap.get(edge.target);
  //     if (!src || !tgt) return;
  //
  //     const start = src.worldPos.clone();
  //     const end = tgt.worldPos.clone();
  //     const mid = start.clone().add(end).multiplyScalar(0.5);
  //     const dir = new THREE.Vector3().subVectors(end, start);
  //     const perp = new THREE.Vector3(-dir.z, dir.y, dir.x).normalize();
  //     mid.add(perp.multiplyScalar(start.distanceTo(end) * 0.3));
  //
  //     const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
  //     const geo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(24));
  //     const wColor = new THREE.Color().setHSL(Math.random(), 0.9, 0.55);
  //     const mat = new THREE.LineDashedMaterial({
  //       color: wColor,
  //       dashSize: 2,
  //       gapSize: 1,
  //       scale: 1,
  //       transparent: true,
  //       opacity: 0.35,
  //     });
  //     const line = new THREE.Line(geo, mat);
  //     line.computeLineDistances();
  //     scene.add(line);
  //
  //     const speed = 0.005 + edge.weight * 0.02;
  //     const packetMesh = new THREE.Mesh(
  //       new THREE.SphereGeometry(0.18, 5, 4),
  //       new THREE.MeshBasicMaterial({ color: wColor }),
  //     );
  //     scene.add(packetMesh);
  //
  //     const entry: WormholeEntry = {
  //       line,
  //       sourceInstance: src,
  //       targetInstance: tgt,
  //       packet: packetMesh,
  //       weight: edge.weight,
  //       speed,
  //       curve,
  //     };
  //     wormholes.push(entry);
  //     packets.push({
  //       mesh: packetMesh,
  //       wormhole: entry,
  //       progress: Math.random(),
  //     });
  //   });
  // }

  // ── Cleanup ───────────────────────────────────────────────────────────────

  function dispose() {
    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("click", onClick);
    window.removeEventListener("dblclick", onDblClick);
    resizeObserver.disconnect();
    instancedMeshes.forEach((im) => {
      im.geometry.dispose();
      (im.material as THREE.Material).dispose();
    });
    renderer.dispose();
    renderer.domElement.parentNode?.removeChild(renderer.domElement);
  }

  return {
    updateFilters: (newSearch: string, newCats: Set<string>) => {
      state.searchTerm = newSearch;
      state.activeCategories = new Set(newCats);
      state.filterDirty = true;
    },
    updateLockState: (locked: boolean) => {
      state.locked = locked;
      if (!locked) {
        cameraTarget = null;
        cameraTargetSunId = null;
        controls.enabled = true;
      }
    },
    toggleOrbitPause: () => {
      state.orbitsPaused = !state.orbitsPaused;
      return state.orbitsPaused;
    },
    dispose,
  };
}
