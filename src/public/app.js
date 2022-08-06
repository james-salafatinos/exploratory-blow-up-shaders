//External Libraries
import * as THREE from "/modules/three.module.js";
import Stats from "/modules/stats.module.js";
import { Octree } from "/modules/Octree.js";

import { EffectComposer } from '/modules/EffectComposer.js';
import { ShaderPass } from '/modules/ShaderPass.js';
import { RenderPass } from '/modules/RenderPass.js';
import { UnrealBloomPass } from '/modules/UnrealBloomPass.js';

import { HexGridMaterial } from "/shaders/HexGridMaterial.js";
import { HexDissolveMaterial } from "/shaders/HexDissolveMaterial.js";
import { CellularNoiseMaterial } from "/shaders/CellularNoiseMaterial.js";
import { FBMDissolveMaterial } from "/shaders/FBMDissolveMaterial.js";

// import Delaunator from "https://cdn.skypack.dev/delaunator@5.0.0";

//Internal Libraries
import { NoClipControls } from "/utils/NoClipControls.js";
import { PhysicsObject } from "/utils/PhysicsObject.js";
import { DelaunayGenerator } from "/utils/DelaunayGenerator.js";
import { ProjectileGenerator } from "/utils/ProjectileGenerator.js";
import { LineGenerator } from "/utils/LineGenerator.js";
//THREE JS
let camera, scene, renderer, controls;
let stats;
//Required for NOCLIPCONTROLS
let prevTime = performance.now();
let physicsObjects = [];
let frameIndex = 0;

//Delaunay Generator
let DG;
//Projectile Generator
let PG;
//Line Generator
let LG;


let time = performance.now();

//Octree Terrain
let worldOctree;
let octreeObjects = new THREE.Group();

//Shader explanation
let TEST_SPHERE;

let NUM_DESTROYABLE_MESHES = 15
let destroyable_meshes = []
let progressUpdateValue = 1
let destroyable_meshes_collided = Array(NUM_DESTROYABLE_MESHES).fill(0)

init();
animate();

function init() {
  //##############################################################################
  //THREE JS BOILERPLATE
  //##############################################################################
  let createScene = function () {
    scene = new THREE.Scene();
    var loader = new THREE.TextureLoader(),
      texture = loader.load("/static/nightsky2.jpg");
    scene.background = texture;
    scene.fog = new THREE.Fog(0x102234, 700, 1000);
  };
  createScene();

  let createLights = function () {
    // LIGHTS
    const light = new THREE.HemisphereLight(0xeeeeff, 0x777788, 0.75);
    light.position.set(0.5, 1, 0.75);
    scene.add(light);
  };
  createLights();

  let createStats = function () {
    stats = new Stats();
    container.appendChild(stats.dom);
  };
  createStats();

  let createRenderer = function () {
    //Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    
  };
  createRenderer();

  let createCamera = function () {
    //Camera
    camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      1,
      1000
    );
    camera.position.y = 30;
    camera.position.z = 150;
    camera.position.x = 10;
    camera.layers.enable(1);
  };
  createCamera();

  //##############################################################################
  //Octree Setup
  //##############################################################################

  worldOctree = new Octree();

  //##############################################################################
  //Environment Controls
  //##############################################################################

  //NO CLIP CONTROLS
  controls = new NoClipControls(window, camera, document);

  //##############################################################################
  //Create Static Objects
  //##############################################################################

  let addTestSphere = function () {
    let geometry = new THREE.SphereGeometry(10, 10, 10)
    let material = new FBMDissolveMaterial();
    material.color = new THREE.Color(0x334466);
    material.edgeColor = new THREE.Color(0x88ff77);
    material.progress = 1;
    material.tiles = 2;
    material.edgeWeight = 0.2;
    let mesh = new THREE.Mesh(geometry, material)
    mesh.position.set(camera.position.x, camera.position.y - 10, camera.position.z - 20)
    TEST_SPHERE = mesh
    
    return mesh

  }
  for (let i = 0; i < NUM_DESTROYABLE_MESHES; i++) {
    let m = addTestSphere();
    m.position.set(Math.random()*500, 25, Math.random()*500)
    destroyable_meshes.push(m);
    scene.add(m)
  }


 



  let createPlane = function () {
    let mat = new THREE.MeshPhongMaterial({
      wireframe: false,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      color: new THREE.Color(0x6a7699),
      opacity: 0.2,
    });
    let geo = new THREE.PlaneBufferGeometry(600, 600);
    let mesh = new THREE.Mesh(geo, mat);
    mesh.position.x = 0;
    mesh.position.y = -15;
    mesh.position.z = 0;
    mesh.rotation.x = Math.PI / 2;
    scene.add(mesh);
  };
  createPlane();

  let createStars = function () {
    let M = 28;
    let N = 28;
    let vertices = [];
    for (let x = -M; x <= M; x += 1) {
      for (let z = -N; z <= N; z += 1) {
        // vertices.push(x / scaler, 0 / scaler, z / scaler)
        vertices.push(
          THREE.MathUtils.randFloatSpread(2000),
          THREE.MathUtils.randFloatSpread(2000),
          THREE.MathUtils.randFloatSpread(2000)
        );
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(vertices, 3)
    );
    let material = new THREE.PointsMaterial({
      size: 0.7,
      sizeAttenuation: true,
      alphaTest: 0.2,
      transparent: true,
    });
    material.color.setHSL(0.6, 0.8, 0.9);
    const particles = new THREE.Points(geometry, material);
    scene.add(particles);
  };
  createStars();

  //Large Star
  let p0 = new PhysicsObject(10000, 0, 250, 0, 0, 0, 0, 0, 1);
  p0.isStationary = true;
  p0.density = 200;


  //Black Hole
  physicsObjects.push(p0);
  p0.Sphere()
  p0.mesh.material = new CellularNoiseMaterial();
  p0.mesh.material.transparent = true;
  p0.mesh.material.grid = 8;
  p0.mesh.material.speed = 2.0;
  p0.mesh.material.divisionScaleX = 2.0;

  scene.add(p0.mesh);

  //PhysicsObject creation loop
  for (let i = 0; i < 20; i++) {
    let radius = 80;
    let x_offset = 0;
    let y_offset = 250;
    let z_offset = 125;
    let px = x_offset + (2 * Math.random() - 1) * radius;
    let py = y_offset + (2 * Math.random() - 1) * radius;
    let pz = z_offset + (2 * Math.random() - 1) * radius;
    let physicsObject = new PhysicsObject(
      5 + (3 * Math.random() - 1) * 7,
      px,
      py,
      pz,
      2,
      0.08,
      0,
      0,
      1
    );

    physicsObjects.push(physicsObject);
    scene.add(physicsObject.Sphere());
  }
  //##############################################################################
  //Delauney Triangulation
  //##############################################################################

  DG = new DelaunayGenerator(scene);
  console.log(DG);
  DG.createPoints();
  DG.calculate();

  let terrain = scene
    .getObjectByProperty("uuid", DG.lastUUIDMesh_Texture)
    .clone();
  octreeObjects.add(terrain);
  worldOctree.fromGraphNode(octreeObjects);
  //##############################################################################
  //Projectiles
  //##############################################################################

  PG = new ProjectileGenerator(scene, camera, window, worldOctree);
  console.log(PG);

  LG = new LineGenerator(scene);
  LG.createLines()
  console.log(LG);




}



