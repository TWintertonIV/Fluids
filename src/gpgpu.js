import gpgpuParticlesShader from './shaders/gpgpu/particles.glsl'
import gpgpuVelocitiesShader from './shaders/gpgpu/velocities.glsl'
import gpgpuDensitiesShader from './shaders/gpgpu/densities.glsl'
import gpgpuPressuresShader from './shaders/gpgpu/pressures.glsl'
import gpgpuPredictedShader from './shaders/gpgpu/predicted.glsl'
import { GPUComputationRenderer } from 'three/addons/misc/GPUComputationRenderer.js'
import * as THREE from 'three'
import { parameters } from './globals.js'

const gpgpu = {
    positions: null,
    velocities: null,
    densities: null,
    pressures: null
}

const gpgpuInit = (deltaTime, geometry, renderer) => {
    gpgpu.size = Math.pow(2, Math.ceil(Math.log2(Math.sqrt(parameters.count))));
    gpgpu.computation = new GPUComputationRenderer(gpgpu.size, gpgpu.size, renderer)
    gpgpu.positionsTexture = gpgpu.computation.createTexture()
    gpgpu.predictedTexture = gpgpu.computation.createTexture()
    gpgpu.velocityTexture = gpgpu.computation.createTexture()
    gpgpu.densityTexture = gpgpu.computation.createTexture()
    gpgpu.pressureTexture = gpgpu.computation.createTexture()

    for(let i = 0; i < parameters.count; i++) {
        const i3 = i * 3;
        const i4 = i * 4;

        gpgpu.positionsTexture.image.data[i4 + 0] = geometry.attributes.position.array[i3 + 0]
        gpgpu.positionsTexture.image.data[i4 + 1] = geometry.attributes.position.array[i3 + 1]
        gpgpu.positionsTexture.image.data[i4 + 2] = geometry.attributes.position.array[i3 + 2]
        gpgpu.positionsTexture.image.data[i4 + 3] = 0

        gpgpu.velocityTexture.image.data[i4 + 0] = 0;
        gpgpu.velocityTexture.image.data[i4 + 1] = 0;
        gpgpu.velocityTexture.image.data[i4 + 2] = 0;
        gpgpu.velocityTexture.image.data[i4 + 3] = 0;

        gpgpu.densityTexture.image.data[i4 + 0] = 0;
        gpgpu.densityTexture.image.data[i4 + 1] = 0;
        gpgpu.densityTexture.image.data[i4 + 2] = 0;
        gpgpu.densityTexture.image.data[i4 + 3] = 0;

        gpgpu.pressureTexture.image.data[i4 + 0] = 0;
        gpgpu.pressureTexture.image.data[i4 + 1] = 0;
        gpgpu.pressureTexture.image.data[i4 + 2] = 0;
        gpgpu.pressureTexture.image.data[i4 + 3] = 0;

        gpgpu.predictedTexture.image.data[i4 + 0] = 0;
        gpgpu.predictedTexture.image.data[i4 + 1] = 0;
        gpgpu.predictedTexture.image.data[i4 + 2] = 0;
        gpgpu.predictedTexture.image.data[i4 + 3] = 0;
        
    }

    gpgpu.particlesVariable = gpgpu.computation.addVariable('uParticles', gpgpuParticlesShader, gpgpu.positionsTexture);
    gpgpu.velocitiesVariable = gpgpu.computation.addVariable('uVelocities', gpgpuVelocitiesShader, gpgpu.velocityTexture);
    gpgpu.densityVariable = gpgpu.computation.addVariable('uDensities', gpgpuDensitiesShader, gpgpu.densityTexture);
    gpgpu.pressureVariable = gpgpu.computation.addVariable('uPressures', gpgpuPressuresShader, gpgpu.pressureTexture);
    gpgpu.predictedVariable = gpgpu.computation.addVariable('uPredicted', gpgpuPredictedShader, gpgpu.predictedTexture);

    gpgpu.computation.setVariableDependencies(gpgpu.particlesVariable, [gpgpu.particlesVariable, gpgpu.velocitiesVariable]);
    gpgpu.computation.setVariableDependencies(gpgpu.velocitiesVariable, [gpgpu.particlesVariable, gpgpu.pressureVariable, gpgpu.densityVariable, gpgpu.velocitiesVariable]);
    gpgpu.computation.setVariableDependencies(gpgpu.densityVariable, [gpgpu.particlesVariable, gpgpu.predictedVariable, gpgpu.densityVariable]);
    gpgpu.computation.setVariableDependencies(gpgpu.pressureVariable, [gpgpu.particlesVariable, gpgpu.predictedVariable, gpgpu.densityVariable, gpgpu.pressureVariable]);
    gpgpu.computation.setVariableDependencies(gpgpu.predictedVariable, [gpgpu.particlesVariable, gpgpu.velocitiesVariable, gpgpu.predictedVariable]);

    gpgpu.particlesVariable.material.uniforms.uDeltaTime = { value: deltaTime };
    gpgpu.particlesVariable.material.uniforms.uGravity = { value: parameters.gravity };
    gpgpu.particlesVariable.material.uniforms.uBounds = { value: parameters.bounds };
    gpgpu.particlesVariable.material.uniforms.resolution = { value: new THREE.Vector2(gpgpu.size, gpgpu.size) };
    gpgpu.particlesVariable.material.uniforms.uCount = { value: parameters.count };

    gpgpu.velocitiesVariable.material.uniforms.uDeltaTime = { value: deltaTime };
    gpgpu.velocitiesVariable.material.uniforms.uGravity = { value: parameters.gravity };
    gpgpu.velocitiesVariable.material.uniforms.uBounds = { value: parameters.bounds };
    gpgpu.velocitiesVariable.material.uniforms.uCount = { value: parameters.count };
    gpgpu.velocitiesVariable.material.uniforms.uDirection = { value: parameters.uDirection };
    gpgpu.velocitiesVariable.material.uniforms.resolution = { value: new THREE.Vector2(gpgpu.size, gpgpu.size) };
    gpgpu.velocitiesVariable.material.uniforms.uMouse = { value: parameters.mouse };
    gpgpu.velocitiesVariable.material.uniforms.uPressed = { value: parameters.pressed };

    gpgpu.densityVariable.material.uniforms.uCount = { value: parameters.count };
    gpgpu.densityVariable.material.uniforms.uSmoothing = { value: parameters.smoothingRadius };
    gpgpu.densityVariable.material.uniforms.resolution = { value: new THREE.Vector2(gpgpu.size, gpgpu.size) };

    gpgpu.pressureVariable.material.uniforms.uSmoothing = { value: parameters.smoothingRadius };
    gpgpu.pressureVariable.material.uniforms.uCount = { value: parameters.count };
    gpgpu.pressureVariable.material.uniforms.uTargetDensity = { value: parameters.targetDensity };
    gpgpu.pressureVariable.material.uniforms.uPressureMultiplier = { value: parameters.pressureMultiplier };
    gpgpu.pressureVariable.material.uniforms.uBounds = { value: parameters.bounds };
    gpgpu.pressureVariable.material.uniforms.resolution = { value: new THREE.Vector2(gpgpu.size, gpgpu.size) };
    gpgpu.pressureVariable.material.uniforms.uDirection = { value: parameters.uDirection };
    gpgpu.pressureVariable.material.uniforms.uGravity = { value: parameters.gravity };
    gpgpu.predictedVariable.material.uniforms.resolution = { value: new THREE.Vector2(gpgpu.size, gpgpu.size) };

    const error = gpgpu.computation.init();

    if ( error !== null ) {
        console.error( error );
    }

    return gpgpu;
}

