import * as THREE from "https://cdn.skypack.dev/three@0.136.0";
import { OrbitControls } from "https://cdn.skypack.dev/three@0.136.0/examples/jsm/controls/OrbitControls";
import { OBJLoader } from "https://cdn.skypack.dev/three@0.136.0/examples/jsm/loaders/OBJLoader.js";
import { FontLoader } from "https://cdn.skypack.dev/three@0.136.0/examples/jsm/loaders/FontLoader.js";
import { TextGeometry } from "https://cdn.skypack.dev/three@0.136.0/examples/jsm/geometries/TextGeometry.js";

const container = document.getElementById("universe");
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x160016);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight, 1, 1000);
camera.position.set(0, 4, 21);

const renderer = new THREE.WebGLRenderer({antialias: true});
renderer.setSize(window.innerWidth, window.innerHeight);
container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enablePan = false;

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const uniforms = {
  time: { value: 0 }
};

const spacePointsCount = 20000;
const spacePositions = [];
const spaceSizes = [];
const spaceShifts = [];

function pushShift(arr) {
  arr.push(
    Math.random() * Math.PI,
    Math.random() * Math.PI * 2,
    (Math.random() * 0.9 + 0.1) * Math.PI * 0.1,
    Math.random() * 0.9 + 0.1
  );
}

for(let i = 0; i < spacePointsCount; i++) {
  const radius = 12 + Math.random() * 15;
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos((Math.random() * 2) - 1);
  const x = radius * Math.sin(phi) * Math.cos(theta);
  const y = radius * Math.sin(phi) * Math.sin(theta);
  const z = radius * Math.cos(phi);

  spacePositions.push(x, y, z);
  spaceSizes.push(Math.random() * 1.0 + 0.3);
  pushShift(spaceShifts);
}

const spaceGeometry = new THREE.BufferGeometry();
spaceGeometry.setAttribute('position', new THREE.Float32BufferAttribute(spacePositions, 3));
spaceGeometry.setAttribute('sizes', new THREE.Float32BufferAttribute(spaceSizes, 1));
spaceGeometry.setAttribute('shift', new THREE.Float32BufferAttribute(spaceShifts, 4));

const spaceMaterial = new THREE.PointsMaterial({
  size: 0.12,
  transparent: true,
  depthTest: false,
  blending: THREE.AdditiveBlending,
  onBeforeCompile: shader => {
    shader.uniforms.time = uniforms.time;
    shader.vertexShader = `
      uniform float time;
      attribute float sizes;
      attribute vec4 shift;
      varying vec3 vColor;
      ${shader.vertexShader}
    `.replace(
      `gl_PointSize = size;`,
      `gl_PointSize = size * sizes;`
    ).replace(
      `#include <color_vertex>`,
      `#include <color_vertex>
        float d = length(abs(position) / vec3(20., 20., 20));
        d = clamp(d, 0., 1.);
        vColor = mix(vec3(150,150,255), vec3(80,50,120), d) / 255.;`
    ).replace(
      `#include <begin_vertex>`,
      `#include <begin_vertex>
        float t = time;
        float moveT = mod(shift.x + shift.z * t, 6.283185);
        float moveS = mod(shift.y + shift.z * t, 6.283185);
        vec3 offset = vec3(cos(moveS) * sin(moveT), cos(moveT), sin(moveS) * sin(moveT)) * shift.w;
        transformed += offset;
      `
    );
    shader.fragmentShader = `
      varying vec3 vColor;
      ${shader.fragmentShader}
    `.replace(
      `#include <clipping_planes_fragment>`,
      `#include <clipping_planes_fragment>
        float d = length(gl_PointCoord.xy - 0.5);`
    ).replace(
      `vec4 diffuseColor = vec4( diffuse, opacity );`,
      `vec4 diffuseColor = vec4( vColor, smoothstep(0.5, 0.1, d) );`
    );
  }
});

const spacePoints = new THREE.Points(spaceGeometry, spaceMaterial);
scene.add(spacePoints);

let heartMesh = null;
const loader = new OBJLoader();
loader.load('https://assets.codepen.io/127738/heart_2.obj', obj => {
  heartMesh = obj.children[0];
  heartMesh.geometry.rotateX(-Math.PI * 0.5);
  heartMesh.geometry.scale(0.15, 0.15, 0.15);
  heartMesh.geometry.translate(0, -0.4, 0);
  heartMesh.material = new THREE.MeshBasicMaterial({ color: 0xff5555 });

  heartMesh.geometry.attributes.position.originalPosition = heartMesh.geometry.attributes.position.array.slice();

  scene.add(heartMesh);
});

// Thêm chữ "I love you" 3D phía dưới trái tim
const fontLoader = new FontLoader();
fontLoader.load(
  "https://cdn.jsdelivr.net/npm/three@0.136.0/examples/fonts/helvetiker_regular.typeface.json",
  (font) => {
    const textGeometry = new TextGeometry("Yeu em <3", {
      font: font,
      size: 0.5,
      height: 0.1,
      curveSegments: 12,
      bevelEnabled: true,
      bevelThickness: 0.03,
      bevelSize: 0.02,
      bevelOffset: 0,
      bevelSegments: 5
    });

    const textMaterial = new THREE.MeshBasicMaterial({ color: 0xff5555 });
    const textMesh = new THREE.Mesh(textGeometry, textMaterial);

    // Căn chỉnh chữ dưới trái tim (vị trí có thể chỉnh thêm nếu muốn)
    textMesh.position.set(-1.5, -1.5, 0);
    scene.add(textMesh);
  }
);

const clock = new THREE.Clock();
function applyBeatToHeart(time) {
  if (!heartMesh) return;
  const positions = heartMesh.geometry.attributes.position.array;
  const original = heartMesh.geometry.attributes.position.originalPosition;
  for (let i = 0; i < positions.length; i += 3) {
    const scale = 1 + 0.1 * Math.sin(time * 8);
    positions[i] = original[i] * scale;
    positions[i + 1] = original[i + 1] * scale;
    positions[i + 2] = original[i + 2] * scale;
  }
  heartMesh.geometry.attributes.position.needsUpdate = true;
}

function animate() {
  const elapsed = clock.getElapsedTime();
  uniforms.time.value = elapsed * Math.PI;

  spacePoints.rotation.y = -elapsed * 0.03;
  spacePoints.rotation.x = Math.cos(elapsed * 0.3) * 0.02;

  if (heartMesh) {
    heartMesh.rotation.y = elapsed * 0.08;
    heartMesh.rotation.x = Math.sin(elapsed * 0.5) * 0.05;
    applyBeatToHeart(elapsed);
  }

  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

animate();
