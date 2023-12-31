import * as THREE from 'three'
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';

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
    
    scene.add(new THREE.AmbientLight(0x404040)) 
    
    const loader = new OBJLoader()
    loader.load('lens_objects_large.obj',
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
    
    document.body.appendChild(renderer.domElement)
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
