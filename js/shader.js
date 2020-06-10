'use strict';

const vertShaderSrc = `
attribute vec3 position;
attribute vec3 normal;

uniform mat4 u_MVPMatrix;

void main() {
    gl_Position = u_MVPMatrix * vec4(position, 1.0);
}
`;


const fragShaderSrc = `
precision mediump float;


void main() {
  gl_FragColor = vec4(0.5, 0.5, 0.5, 1.0);
}
`;
