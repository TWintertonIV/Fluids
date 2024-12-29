varying vec3 vPos;
uniform float uResolution;
void main(){
    vec2 uv = gl_PointCoord.xy;
    float radius = .5;
    float dist = distance(uv, vec2(radius, radius));

    if( dist > .5){
        discard;
    }
    gl_FragColor = vec4(0.2, 0.2, 1, 1.0);
}
