#define M_PI 3.1415926535897932384626433832795
uniform float uSmoothing;

vec4 particle;
float gradientKernel(float radius, float dst);
vec3 calculateGradient(vec3 position);
void main()
{
    
    vec2 uv = gl_FragCoord.xy / resolution;
    particle = texture(uParticles, uv);
    vec4 density = texture(uDensities, uv);
   
    gl_FragColor = particle;
}


float gradientKernel(float radius, float dst){
    float value = max(0.0, radius - dst);
    float constant = -30.0 / (M_PI * pow(radius, 5.0));

    return constant * value * value;
}


vec3 calculateGradient(vec3 position){
    ivec2 texSize = textureSize(uParticles, 0);
    vec3 gradient = vec3(0.0);

    for (int y = 0; y < texSize.y; y++) {
        for (int x = 0; x < texSize.x; x++) {
            vec2 uv = vec2(x, y) / vec2(texSize);
            vec4 particle = texture2D(uParticles, uv);
            float dst = distance(position, particle.xyz);
            vec3 dir = normalize(position - particle.xyz);


            float influence = gradientKernel(uSmoothing, dst);
            gradient += influence * dir;

        }
    }

    return gradient;
}
