varying vec3 vPos;
varying vec2 vUv;

uniform sampler2D uVelocitiesTexture;
void main(){
    vec2 uv = gl_PointCoord.xy;
    float radius = .5;
    float dist = distance(uv, vec2(radius, radius));

    if( dist > .5){
        discard;
    }

    vec4 velocity = texture(uVelocitiesTexture, vUv);
    float mag = length(velocity.xyz) / 150.0;

    vec3 color = mix(vec3(0.2, 0.2, 1.0), vec3(0.306, 0.9, 1.0), smoothstep(0.0, 1.0, mag));
    
    gl_FragColor = vec4(color, 1.0);
}




