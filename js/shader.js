'use strict';

const skyboxShaderSrc = {};
const ballPhongShaderSrc = {};
const ballRayTracingShaderSrc = {};


skyboxShaderSrc.vert = `
attribute vec4 position;

varying vec4 v_position;

void main() {
    v_position = position;

    gl_Position = position;
    gl_Position.z = 0.999;
}
`;


skyboxShaderSrc.frag = `
precision mediump float;

uniform samplerCube u_skybox;
uniform mat4 u_PVMatrixInverse;

varying vec4 v_position;

void main() {
    gl_FragColor = textureCube(u_skybox, (u_PVMatrixInverse * v_position).xyz);
}
`;


ballPhongShaderSrc.vert = `
attribute vec3 position;
attribute vec3 normal;

uniform mat4 u_MMatrix;
uniform mat4 u_normalMatrix;
uniform mat4 u_PVMMatrix;

varying vec3 v_position;
varying vec3 v_normal;

void main() {
    v_position = (u_MMatrix * vec4(position, 1.0)).xyz;
    v_normal = mat3(u_normalMatrix) * normal.xyz;
    gl_Position = u_PVMMatrix * vec4(position, 1.0);
}
`;


ballPhongShaderSrc.frag = `
precision mediump float;

uniform vec3 u_kads;
uniform vec3 u_eyePosition;
uniform vec3 u_lightPosition;

varying vec3 v_position;
varying vec3 v_normal;

void main() {
    vec3 lightColor  = vec3(1.0);
    vec3 objectColor = vec3(0.612, 0.827, 0.859);
    vec3 normal      = normalize(v_normal);
    vec3 lightDir    = normalize(u_lightPosition - v_position);
    vec3 eyeDir      = normalize(u_eyePosition - v_position);
    vec3 reflectDir  = dot(normal, lightDir) > 0.0 ? reflect(-lightDir, normal) : vec3(0.0);
    float shininess  = 2.0;

    vec3 ambient  = u_kads.x * lightColor;
    vec3 diffuse  = u_kads.y * lightColor * max(dot(lightDir, normal), 0.0);
    vec3 specular = u_kads.z * lightColor * pow(max(dot(eyeDir, reflectDir), 0.0), shininess);

    gl_FragColor = vec4((ambient + diffuse + specular) * objectColor, 1.0);
}
`;


ballRayTracingShaderSrc.vert = `
attribute vec3 position;
attribute vec3 normal;

uniform mat4 u_MMatrix;
uniform mat4 u_normalMatrix;
uniform mat4 u_PVMMatrix;

varying vec3 v_position;
varying vec3 v_normal;

void main() {
    v_position = (u_MMatrix * vec4(position, 1.0)).xyz;
    v_normal = normalize(mat3(u_normalMatrix) * normal.xyz);
    gl_Position = u_PVMMatrix * vec4(position, 1.0);
}
`;


ballRayTracingShaderSrc.frag = `
precision mediump float;

uniform vec3 u_kads;
uniform vec3 u_eyePosition;
uniform vec3 u_lightDirection;
uniform samplerCube u_skybox;

varying vec3 v_position;
varying vec3 v_normal;

const float IOR_AIR = 1.0;
const float IOR_WATER = 1.333;
const float R0 = 0.02; // the R0 in Schlick's approximation

vec4 getPhongColor() {
    vec3 lightColor  = vec3(1.0);
    vec3 objectColor = vec3(0.612, 0.827, 0.859);
    vec3 normal      = normalize(v_normal);
    vec3 lightDir    = normalize(u_lightDirection - v_position);
    vec3 eyeDir      = normalize(u_eyePosition - v_position);
    vec3 reflectDir  = dot(normal, lightDir) > 0.0 ? reflect(-lightDir, normal) : vec3(0.0);
    float shininess  = 2.0;

    vec3 ambient  = u_kads.x * lightColor;
    vec3 diffuse  = u_kads.y * lightColor * max(dot(lightDir, normal), 0.0);
    vec3 specular = u_kads.z * lightColor * pow(max(dot(eyeDir, reflectDir), 0.0), shininess);

    return vec4((ambient + diffuse + specular) * objectColor, 1.0);
}

void main() {
    vec3 eye2target = normalize(v_position - u_eyePosition);

    // reflected color
    vec3 reflectDir = normalize(reflect(eye2target, v_normal));
    vec4 reflColor = textureCube(u_skybox, reflectDir);

    // water color
    vec4 waterColor = getPhongColor();

    // combine
    float reflCoef = R0 + (1.0 - R0) * pow(1.0 - dot(v_normal, -eye2target), 5.0);
    gl_FragColor = reflCoef * reflColor + waterColor;
}
`;
