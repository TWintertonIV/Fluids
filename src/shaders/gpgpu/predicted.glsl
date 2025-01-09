void main()
{
    vec2 uv = gl_FragCoord.xy / resolution;
    vec4 particle = texture(uParticles, uv);
    vec4 velocity = texture(uVelocities, uv);
    vec3 predictedPosition = particle.xyz + velocity.xyz * 1.0/120.0;

    gl_FragColor = vec4(predictedPosition, 1.0);
}