'use strict';

const { mat4, vec3 } = glMatrix;


window.onload = function main() {
    const m4 = twgl.m4;
    const gl = document.querySelector("#render").getContext("webgl");
    const programInfo = twgl.createProgramInfo(gl, [vertShaderSrc, fragShaderSrc]);

    const arrays = icomesh(1);
    const bufferInfo = twgl.createBufferInfoFromArrays(gl, arrays); // vec3? vec4?

    const uniforms = {
        u_MVMatrix: mat4.create()
    };

    const eye = [0, 0.5, -1.5];
    const target = [0, 0, 0];
    const up = [0, 1, 0];

    function render(timestamp) {
        timestamp *= 0.001;
        twgl.resizeCanvasToDisplaySize(gl.canvas);
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

        gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.CULL_FACE);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        // model matrix
        let modelMatrix = mat4.create();
        mat4.translate(modelMatrix, modelMatrix, [target[0] - eye[0], target[1] - eye[1], target[2] - eye[2]]);
        mat4.rotateY(modelMatrix, modelMatrix, timestamp);

        // view matrix
        let viewMatrix = mat4.create();
        mat4.lookAt(viewMatrix, eye, target, up);

        // projection matrix
        let projectionMatrix = mat4.create();
        const fov = 45 * Math.PI / 180;
        const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
        const zNear = 0.5;
        const zFar = 10;
        mat4.perspective(projectionMatrix, fov, aspect, zNear, zFar);

        // multiply transformation matrices
        let MVPMatrix = mat4.create();
        mat4.mul(MVPMatrix, MVPMatrix, projectionMatrix);
        mat4.mul(MVPMatrix, MVPMatrix, viewMatrix)
        mat4.mul(MVPMatrix, MVPMatrix, modelMatrix);

        uniforms.u_MVPMatrix = MVPMatrix;

        gl.useProgram(programInfo.program);
        twgl.setBuffersAndAttributes(gl, programInfo, bufferInfo);
        twgl.setUniforms(programInfo, uniforms);
        twgl.drawBufferInfo(gl, bufferInfo);

        requestAnimationFrame(render);
    }
    requestAnimationFrame(render);


}
