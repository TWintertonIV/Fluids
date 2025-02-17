#define EPSILON 0.000001
uniform float uDeltaTime;
uniform float uGravity;
uniform vec3 uBounds;
uniform int uCount;
uniform vec2 uDirection;
uniform float uPressed;
uniform vec2 uMouse;
float damping = .80;
float friction = .99;
vec4 resolveVelocity(vec4 particle, vec4 velocity);

void main() {
    vec2 uv = gl_FragCoord.xy / resolution;

    vec4 particle = texture2D(uParticles, uv);
    vec4 velocity = texture2D(uVelocities, uv);
    vec4 pressure = texture2D(uPressures, uv);
    vec4 density = texture2D(uDensities, uv);
    float densityValue = max(density.x, EPSILON);

    vec3 pressureAcceleration = pressure.xyz / densityValue;
    
    velocity.xyz += uGravity * vec3(uDirection, 0.0) * uDeltaTime;
    velocity.xyz += pressureAcceleration * uDeltaTime;

    if(uPressed == 1.0 || uPressed == 2.0){
        vec3 mousePos = vec3(uMouse, 0.0);
        vec3 directionToMouse = normalize(mousePos - particle.xyz);
        float distanceToMouse = length(mousePos - particle.xyz);
        float radius = 500.0; 
        float forceMagnitude = 0.0;

        if (distanceToMouse < radius) {
            forceMagnitude = (1.0 - (distanceToMouse / radius)) * 5000.0; // Stronger force within the radius
        }
        if(uPressed == 2.0){
            forceMagnitude *= -1.0;
        }

        velocity.xyz += directionToMouse * forceMagnitude * uDeltaTime;
    }

    if(uPressed == 3.0){
        velocity.x += 1000.0 * uDeltaTime;
    }
        
    
    velocity = resolveVelocity(particle, velocity);

    velocity.xyz *= friction;

    particle.xyz += velocity.xyz * uDeltaTime;

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


