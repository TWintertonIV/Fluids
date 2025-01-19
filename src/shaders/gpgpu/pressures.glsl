#define M_PI 3.1415926535897932384626433832795
#define EPSILON 0.0000001
uniform float uSmoothing;
uniform float uTargetDensity;
uniform float uPressureMultiplier;
uniform vec3 uBounds;
vec4 particle;
vec4 predictedPosition;
vec4 density;
vec3 gradient;
float gradientKernel(float radius, float dst);
vec3 calculateGradient(vec3 position, float density);
float calculatePressureFromDensity(float density);
float CalculateSharedPressure(float densityA, float densityB);


void main()
{

    vec2 uv = gl_FragCoord.xy / resolution;
    particle = texture2D(uParticles, uv);
    density = texture2D(uDensities, uv);
    predictedPosition = texture2D(uPredicted, uv);
    float densityValue = max(density.x, EPSILON);

    gradient = calculateGradient(particle.xyz, densityValue);


    gl_FragColor = vec4(gradient, 1.0);
}


float gradientKernel(float radius, float dst){
    if (dst >= radius) return 0.0;
    
    float value = (radius - dst);
    float constant = -12.0 / (M_PI * pow(radius, 4.0));

    return constant * value * value;
}


vec3 calculateGradient(vec3 position, float density){
    ivec2 texSize = textureSize(uParticles, 0);
    vec3 gradient = vec3(0.0);

    for (int y = 0; y < texSize.y; y++) {
        for (int x = 0; x < texSize.x; x++) {
            vec2 uv = vec2(x, y) / vec2(texSize);
            vec4 particle = texture2D(uParticles, uv);
            vec4 densityTexture = texture2D(uDensities, uv);
            float densityOther = max(densityTexture.x, EPSILON);

            vec3 posDiff = position.xyz - particle.xyz;
            float dst = length(posDiff);
            if(dst < EPSILON) continue;

            vec3 dir = posDiff / dst;
            float pressureConstant = CalculateSharedPressure(density, densityOther);

            float influence = gradientKernel(uSmoothing, dst);
            if(density > EPSILON && abs(influence) > EPSILON){
                gradient += pressureConstant * dir * influence / density;
            }

        }
    }
    

    


    // vec3 boundsDiff = abs(position.xyz) - (uBounds/2.0);
    // vec3 dir = sign(position);

    // float pressureConstant = calculatePressureFromDensity(density);
    // float influenceX = gradientKernel(uSmoothing, boundsDiff.x);
    // float influenceY = gradientKernel(uSmoothing, boundsDiff.y);
    // float influenceZ = gradientKernel(uSmoothing, boundsDiff.z);

    // gradient += pressureConstant * dir.x * influenceX / density;
    // gradient += pressureConstant * dir.y * influenceY / density;
    // gradient += pressureConstant * dir.z * influenceZ / density;

    return gradient;
}

float CalculateSharedPressure(float densityA, float densityB){
    float pressureA = calculatePressureFromDensity(densityA);
    float pressureB = calculatePressureFromDensity(densityB);
    return (pressureA + pressureB) / 2.0;
}

float calculatePressureFromDensity(float density){
    float densityError = density - uTargetDensity;
    float pressure = densityError * uPressureMultiplier;
    return pressure;
}
