'use strict';

// Reference: https://www.pentacreation.com/blog/2019/10/191021.html

import * as THREE from './lib/three.module.js';
import { OrbitControls } from './lib/OrbitControls.js'
import { FresnelShader } from './lib/FresnelShader.js';
import { Water } from './lib/Water.js';
import { Sky } from './lib/Sky.js';

const waterTexturePath = '/assets/textures/water.jpg';
const umiRadius = 6;

window.onload = function main() {
    let scene, camera, renderer;
    let controls;
    let water;
    let umi;
    let cubeRenderTarget, cubeCamera;

    init();
    animate();

    function init() {
        scene = new THREE.Scene();

        let cvs = document.querySelector('#render');

        camera = new THREE.PerspectiveCamera(60, cvs.width / cvs.height, 0.1, 10000);
        camera.position.set(0, 7, 25);
        
        renderer = new THREE.WebGLRenderer({canvas: cvs, antialias: true});
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(cvs.width, cvs.height);
        renderer.physicallyCorrectLights = true;

        cubeRenderTarget = new THREE.WebGLCubeRenderTarget(512, {
            format: THREE.RGBAFormat,
            generateMipmaps: true,
            minFilter: THREE.LinearMipmapLinearFilter
        });
        cubeCamera = new THREE.CubeCamera(100, 7000, cubeRenderTarget);
        scene.add(cubeCamera);

        initOcean(); 
        initSky();

        setControls();
        setLight();

        let geometry = new THREE.SphereGeometry(umiRadius, 36, 24);
        
        let shader = FresnelShader;
        let uniforms = THREE.UniformsUtils.clone(shader.uniforms);
        cubeCamera.update(renderer, scene);
        uniforms['tCube'].value = cubeRenderTarget.texture;
        let material = new THREE.ShaderMaterial({
            uniforms: uniforms,
            vertexShader: shader.vertexShader,
            fragmentShader: shader.fragmentShader,
            blending:THREE.MultiplyBlending,
        });
        umi = new THREE.Mesh(geometry, material);
        umi.position.y = 5;
        scene.add(umi);
    }

    function initOcean() {
        const waterGeometry = new THREE.PlaneBufferGeometry(1000, 1000);
        water = new Water(
            waterGeometry,
            {
                textureWidth: 512,
                textureHeight: 512,
                waterNormals: new THREE.TextureLoader().load(waterTexturePath, function(texture) {
                    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
                }),
                alpha: 0.6,
                waterColor: 0x3e89ce,
                distortionScale: 3.7,
                fog: scene.fog !== undefined
            }
        );
        water.rotation.x = -Math.PI / 2;
        water.position.y = -5;
        scene.add(water);
    }

    function initSky() {
        const sky = new Sky();
        const sky_uniforms = sky.material.uniforms;
        sky_uniforms['turbidity'].value = 10;
        sky_uniforms['rayleigh'].value = 2;
        sky_uniforms['luminance'].value = 1;
        sky_uniforms['mieCoefficient'].value = 0.005;
        sky_uniforms['mieDirectionalG'].value = 0.8;
        sky.scale.setScalar(450000);
        scene.add(sky);

        const sunSphere = new THREE.Mesh(
            new THREE.SphereBufferGeometry(200,16,8),
            new THREE.MeshBasicMaterial({color:0xFFFFFF})
        );
     
        const sun_uniforms = sky.material.uniforms;
        sun_uniforms['turbidity'].value = 10;
        sun_uniforms['rayleigh'].value = 0.3;
        sun_uniforms['mieCoefficient'].value = 0.005;
        sun_uniforms['mieDirectionalG'].value = 0.8;
        sun_uniforms['luminance'].value = 0.8;
     
        const theta = Math.PI * (-0.2);
        const phi = 2 * Math.PI * (-0.25);
        const distance = 4000;
        sunSphere.position.x = distance * Math.cos(phi);
        sunSphere.position.y = distance * Math.sin(phi) * Math.sin(theta);
        sunSphere.position.z = distance * Math.sin(phi) * Math.cos(theta);
        sunSphere.visible = true;
        sun_uniforms['sunPosition'].value.copy(sunSphere.position);
    }

    function render() {
        if (controls) {
            controls.update();
        }

        const time = performance.now() * 0.0005;

        const k = 1.5;

        for (let j = 0; j < umi.geometry.vertices.length; j++) {
            const p = umi.geometry.vertices[j];
            p.normalize().multiplyScalar(umiRadius + 0.4 * noise.perlin3(p.x * k + time, p.y * k, p.z * k));
        }
        umi.geometry.computeVertexNormals();
        umi.geometry.verticesNeedUpdate = true;
        umi.geometry.normalsNeedUpdate = true;

        water.material.uniforms['time'].value += 1.0 / 240.0;
        updateCubeTexture();
        renderer.render(scene, camera);
    }

    function updateCubeTexture() {
        umi.visible = false;
        cubeCamera.position.copy(umi.position);
        cubeCamera.update(renderer, scene);
        umi.material.uniforms['tCube'].value = cubeRenderTarget.texture;
        umi.visible = true;
    }

    function animate() {
        requestAnimationFrame(animate);
        render();
    }

    function setLight() {
        const ambientLight = new THREE.AmbientLight(0xFFFFFF);
        scene.add(ambientLight);
    }

    function setControls() {
        controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.5;
        controls.minDistance = 5.0;
        controls.maxDistance = 25.0;
    }

    function loadSkyBox(name) {
        let path = 'assets/skybox/' + name + '/';
        let format = '.jpg';
        let urls = [
            path + 'posx' + format, path + 'negx' + format,
            path + 'posy' + format, path + 'negy' + format,
            path + 'posz' + format, path + 'negz' + format
        ];
        let textureCube = new THREE.CubeTextureLoader().load(urls);
        return textureCube;
    }
}
