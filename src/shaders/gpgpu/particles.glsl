uniform float uDeltaTime;
uniform float uGravity;
uniform vec3 uBounds;
uniform int uCount;

vec4 particle;
vec4 velocity;


vec4 resolveVelocity(vec4 particle, vec4 velocity);
vec4 resolveCollisions(vec4 particle);
vec4 resolveParticlesCollisions(vec4 particle);

void main()
{
    
    vec2 uv = gl_FragCoord.xy / resolution;
    particle = texture(uParticles, uv);
    velocity = texture(uVelocities, uv);

    particle.xyz += velocity.xyz * uDeltaTime;
    // particle = resolveParticlesCollisions(particle);
    particle = resolveCollisions(particle);
    gl_FragColor = particle;
}

// vec4 resolveParticlesCollisions(vec4 particle){
//     float radius = .25;
//     float radius2 = radius * radius;
//     vec3 posDiff;
//     float dst;
//     vec4 otherParticle;
//     ivec2 texSize = textureSize(uParticles, 0);

//     for (int y = 0; y < texSize.y; y++) {
//         for (int x = 0; x < texSize.x; x++) {
//             if(y * texSize.y + x >= uCount) break;
            
//             vec2 uv = vec2(x, y) / vec2(texSize);
//             otherParticle = texture(uParticles, uv);
//             if(particle.xyz == otherParticle.xyz) continue;


//             dst = distance(particle.xyz, otherParticle.xyz);
//             if(dst <= radius){
//                 float mag = radius - dst;    
//                 vec3 direction = normalize(particle.xyz - otherParticle.xyz);
//                 if(length(direction) < 0.0001){
//                     direction = normalize(particle.xyz);
//                 }
//                 particle.xyz += 0.5 * direction * mag;
//             }
//         }
//     }

//     return particle;
// }

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


