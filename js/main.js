'use strict';

const { mat4, vec3 } = glMatrix;


const getNormalMatrix = function (out, a) {
    mat4.invert(out, a);
    mat4.transpose(out, out);
    return out;
}

const setTranslation = function (out, mat, trans) {
    mat4.copy(out, mat);
    out[12] = trans[0];
    out[13] = trans[1];
    out[14] = trans[2];
    return out;
}


window.onload = function main() {
    const gl = document.querySelector("#render").getContext("webgl");
    const ballPhongProgramInfo = twgl.createProgramInfo(gl, [ballPhongShaderSrc.vert, ballPhongShaderSrc.frag]);
    const ballRayTracingProgramInfo = twgl.createProgramInfo(gl, [ballRayTracingShaderSrc.vert, ballRayTracingShaderSrc.frag]);
    const skyboxProgramInfo = twgl.createProgramInfo(gl, [skyboxShaderSrc.vert, skyboxShaderSrc.frag]);

    const arrays = icomesh(5);
    const ballBufferInfo = twgl.createBufferInfoFromArrays(gl, arrays); // vec3? vec4?
    const skyboxBufferInfo = twgl.primitives.createXYQuadBufferInfo(gl);

    const skyboxTex = twgl.createTexture(gl, {
        target: gl.TEXTURE_CUBE_MAP,
        src: [
            'images/posx.png',
            'images/negx.png',
            'images/posy.png',
            'images/negy.png',
            'images/posz.png',
            'images/negz.png',
        ],
        minMag: gl.LINEAR
    });

    const eyeRadius = 2.0;
    const eyeHeight = 0;
    const target = [0, 0, 0];
    const up = [0, 1, 0];
    const light = [1, 3, 2];
    const lightDirection = [1, 3, 2];

    const uniforms = {
        u_kads: [0.4, 0.6, 0.2], // k: constant, a: ambient, d: diffuse, s: specular
        u_eyePosition: [Math.sin(0) * eyeRadius, eyeHeight, Math.cos(0) * eyeRadius],
        u_lightPosition: light, // for single point light source
        u_lightDirection: lightDirection, // for parellel light source
        u_normalMatrix: mat4.create(),
        u_MMatrix: mat4.create(),
        u_VMatrix: mat4.create(),
        u_PMatrix: mat4.create(),
        u_PVMMatrix: mat4.create(),
        u_PVMatrixInverse: mat4.create(),
        u_skybox: skyboxTex,
        u_maxReflection: 1,
        u_waterRadius: 1,
    };

    function render(timestamp) {
        timestamp *= 0.001;
        const eye = [Math.sin(timestamp / 3.14) * eyeRadius, eyeHeight, Math.cos(timestamp / 3.14) * eyeRadius];
        // const eye = [Math.sin(0) * eyeRadius, eyeHeight, Math.cos(0) * eyeRadius];
        uniforms.u_eyePosition = eye;

        twgl.resizeCanvasToDisplaySize(gl.canvas);
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

        gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.CULL_FACE);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        // model matrix
        let MMatrix = uniforms.u_MMatrix;
        let scaling = uniforms.u_waterRadius;
        mat4.fromScaling(MMatrix, [scaling, scaling, scaling]);
        // mat4.fromRotation(MMatrix, timestamp, [0, 1, 0]); // rotate radian(timestamp) by y-axis([0, 1, 0])

        // view matrix
        let VMatrix = uniforms.u_VMatrix;
        mat4.lookAt(VMatrix, eye, target, up);

        // projection matrix
        let PMatrix = uniforms.u_PMatrix;
        const fov = 60 * Math.PI / 180;
        const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
        const zNear = 0.5;
        const zFar = 10;
        mat4.perspective(PMatrix, fov, aspect, zNear, zFar);

        // multiply transformation matrices
        let PVMMatrix = uniforms.u_PVMMatrix;
        mat4.mul(PVMMatrix, PMatrix, VMatrix)
        mat4.mul(PVMMatrix, PVMMatrix, MMatrix);

        // transform normal vectors of ball
        getNormalMatrix(uniforms.u_normalMatrix, MMatrix);

        // matrix for skybox
        let PVMatrixInverse = uniforms.u_PVMatrixInverse;
        let viewDirectionMatrix = setTranslation(mat4.create(), VMatrix, [0, 0, 0])
        mat4.mul(PVMatrixInverse, PMatrix, viewDirectionMatrix);
        mat4.invert(PVMatrixInverse, PVMatrixInverse);

        // draw ball
        gl.useProgram(ballRayTracingProgramInfo.program);
        twgl.setBuffersAndAttributes(gl, ballRayTracingProgramInfo, ballBufferInfo);
        twgl.setUniforms(ballRayTracingProgramInfo, uniforms);
        twgl.drawBufferInfo(gl, ballBufferInfo);

        // draw skybox
        gl.useProgram(skyboxProgramInfo.program);
        twgl.setBuffersAndAttributes(gl, skyboxProgramInfo, skyboxBufferInfo);
        twgl.setUniforms(skyboxProgramInfo, uniforms);
        twgl.drawBufferInfo(gl, skyboxBufferInfo);

        requestAnimationFrame(render);
    }
    requestAnimationFrame(render);


}
