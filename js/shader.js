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
precision highp float;

uniform int u_maxReflection;
uniform float u_waterRadius; // TODO: store the radius in a texture
uniform vec3 u_kads;
uniform vec3 u_eyePosition;
uniform vec3 u_lightDirection;
uniform samplerCube u_skybox;

varying vec3 v_position;
varying vec3 v_normal;

const float PI = 3.1415926535897932384626433832795;
const float PI_2 = 1.57079632679489661923;
const float IOR_AIR = 1.0;
const float IOR_WATER = 1.333333;
const vec3  IOR_WATER_RGB = vec3(1.3302, 1.3366, 1.3443);
const float R0 = 0.0204081632653; // the R0 in Schlick's approximation
const vec3  R0_RGB = vec3(0.02008018649505041, 0.020751977055675212, 0.021569877084979656);

float getIOR(int rgb) {
    if (rgb == 0) {
        return IOR_WATER_RGB[0];
    } else if (rgb == 1) {
        return IOR_WATER_RGB[1];
    } else {
        return IOR_WATER_RGB[2];
    }
}

float getR0(int rgb) {
    if (rgb == 0) {
        return R0_RGB[0];
    } else if (rgb == 1) {
        return R0_RGB[1];
    } else {
        return R0_RGB[2];
    }
}

float getColor(vec4 color, int rgb) {
    if (rgb == 0) {
        return color[0];
    } else if (rgb == 1) {
        return color[1];
    } else {
        return color[2];
    }
}

vec3 getIntersectPos(vec3 currentPos, vec3 currentDir) {
    if (length(currentPos) <= u_waterRadius + 0.01) { // TODO: store the radius in a texture
        // inside the ball
        return normalize(currentPos + 2.0 * u_waterRadius * dot(normalize(currentDir), normalize(-currentPos)) * normalize(currentDir));
    }
    else {
        // outside the ball
        // use the cosine formula to obtain
        float a = length(currentPos);
        float cosTheta = dot(normalize(currentDir), normalize(-currentPos));
        float aCosTheta = a * cosTheta;
        float b = aCosTheta - sqrt(u_waterRadius*u_waterRadius - a*a + aCosTheta*aCosTheta);
        return normalize(currentPos + b * normalize(currentDir));
    }
}

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

float traceRayOfComponent(int rgb, vec3 currentPos, vec3 currentDir) {
    float attenuation = 1.0;
    float color = 0.0;

    for (int depth = 1; depth <= 10; ++depth) {
        // Loop index cannot be compared with non-constant expression
        if (depth > u_maxReflection) { break; }

        vec3 newPos = getIntersectPos(currentPos, currentDir);
        vec3 incident = newPos - currentPos;
        vec3 newPosNormal = normalize(newPos); // TODO: use texture to store the normal of every position
        newPosNormal = faceforward(newPosNormal, incident, newPosNormal);
        vec3 newReflectDir = normalize(reflect(incident, newPosNormal));

        bool reflectIsOutward = (dot(newReflectDir, newPos) > 0.0);
        float ior = (reflectIsOutward) ? (getIOR(rgb) / IOR_AIR) : (IOR_AIR / getIOR(rgb));
        vec3 newRefractDir = refract(incident, newPosNormal, ior); // it may be vec3(0.0) if total internal reflection
        if (length(newRefractDir) > 0.0001) { newRefractDir = normalize(newRefractDir); }

        // calculate reflective coefficient
        float reflCoef = (length(newRefractDir) > 0.0001) ? \
                         (getR0(rgb) + (1.0 - getR0(rgb)) * pow(1.0 - dot(normalize(newPosNormal), normalize(-incident)), 5.0)) : \
                         1.0; // total internal reflection

        if (reflectIsOutward) {
            color += attenuation * reflCoef * getColor(textureCube(u_skybox, newReflectDir), rgb);
            attenuation *= (1.0 - reflCoef);
            currentPos = newPos;
            currentDir = newRefractDir;
        }
        else {
            color += attenuation * (1.0 - reflCoef) * getColor(textureCube(u_skybox, newRefractDir), rgb);
            attenuation *= reflCoef;
            currentPos = newPos;
            currentDir = newReflectDir;
        }

    }

    color *= (1.0 + attenuation);

    return color;
}

void main() {
    vec4 color = vec4(0.0, 0.0, 0.0, 1.0);

    // trace the ray
    float attenuation = 1.0;
    vec3 currentPos = u_eyePosition;
    vec3 currentDir = normalize(v_position - u_eyePosition);

    color.r = traceRayOfComponent(0, currentPos, currentDir);
    color.g = traceRayOfComponent(1, currentPos, currentDir);
    color.b = traceRayOfComponent(2, currentPos, currentDir);

    gl_FragColor = color;
}
`;
