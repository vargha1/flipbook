import './style.css'
import * as T from "three"
import gsap from "gsap";
import { OrbitControls, TextGeometry, FontLoader } from "three/examples/jsm/Addons.js";
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';;
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { TextureLoader } from "three";
import { DRACOLoader } from 'three/examples/jsm/Addons.js';

const scene = new T.Scene();
const camera = new T.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000)
const loader = new GLTFLoader().setPath("./model/");
const renderer = new T.WebGLRenderer({ antialias: true, alpha: true });
const draco = new DRACOLoader()
draco.setDecoderPath('/examples/jsm/libs/draco/');
loader.setDRACOLoader(draco)

renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
// renderer.toneMapping = T.CineonToneMapping
// renderer.toneMappingExposure = 1.5
// renderer.outputColorSpace = T.SRGBColorSpace
renderer.domElement.classList.add("absolute")

var click = new Audio('Sounds/click.mp3');
var whoosh = new Audio("Sounds/whoosh.mp3")
var ding = new Audio("Sounds/ding.mp3")
const audio = document.querySelector("audio");
const darkMaterial = new T.MeshBasicMaterial({ color: 'black' });
const materials = {};

camera.position.set(-120, 150, 70)

let elem = document.createElement('div');
elem.className = "flex absolute h-[100dvh] items-center justify-center md:left-[20%] md:right-[20%] left-0 right-0"
elem.id = "wrapper"
elem.innerHTML = `
    <div
      class="flex md:flex-row flex-col relative bg-[#1d1f39] z-[26] h-fit rounded-[20px] flex-wrap transition-all duration-300"
      id="popframe">
        <button
          class="text-[40px] text-white hover:text-violet-600" onclick="start()">
          Start</button>
    </div>
    `
document.getElementById("startSection").appendChild(elem)

document.addEventListener("DOMContentLoaded", () => {
    window.start = () => {
        event.preventDefault();
        document.querySelector("#startSection").classList.add("hidden")
        gsap.to(camera.position, {
            x: 180,
            y: 8,
            z: 140,
            duration: 6,
            ease: "expo.inOut",
            onStart: () => controls.enabled = false,
            onComplete: () => controls.enabled = true,
        },)
        gsap.to(controls.target, {
            x: 0,
            y: 13,
            z: 0,
            duration: 5,
            ease: "expo.inOut",
            onStart: () => controls.enabled = false,
            onComplete: () => controls.enabled = true,
            onUpdate: function () {
                controls.update()
            }
        })
        document.getElementById("canvasHolder").appendChild(renderer.domElement);
    }
})

let mixer, clock;
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

loader.load("pmp_fourniture__sam.glb", function (gltf) {
    var mesh = gltf.scene;
    mesh.scale.set(75, 75, 75)
    mixer = new T.AnimationMixer(mesh);
    gltf.animations.forEach((clip) => {
        mixer.clipAction(clip).play();
    });
    clock = new T.Clock()
    animate()
    scene.add(mesh)
    loading()
})

const BLOOM_SCENE = 1;
const bloomLayer = new T.Layers();
bloomLayer.set(BLOOM_SCENE);

const renderScene = new RenderPass(scene, camera);
const outputPass = new OutputPass();

