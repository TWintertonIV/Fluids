uniform sampler2D uParticlesTexture;

attribute vec2 aParticlesUv;

varying vec3 vPos;
void main(){
    vec4 particle = texture(uParticlesTexture, aParticlesUv);
    vec4 modelPosition = modelMatrix * vec4(particle.xyz, 1.0);
    vec4 viewPosition = viewMatrix * modelPosition;
    vec4 projectedPosition = projectionMatrix * viewPosition;
    gl_Position = projectedPosition;

    

    gl_PointSize = 20.0;
    vPos = position;
}