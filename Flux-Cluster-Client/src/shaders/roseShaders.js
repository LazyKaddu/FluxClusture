export const roseVertexShader = `
varying vec2 vUv;
varying vec3 vWorldPos;
varying vec3 vWorldNormal;

uniform float uXval;
uniform float uMix;

void main() {
  vUv = uv;

  vec3 uPosition = position;
  uPosition.x = abs(sin((uPosition.x * 0.05) + uXval) * uPosition.y);
  uPosition.z = sin(uPosition.y * 5.5) * uPosition.z;

  vec3 fPosition = mix(position, uPosition, uMix);

  vec4 worldPos = modelMatrix * vec4(fPosition, 1.0);
  vWorldPos = worldPos.xyz;
  vWorldNormal = normalize(mat3(modelMatrix) * normal);

  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`;

export const roseFragmentShader = `
precision highp float;

varying vec2 vUv;
varying vec3 vWorldPos;
varying vec3 vWorldNormal;

uniform float uTime;
uniform vec3 uCameraPos;

uniform float uGlowStrength;
uniform float uGlowPower;
uniform float uOpacity;

void main() {
  vec3 normal = normalize(vWorldNormal);
  if (!gl_FrontFacing) {
    normal = -normal;
  }

  vec3 viewDir = normalize(uCameraPos - vWorldPos);

  /* Animated color cycle matching autonomous nodes */
  vec3 baseColor =
    0.5 + 0.5 * cos(uTime + vUv.xyx + vec3(0.0, 2.0, 4.0));

  /* Fresnel rim term */
  float fresnel =
    pow(1.0 - max(dot(viewDir, normal), 0.0), uGlowPower);

  /* Specular highlight */
  vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0));
  vec3 halfDir = normalize(lightDir + viewDir);
  float spec =
    pow(max(dot(normal, halfDir), 0.0), 120.0);

  /* Blue to White Fresnel glow */
  vec3 glowBlue = vec3(0.2, 0.6, 1.0);
  vec3 glowWhite = vec3(1.0);

  vec3 glow =
    mix(glowBlue, glowWhite, fresnel) *
    fresnel * uGlowStrength;

  /* Final composite: glass interior + glossy highlights + glow */
  vec3 finalColor =
    baseColor * 0.35 +
    spec * vec3(1.0) +
    glow;

  gl_FragColor = vec4(finalColor, uOpacity);
}
`;
