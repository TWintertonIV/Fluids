#define M_PI 3.1415926535897932384626433832795

uniform float uSmoothing;
float smoothingKernel(float radius, float dst);
float calculateDensity(vec3 position);
vec4 particle;
vec4 predictedPosition;
void main()
{
    
    vec2 uv = gl_FragCoord.xy / resolution;
    particle = texture2D(uParticles, uv);
    predictedPosition = texture2D(uPredicted, uv);
    float density = calculateDensity(particle.xyz);

    gl_FragColor = vec4(density,density,density, 0.0);
}


float smoothingKernel(float radius, float dst){
    if(dst >= radius) return 0.0;

    float volume = M_PI * pow(radius, 4.0) / 6.0;
    float value = (radius - dst);
    return value * value * value / volume;

    /*
        w = (10/pi * s^5) * (s - x)^3

        dw/dx = dw/df * df/dx

        -30 (s-x)^2 /pi * s^5
    */
}


float calculateDensity(vec3 position){
    ivec2 texSize = textureSize(uParticles, 0);
    float density = 0.0;

    for (int y = 0; y < texSize.y; y++) {
        for (int x = 0; x < texSize.x; x++) {
            vec2 uv = vec2(x, y) / vec2(texSize);
            vec4 particle = texture2D(uParticles, uv);

            float dst = distance(position, particle.xyz);
            float influence = smoothingKernel(uSmoothing, dst);
            density += influence;
        }
    }

    return density;
}
