import * as THREE from 'https://unpkg.com/three@v0.160.0/build/three.module.js'
import { OBJLoader } from 'https://unpkg.com/three@0.160.0/examples/jsm/loaders/OBJLoader.js';

let scene
let camera
let renderer
let mesh

function init() {
    scene = new THREE.Scene()
  
    camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000)
    camera.position.z = 100
    
    renderer = new THREE.WebGLRenderer()
    renderer.setSize(window.innerWidth, window.innerHeight)
    const sceneContainer = document.getElementById('scene-container');
    scene.add(new THREE.AmbientLight(0x404040)) 
    
    const loader = new OBJLoader()
    loader.load('https://harshimoda.github.io/harshi_trial_glb.glb',
                (obj) => {
                      let material = new THREE.PointsMaterial({ color:  0xC5784B, size: 0.80 })
                      mesh = new THREE.Points(obj.children[0].geometry, material)
                      mesh.position.y = 10
                      scene.add(mesh)
                      
                  },
                (xhr) => {
                    console.log(xhr)
                },
                (err) => {
                    console.error("loading .obj went wrong, ", err)
                  }
               )
    
    sceneContainer.appendChild(renderer.domElement)
    animationLoop()
}

function animationLoop() {
    renderer.render(scene, camera)
    if(mesh) {
      mesh.rotation.y += 0.004
    }
    requestAnimationFrame(animationLoop)
  }
  
// [previous functions...]
window.addEventListener('load', init)
