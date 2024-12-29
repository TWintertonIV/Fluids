uniform float uDeltaTime;
uniform float uGravity;
uniform vec3 uBounds;

// float collisionDamping = 1.0;

vec4 particle;
vec4 velocity;


vec4 resolveVelocity(vec4 particle, vec4 velocity);
vec4 resolveCollisions(vec4 particle);


void main()
{
    
    vec2 uv = gl_FragCoord.xy / resolution;
    particle = texture(uParticles, uv);
    velocity = texture(uVelocities, uv);

    particle.xyz += velocity.xyz * uDeltaTime;
    particle = resolveCollisions(particle);
    gl_FragColor = particle;
}

vec4 resolveCollisions(vec4 particle){
    vec3 halfBoundsSize = uBounds / 2.0;
    if(abs(particle.x) > halfBoundsSize.x){
        particle.x = halfBoundsSize.x * sign(particle.x);
    }
    if(abs(particle.y) > halfBoundsSize.y){
        particle.y = halfBoundsSize.y * sign(particle.y);
    }
    if(abs(particle.z) > halfBoundsSize.z){
        particle.z = halfBoundsSize.z * sign(particle.z);
    }

    return particle;
}


