#define EPSILON 0.0000001
uniform float uDeltaTime;
uniform float uGravity;
uniform vec3 uBounds;
uniform int uCount;

float damping = .1;


vec4 resolveVelocity(vec4 particle, vec4 velocity);


void main() {
    vec2 uv = gl_FragCoord.xy / resolution;

    vec4 particle = texture2D(uParticles, uv);
    vec4 velocity = texture2D(uVelocities, uv);
    vec4 pressure = texture2D(uPressures, uv);
    vec4 density = texture2D(uDensities, uv);
    float densityValue = max(density.x, EPSILON);

    vec3 pressureAcceleration = pressure.xyz / densityValue;

    velocity.xyz += pressureAcceleration * uDeltaTime;
    velocity.xyz += vec3(0.0, uGravity, 0.0) * uDeltaTime;
    velocity = resolveVelocity(particle, velocity);
    gl_FragColor = velocity;
}



vec4 resolveVelocity(vec4 particle, vec4 velocity){
    vec3 halfBoundsSize = uBounds / 2.0;
    if(abs(particle.x) >= halfBoundsSize.x){
        if(sign(velocity.x) == sign(particle.x)){
            velocity.x *= -1.0 * damping;
        }
        
    }
    if(abs(particle.y) >= halfBoundsSize.y){
        if(sign(velocity.y) == sign(particle.y)){
            velocity.y *= -1.0 * damping;
        }
    }
    if(abs(particle.z) >= halfBoundsSize.z){
        if(sign(velocity.z) == sign(particle.z)){
            velocity.z *= -1.0 * damping;
        }
    }

    return velocity;
}