const positionsGpgpuDebug = () => {
    positionsGeometry = new THREE.PlaneGeometry(3, 3);
    positionsMaterial = new THREE.MeshBasicMaterial({ map: gpgpu.computation.getCurrentRenderTarget(gpgpu.particlesVariable).texture });
    gpgpu.positions = new THREE.Mesh(
        positionsGeometry,
        positionsMaterial
    );

    gpgpu.positions.position.x = 3
    scene.add(gpgpu.positions)
}

const velocitiesGpgpuDebug = () => {
    velocitiesGeometry = new THREE.PlaneGeometry(3, 3);
    velocitiesMaterial = new THREE.MeshBasicMaterial({ map: gpgpu.computation.getCurrentRenderTarget(gpgpu.velocitiesVariable).texture });
    gpgpu.velocities = new THREE.Mesh(
        velocitiesGeometry,
        velocitiesMaterial
    );
    gpgpu.velocities.position.x = -3
    scene.add(gpgpu.velocities)
}

const densitiesGpgpuDebug = () => {
    densitiesGeometry = new THREE.PlaneGeometry(3, 3);
    densitiesMaterial = new THREE.MeshBasicMaterial({ map: gpgpu.computation.getCurrentRenderTarget(gpgpu.densityVariable).texture });
    gpgpu.densities = new THREE.Mesh(
        densitiesGeometry,
        densitiesMaterial
    );
    gpgpu.densities.position.x = 3
    gpgpu.densities.position.y = 3

    scene.add(gpgpu.densities)
}

const pressuresGpgpuDebug = () => {
    pressuresGeometry = new THREE.PlaneGeometry(3, 3);
    pressuresMaterial = new THREE.MeshBasicMaterial({ map: gpgpu.computation.getCurrentRenderTarget(gpgpu.pressureVariable).texture });
    gpgpu.pressures = new THREE.Mesh(
        pressuresGeometry,
        pressuresMaterial
    );
    gpgpu.pressures.position.x = -3
    gpgpu.pressures.position.y = 3

    scene.add(gpgpu.pressures)
}

export { gpgpu, gpgpuInit };