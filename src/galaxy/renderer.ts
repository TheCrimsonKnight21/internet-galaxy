import * as THREE from "three";
import sitesData from "../Data/sites.json";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";


export function createGalaxy(container: HTMLDivElement) {
    container.innerHTML = ""; 
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(
    75,
    container.clientWidth / container.clientHeight,
    0.1,
    1000
  );
  // Create tooltip
  const tooltip = document.createElement("div");
  tooltip.style.position = "absolute";
  tooltip.style.pointerEvents = "none";
  tooltip.style.padding = "4px 8px";
  tooltip.style.background = "rgba(0,0,0,0.7)";
  tooltip.style.color = "white";
  tooltip.style.borderRadius = "4px";
  tooltip.style.fontSize = "12px";
  tooltip.style.display = "none";

  container.style.position = "relative";
  container.appendChild(tooltip);

  // Create raycaster
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  // Events
  let cameraTarget: THREE.Object3D | null = null
  window.addEventListener("mousemove", (event) => {
    const rect = container.getBoundingClientRect();

    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  });
  window.addEventListener('click', (event) => {
    const rect = container.getBoundingClientRect();

    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  });

  window.addEventListener("click", () => {

    raycaster.setFromCamera(mouse, camera)

    const intersects = raycaster.intersectObjects(planets)

    if (intersects.length > 0) {

      cameraTarget = intersects[0].object

    }
  })
  window.addEventListener("dblclick", () => {

    raycaster.setFromCamera(mouse, camera)

    const intersects = raycaster.intersectObjects(planets)

    if (intersects.length > 0) {

      const clicked = intersects[0].object
      const url = clicked.userData.url
      window.open(url, "_blank")
    }
  })

  // Create remderer
  const renderer = new THREE.WebGLRenderer();

  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setClearColor(0x000000);
  container.appendChild(renderer.domElement);

  // Create controls
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  camera.position.set(0, 200, 400)
  controls.maxDistance = 2000;
  controls.minDistance = 20;
 
  // Data structures to hold orbits and planets


  let stars: THREE.Points = new THREE.Points();
  const orbits: { [key: string]: THREE.Mesh } = {};
  const planetMap: { [key: string]: THREE.Mesh } = {};
  const planets: THREE.Mesh[] = [];
  const orbitOffset: { [key: string]: number } = {
    "Google": 6,
    "Meta": 6,
    "Amazon": 5,
    "Apple": 5,
    "Microsoft": 5
  };
  const wormholes: {
    line: THREE.Line,
    source: THREE.Object3D,
    target: THREE.Object3D
    packet: THREE.Mesh
  }[] = []
  const packets: {
    mesh: THREE.Mesh,
    source: THREE.Object3D,
    target: THREE.Object3D,
    curve: THREE.QuadraticBezierCurve3,
    progress: number,

  }[] = []

  // Galaxy creation
  sitesData.suns.forEach((sun) => {
    const orbit = createOrbit(15, sun.id);
    orbits[sun.id] = orbit;
    scene.add(orbit);
  });

  createStars()
  scene.updateMatrixWorld(true)
  createEdges()

  let time = 0
  function animate() {
   requestAnimationFrame(animate); 
   time += 0.02
   
   raycaster.setFromCamera(mouse, camera)

    const intersects = raycaster.intersectObjects(planets)
    planets.forEach(planet => {
        planet.scale.set(1, 1, 1)
      })
    if (intersects.length > 0) {
      const hovered = intersects[0].object;
      hovered.scale.set(1.2, 1.2, 1.2);

      tooltip.innerText = `Name: ${hovered.userData.name}\n Traffic: ${hovered.userData.traffic}\n Categry: ${hovered.userData.category}` || "";
      tooltip.style.display = "block";

      const mouseX = (mouse.x * 0.5 + 0.5) * container.clientWidth;
      const mouseY = (-mouse.y * 0.5 + 0.5) * container.clientHeight;

      tooltip.style.left = mouseX + 10 + "px";
      tooltip.style.top = mouseY + 10 + "px";
    }
    else{
      tooltip.style.display = "none";
    }
    
    stars.rotation.y += 0.0002;
    Object.values(orbits).forEach((orbit) => {
      orbit.rotation.y += 0.005;
    });
   wormholes.forEach(w => {

  const start = new THREE.Vector3()
  const end = new THREE.Vector3()

  w.source.getWorldPosition(start)
  w.target.getWorldPosition(end)

  const mid = start.clone().add(end).multiplyScalar(0.5)

  const direction = new THREE.Vector3().subVectors(end, start)

  const perpendicular = new THREE.Vector3(
    -direction.z,
    direction.y,
    direction.x
  ).normalize()

  const distance = start.distanceTo(end)

  mid.add(perpendicular.multiplyScalar(distance * 0.25))

  const curve = new THREE.QuadraticBezierCurve3(start, mid, end)

  const points = curve.getPoints(40)
  updatePackage(w.packet, curve)
  w.line.geometry.dispose()
  w.line.geometry = new THREE.BufferGeometry().setFromPoints(points)
    w.line.computeLineDistances()
    const material = w.line.material as THREE.LineDashedMaterial
    material.opacity = 0.5 + Math.sin(time) * 0.1
    material.scale += 0.01
})
  packets.forEach(p => {
    if (!p.source || !p.target) return
    p.progress += 0.02
    
    if (p.progress > 1) p.progress = 0


    const position = p.curve.getPoint(p.progress)

    p.mesh.position.copy(position)

  })
    let targetPosition = new THREE.Vector3()
    let desiredPosition = new THREE.Vector3()
    if (cameraTarget) {

      targetPosition = new THREE.Vector3()
      cameraTarget.getWorldPosition(targetPosition)

      desiredPosition = targetPosition.clone().add(new THREE.Vector3(0, 10, 30))

      camera.position.lerp(desiredPosition, 0.05)
      controls.target.lerp(targetPosition, 0.05)
      
    }
    if (camera.position.distanceTo(desiredPosition) < 1) {
      cameraTarget = null
    }
    controls.update();
    renderer.render(scene, camera);
  }

  animate();
  function createStars() {
  const starCount = 1000
  const positions = new Float32Array(starCount * 3)

  for (let i = 0; i < starCount * 3; i++) {
    positions[i] = (Math.random() - 0.5) * 2000
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute(
    'position',
    new THREE.BufferAttribute(positions, 3)
  )

  const material = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 1,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.8,
  })

  stars = new THREE.Points(geometry, material)
  scene.add(stars)
}
  function createPlanet(orbit: string, type: string) {
       let site = undefined
    if (type === "sun") {
        site = sitesData.suns.find(p => p.id === orbit) || { x: 0, y: 0, z: 0, id: "", link: "", traffic: 0, category: "" }
        return createPlanetFromData(site, "sun")
    }
    else {
        site = sitesData.planets.find(p => p.orbits === orbit) || { x: 0, y: 0, z: 0, id: "", link: "", traffic: 0, category: "" }
        return createPlanetFromData(site, "planet")
    }
}
  function createOrbit(distance: number, name: string) {
    let index = 0;

    const sun = sitesData.suns.find(s => s.id === name) || { x: 0, y: 0, z: 0, id: name, link: "", traffic: 0, category: "" }
    const orbit = new THREE.Object3D()
    orbit.rotation.x = Math.random() * Math.PI
    orbit.rotation.z = Math.random() * Math.PI
    const star = createStar(sun.id)
    star.add(orbit)

    const orbiters = sitesData.planets.filter(p => p.orbits === sun.id)

    orbiters.forEach((site) => {

      const planet = createPlanetFromData(site, "planet")
      const angle = Math.random() * Math.PI * 2
      const orbitDistance = distance + (index++ * orbitOffset[sun.id || ""] || 0)
      planet.position.set(Math.cos(angle) * orbitDistance, 0, Math.sin(angle) * orbitDistance)
      orbit.add(planet)
    })
    

    return star
  }

  
  function createEdges() {
    
    sitesData.wormholes.forEach((edge) => {
    const sourcePlanet = planetMap[edge.source];
    const targetPlanet = planetMap[edge.target];
    if(!sourcePlanet || !targetPlanet) return;
    
    const start = sourcePlanet.getWorldPosition(new THREE.Vector3)
    const end = targetPlanet.getWorldPosition(new THREE.Vector3)
    const distance = start.distanceTo(end)
    
    const mid = start.clone().add(end).multiplyScalar(0.5)

   const direction = new THREE.Vector3().subVectors(end, start)
    const perpendicular = new THREE.Vector3(
      -direction.z,
      direction.y,
      direction.x
    ).normalize()

    const curveStrength = distance * 0.3

    mid.add(perpendicular.multiplyScalar(curveStrength))

    const curve = new THREE.QuadraticBezierCurve3(
      start,
      mid,
      end
    )

    const points = curve.getPoints(40)
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const color =  new THREE.Color().setHSL(Math.random(), 1, 0.6)
    const material = new THREE.LineDashedMaterial({ 
      color: color,
      dashSize: 2,
      gapSize: 1,
      scale: 1,
      transparent: true, 
      opacity: 0.5 });
    const packet = createPackage(sourcePlanet,targetPlanet, color, curve)    
    const line = new THREE.Line(geometry, material);
    line.computeLineDistances();
    wormholes.push({ line, source: sourcePlanet, target: targetPlanet, packet: packet });
    scene.add(line);
  });
}
  function createStar(name: string) {
    const sun = sitesData.suns.find(s => s.id === name) || { x: 0, y: 0, z: 0, id: name, link: "", traffic: 0, category: "" }
    const star = createPlanet(name, "sun")
    const scale = 10
    star.position.set(
      sun.x * scale,
      sun.y * scale,
      sun.z * scale
    )
    scene.add(star)
    return star
  }
  function createPlanetFromData(site: any, type: string) {
    const colorMap: { [key: string]: number } = {
        tech: 0x0000ff,
        media: 0xff8000,
        social: 0xff0000,
        gaming: 0x00ff00,
    };

    const size = type === "sun" ? 5 : site.traffic / 100;
    const geometry = new THREE.SphereGeometry(size, 32, 32);
    const material = new THREE.MeshBasicMaterial({ 
        color: colorMap[site.category] || (type === "sun" ? 0xffcc33 : 0x00ff00) 
    });
    const planet = new THREE.Mesh(geometry, material);
    planet.userData = { 
        name: site.id, 
        url: site.link, 
        traffic: site.traffic, 
        category: site.category,
        type: type
    };
    planetMap[site.id] = planet;
    planets.push(planet);
    return planet;
  }
  function createPackage(sourcePlanet: THREE.Object3D, targetPlanet: THREE.Object3D, color:THREE.Color , curve: THREE.QuadraticBezierCurve3)
  {
    const packetGeometry = new THREE.SphereGeometry(0.2, 8, 8)
    const packetMaterial = new THREE.MeshBasicMaterial({ color: color })

    const packet = new THREE.Mesh(packetGeometry, packetMaterial)

    scene.add(packet)

    packets.push({
      mesh: packet,
      source: sourcePlanet,
      target: targetPlanet,
      curve: curve,
      progress: Math.random()
    })
    return packet
  }
  function updatePackage(packet: THREE.Mesh, curve: THREE.QuadraticBezierCurve3)
  {
    packets.forEach (p =>{
    if (p.mesh === packet)
      {
      p.curve = curve
    }
  })
  }
}