function secondsLerpDown(seconds) {
  progressUpdateValue -= 0.01 * seconds
  return progressUpdateValue
}
function animate() {
  //Frame Start up
  requestAnimationFrame(animate);

  //Force Application
  if (frameIndex % 1 == 0) {
    for (let i = 0; i < physicsObjects.length; i++) {
      for (let j = 0; j < physicsObjects.length; j++) {
        if (i !== j) {
          let f = physicsObjects[i].attract(physicsObjects[j]);
          physicsObjects[i].applyForce(f);
          physicsObjects[i].updatePhysics();
          physicsObjects[i].updateGeometry();
        }
      }
    }
  }

  if (frameIndex % 100 == 0) {
    // DG.update();
  }

  if (frameIndex % 1 == 0) {
    PG.update();
  }

  if (frameIndex % 500 == 0) {
    // console.log("Resetting Terrain Collisions via Octree");
    // let terrain = scene
    //   .getObjectByProperty("uuid", DG.lastUUIDMesh_Texture)
    //   .clone();
    // octreeObjects = new THREE.Group();
    // octreeObjects.add(terrain);
    // worldOctree.fromGraphNode(octreeObjects);
  }

  if (frameIndex % 1 == 0) {
    //Projectile and destroyable mesh Collisions update
    for (let i = 0; i < PG.spheres.length ; i++) {
      let p1, p2
      p1 = PG.spheres[i].mesh.position
      for (let i = 0; i < NUM_DESTROYABLE_MESHES ; i++) {
        p2 = destroyable_meshes[i].position
        if (p1.distanceTo(p2) < 15){
          console.log("collision")
          //destroyable_meshes[i].material.progress = secondsLerpDown(3)
          destroyable_meshes_collided[i] = 1
        }
      }
      
    }
  }

  //Check collisions flag loop, and update shader progress
  if (frameIndex % 1 == 0) {
      for (let i = 0; i < NUM_DESTROYABLE_MESHES ; i++) {
        if (destroyable_meshes_collided[i] == 1){
          destroyable_meshes[i].material.progress -= 0.01
        }
      }
    }
  

  
  time = performance.now();
  controls.update(time, prevTime);




  renderer.render(scene, camera);





  stats.update();
  frameIndex += 1;

  //Frame Shut Down
  prevTime = time;
}
