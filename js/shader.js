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

uniform int u_maxReflection;
uniform float u_waterRadius; // TODO: store the radius in a texture
uniform vec3 u_kads;
uniform vec3 u_eyePosition;
uniform vec3 u_lightDirection;
uniform samplerCube u_skybox;

varying vec3 v_position;
varying vec3 v_normal;

const float IOR_AIR = 1.0;
const float IOR_WATER = 1.333333;
const float R0 = 0.02; // the R0 in Schlick's approximation

vec3 getIntersectPos(vec3 currentPos, vec3 currentDir) {
    if (length(currentPos) <= u_waterRadius + 0.01) { // TODO: store the radius in a texture
        // inside the ball
        // gl_FragColor.rgb = currentDir;
        return normalize(currentPos + 2.0 * u_waterRadius * dot(normalize(currentDir), normalize(-currentPos)));
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

void main() {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);

    // trace the ray
    float attenuation = 1.0;
    vec3 currentPos = u_eyePosition;
    vec3 currentDir = normalize(v_position - u_eyePosition);
    for (int depth = 1; depth <= 10; ++depth) {
        // Loop index cannot be compared with non-constant expression
        if (depth > u_maxReflection) { break; }

        vec3 newPos = getIntersectPos(currentPos, currentDir);
        vec3 incident = newPos - currentPos;
        vec3 newPosNormal = normalize(newPos); // TODO: use texture to store the normal of every position
        vec3 newReflectDir = normalize(reflect(incident, newPosNormal));

        bool reflectIsOutward = (dot(newReflectDir, newPos) > 0.0);
        bool isTotalInternalReflection = false;
        vec3 newRefractDir;
        if (reflectIsOutward) {
            newRefractDir = normalize(refract(incident, newPosNormal, IOR_AIR / IOR_WATER));
        }
        else if (dot(newPos, incident) > sqrt(1.0 - (IOR_AIR / IOR_WATER) * (IOR_AIR / IOR_WATER))) {
            isTotalInternalReflection = true;
        }
        else {
            newRefractDir = normalize(refract(incident, newPosNormal, IOR_WATER / IOR_AIR));
        }
        // gl_FragColor = textureCube(u_skybox, newRefractDir);

        if (depth == 1) {
            // newRefractDir = normalize(refract(incident, newPosNormal, ));
            // gl_FragColor = textureCube(u_skybox, newRefractDir);
            // gl_FragColor.rgb = newRefractDir;
            // gl_FragColor.rgb = vec3(length(newRefractDir));
            if (newRefractDir.y > 0.0) {
                // gl_FragColor.gb = vec2(1.0, 1.0);
            }
            else {
                // gl_FragColor.gb = vec2(0.0);
            }
            // gl_FragColor.rgb = vec3(newRefractDir.z, newRefractDir.z, newRefractDir.z);
            // gl_FragColor.rgb = newPos;
        }

        float reflCoef = R0 + (1.0 - R0) * pow(1.0 - dot(normalize(v_normal), normalize(-incident)), 5.0);
        // reflCoef *= 1.5;
        if (reflectIsOutward) {
            // gl_FragColor += attenuation * reflCoef * textureCube(u_skybox, newReflectDir);
            gl_FragColor += textureCube(u_skybox, newRefractDir); // DEMO USE
            attenuation *= (1.0 - reflCoef);
            currentPos = newPos;
            currentDir = newRefractDir;
        }
        else {
            // gl_FragColor = vec4(1.0 - reflCoef, 1.0 - reflCoef, 1.0 - reflCoef, 1.0);
            // gl_FragColor.rgb = newPos;
            // gl_FragColor = textureCube(u_skybox, newPos);
            // gl_FragColor.rgb = newPos;
            if (!isTotalInternalReflection) {
                // gl_FragColor += attenuation * (1.0 - reflCoef) * textureCube(u_skybox, newRefractDir);
                attenuation *= reflCoef;
            }
            currentPos = newPos;
            currentDir = newReflectDir;
        }

    }


    // // reflected color
    // vec3 eye2target = normalize(v_position - u_eyePosition);
    // vec3 reflectDir = normalize(reflect(eye2target, v_normal));
    // vec4 reflColor = textureCube(u_skybox, reflectDir);

    // // water color
    // vec4 waterColor = getPhongColor();

    // // combine
    // float reflCoef = R0 + (1.0 - R0) * pow(1.0 - dot(v_normal, -eye2target), 5.0);
    // gl_FragColor = reflCoef * 1.5 * reflColor + (1.0 - reflCoef * 1.5) * waterColor;
}
`;
