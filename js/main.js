'use strict';

const { mat4, vec3 } = glMatrix;


const getNormalMatrix = function (out, a) {
    mat4.invert(out, a);
    mat4.transpose(out, out);
    return out;
}


window.onload = function main() {
    const gl = document.querySelector("#render").getContext("webgl");
    const programInfo = twgl.createProgramInfo(gl, [vertShaderSrc, fragShaderSrc]);

    const arrays = icomesh(1);
    const bufferInfo = twgl.createBufferInfoFromArrays(gl, arrays); // vec3? vec4?

    const eye = [0, 0.5, 3];
    const target = [0, 0, 0];
    const up = [0, 1, 0];
    const light = [1, 3, 2];

    const uniforms = {
        u_kads: [0.4, 0.6, 0.2],
        u_eyePosition: eye,
        u_lightPosition: light,
        u_MMatrix: mat4.create(),
        u_normalMatrix: mat4.create(),
        u_PVMMatrix: mat4.create(),
    };

    function render(timestamp) {
        timestamp *= 0.001;
        twgl.resizeCanvasToDisplaySize(gl.canvas);
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

        gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.CULL_FACE);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        // model matrix
        let modelMatrix = mat4.create();
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
        let PVMMatrix = mat4.create();
        mat4.mul(PVMMatrix, PVMMatrix, projectionMatrix);
        mat4.mul(PVMMatrix, PVMMatrix, viewMatrix)
        mat4.mul(PVMMatrix, PVMMatrix, modelMatrix);

        uniforms.u_MMatrix = modelMatrix;
        uniforms.u_normalMatrix = getNormalMatrix(mat4.create(), modelMatrix);
        uniforms.u_PVMMatrix = PVMMatrix;

        gl.useProgram(programInfo.program);
        twgl.setBuffersAndAttributes(gl, programInfo, bufferInfo);
        twgl.setUniforms(programInfo, uniforms);
        twgl.drawBufferInfo(gl, bufferInfo);

        requestAnimationFrame(render);
    }
    requestAnimationFrame(render);


}