const bloomPass = new UnrealBloomPass(new T.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
bloomPass.threshold = 0
bloomPass.strength = 0.5
bloomPass.radius = 0.2

const bloomComposer = new EffectComposer(renderer);
bloomComposer.renderToScreen = false;
bloomComposer.addPass(renderScene);
bloomComposer.addPass(bloomPass);

const mixPass = new ShaderPass(
    new T.ShaderMaterial({
        uniforms: {
            baseTexture: { value: null },
            bloomTexture: { value: bloomComposer.renderTarget2.texture }
        },
        vertexShader: document.getElementById('vertexshader').textContent,
        fragmentShader: document.getElementById('fragmentshader').textContent,
    }), 'baseTexture'
);
mixPass.needsSwap = true;

const finalComposer = new EffectComposer(renderer);
finalComposer.addPass(renderScene);
finalComposer.addPass(mixPass);
finalComposer.addPass(outputPass);

const controls = new OrbitControls(camera, renderer.domElement)
controls.enablePan = false
controls.minPolarAngle = 1;
controls.maxPolarAngle = 1.5;
controls.minDistance = 0;
controls.maxDistance = 2400;
controls.rotateSpeed = 0.5;
controls.update()
scene.add(new T.AmbientLight(0xffffff, 4))
// const splH = new T.SpotLightHelper(spl)
// scene.add(splH)
const dl = new T.DirectionalLight(0xffffff, 0.75)
camera.add(dl)
scene.add(camera)

const raycaster = new T.Raycaster()

window.addEventListener('pointerdown', onMouseDown)

function onMouseDown(event) {
    camera.updateProjectionMatrix()
    controls.update()
    const coords = new T.Vector2(
        (event.clientX / renderer.domElement.clientWidth) * 2 - 1,
        -((event.clientY / renderer.domElement.clientHeight) * 2 - 1),
    )
    raycaster.setFromCamera(coords, camera)

    let intersections = raycaster.intersectObjects(scene.children, true);
    if (intersections.length > 0) {
        // intersections[0].object.layers.toggle(BLOOM_SCENE)
    }
}

function darkenNonBloomed(obj) {
    if (obj.isMesh && bloomLayer.test(obj.layers) === false) {
        materials[obj.uuid] = obj.material;
        obj.material = darkMaterial;
    }
}

function restoreMaterial(obj) {
    if (materials[obj.uuid]) {
        obj.material = materials[obj.uuid];
        delete materials[obj.uuid];
    }
}

document.getElementById("loadingScreen").classList.add("z-[20]");
document.getElementById("loadingScreen").innerHTML = `<img src="images/loading.gif" class="w-auto h-[200px]">`
function loading() {
    document.getElementById("loadingScreen").classList.add("hidden")
}

// function addStars() {
//   const geometry = new T.SphereGeometry(0.3, 0.3, 0.3);
//   const mat = new T.MeshStandardMaterial({ color: 0xffffff })
//   const starsMesh = new T.Mesh(geometry, mat)
//   starsMesh.name = "star1";

//   const [x, z] = Array(2).fill().map(() => T.MathUtils.randFloatSpread(450))
//   const [y] = Array(1).fill().map(() => T.MathUtils.randFloatSpread(200))

//   starsMesh.position.set(x, 200 + y, z);
//   scene.add(starsMesh);
// }

// Array(1000).fill().forEach(addStars)

// scene.traverseVisible(obj => {
//   if (obj.name == "star1") {
//     const [y] = Array(1).fill().map(() => T.MathUtils.randFloatSpread(200))
//     obj.position.y = 200 + y
//     setTimeout(() => {
//       // gsap.to(obj.position, {
//       //   y: 3,
//       //   duration: 6,
//       //   yoyo: true
//       // })
//     }, 100)
//   }
// })

function animate() {
    requestAnimationFrame(animate);
    mixer.update(clock.getDelta());
    var elapsedTime = clock.getElapsedTime();

    // Define the rotation speed
    var rotationSpeed = 0.5; // Radians per second

    // Calculate the rotation angles for each axis
    var angle = rotationSpeed * elapsedTime;
    // console.log(camera.position);

    scene.traverse(obj => {
        if (obj.name == "polySurface26Shape") {
            obj.material.color.setHex("0x" + document.getElementById("color").value.slice(1))
            obj.material.blendColor.setHex("0x" + document.getElementById("color").value.slice(1))
            obj.material.map = null

        }
    })
    controls.update();

    scene.traverse(darkenNonBloomed);
    bloomComposer.render();
    scene.traverse(restoreMaterial);
    finalComposer.render();
    // camera.updateProjectionMatrix()
}