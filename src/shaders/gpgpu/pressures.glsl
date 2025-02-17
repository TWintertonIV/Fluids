precision highp float;
#define M_PI 3.1415926535897932384626433832795
#define EPSILON .0000001
uniform float uSmoothing;
uniform float uTargetDensity;
uniform float uPressureMultiplier;
uniform vec3 uBounds;
uniform int uCount;
uniform vec2 uDirection;
uniform float uGravity;

vec4 particle;
vec4 predictedPosition;
vec4 density;
vec3 gradient;
float gradientKernel(float radius, float dst);
vec3 calculateGradient(vec3 position, float density);
float calculatePressureFromDensity(float density);
float CalculateSharedPressure(float densityA, float densityB);


float rand(vec2 co){
    return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
}

void main()
{

    vec2 uv = gl_FragCoord.xy / resolution;
    particle = texture2D(uParticles, uv);
    density = texture2D(uDensities, uv);
    predictedPosition = texture2D(uPredicted, uv);
    float densityValue = density.x;

    gradient = calculateGradient(predictedPosition.xyz, densityValue);


    gl_FragColor = vec4(gradient, 1.0);
}


float gradientKernel(float radius, float dst){
    if (dst >= radius) return 0.0;
    float value = (radius - dst);
    float constant = -12.0 / (M_PI * pow(radius, 4.0));

    return constant * value * value;
}


vec3 calculateGradient(vec3 position, float density){
    ivec2 texSize = textureSize(uPredicted, 0);
    vec3 gradient = vec3(0.0);

    for (int y = 0; y < texSize.y; y++) {
        for (int x = 0; x < texSize.x; x++) {
            if(y * texSize.y + x >= uCount) break;

            vec2 uv = vec2(x, y) / vec2(texSize);
            vec4 particle = texture2D(uPredicted, uv);
            vec4 densityTexture = texture2D(uDensities, uv);
            float densityOther = densityTexture.x;

            vec3 posDiff = position.xyz - particle.xyz;
            float dst = length(posDiff);
            vec3 dir;

            if(dst < EPSILON) continue;
            dir = posDiff / dst;
            // if(dst < EPSILON) {
            //     dir = vec3(rand(vec2(y,y)), rand(vec2(x,y)), rand(vec2(x,x)));
            // } else {
            //     dir = posDiff / dst;
            // }
            float pressureConstant = CalculateSharedPressure(density, densityOther);

            float influence = gradientKernel(uSmoothing, dst);
            if(density > EPSILON && abs(influence) > EPSILON){
                gradient += pressureConstant * dir * influence / density;
            }

        }
    }
    

    float dstToTop = uBounds.y / 2.0 - position.y;
    float dstToBottom = position.y + uBounds.y / 2.0;
    float dstToLeft = position.x + uBounds.x / 2.0;
    float dstToRight = uBounds.x / 2.0 - position.x;
    float dstToFront = uBounds.z / 2.0 - position.z;
    float dstToBack = position.z + uBounds.z / 2.0;

    float pressureConstant = 250000.0;
    gradient -= pressureConstant * vec3(0.0, -1.0, 0.0) * gradientKernel(uSmoothing, dstToTop) * max(abs((uDirection.y)), .25);
    gradient -= pressureConstant * vec3(0.0, 1.0, 0.0) * gradientKernel(uSmoothing, dstToBottom) * max(abs((uDirection.y)), .25);
    gradient += pressureConstant * vec3(-1.0, 0.0, 0.0) * gradientKernel(uSmoothing, dstToLeft) * max(abs((uDirection.x)), .25);
    gradient += pressureConstant * vec3(1.0, 0.0, 0.0) * gradientKernel(uSmoothing, dstToRight) * max(abs((uDirection.x)), .25);
    gradient -= pressureConstant * vec3(0.0, 0.0, -1.0) * gradientKernel(uSmoothing, dstToFront);
    gradient -= pressureConstant * vec3(0.0, 0.0, 1.0) * gradientKernel(uSmoothing, dstToBack);

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
