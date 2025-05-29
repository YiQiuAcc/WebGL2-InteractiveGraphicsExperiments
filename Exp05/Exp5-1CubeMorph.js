const halfSize = 1;
const nVertexCountPerSide = 20; // 正方形细分后每行顶点数 | Number of vertices per side
const nTriangleCount = (nVertexCountPerSide - 1) *
    (nVertexCountPerSide - 1) * 2;  // 一个面的三角形数 | Trangle count per side
const nIndexCount = nTriangleCount * 3; // 一个面的顶点索引数 | Triangle count per side
const step = halfSize * 2 / (nVertexCountPerSide - 1);
const nVertexCount = nVertexCountPerSide * nVertexCountPerSide; //一个面的顶点数 | Number of vertices per side
const matProj = ortho(
    -halfSize * 2, halfSize * 2,    // x
    -halfSize * 2, halfSize * 2,    // y
    -halfSize * 2, halfSize * 2);   // z
/** @type {WebGL2RenderingContext} */ let gl;
/** @type {HTMLCanvasElement} */ let canvas;
let axis = 1;
let time = 0;
let delta = 60;
let u_Time;
let u_MVPMatrix;
let vertices = [];
let lastTime = Date.now();
let angle = [0.0, 0.0, 0.0];
let indexes = new Uint16Array(nIndexCount);

window.onload = () => {
    canvas = document.getElementById("gl-canvas");
    if (!canvas) { alert("Canvas element not obtained"); return; }
    gl = canvas.getContext("webgl2")
    if (!gl) { alert("Failed to get webgl2 context"); return; }

    let y = halfSize;
    for (let i = 0; i < nVertexCountPerSide; i++) {
        let x = -halfSize;
        for (let j = 0; j < nVertexCountPerSide; j++) {
            vertices.push(vec3(x, y, halfSize));
            x += step;
        }
        y -= step;
    }
    let index = 0, start = 0;
    for (let i = 0; i < nVertexCountPerSide - 1; i++) {
        for (let j = 0; j < nVertexCountPerSide - 1; j++) {
            indexes[index++] = start;
            indexes[index++] = start + nVertexCountPerSide;
            indexes[index++] = start + nVertexCountPerSide + 1;
            indexes[index++] = start;
            indexes[index++] = start + nVertexCountPerSide + 1;
            indexes[index++] = start + 1;
            start++;
        }
        start++;
    }
    
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    const program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    const vertexBufferID = gl.createBuffer();    // 顶点坐标 | vertexBuffer
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBufferID);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW);
    const indexBufferID = gl.createBuffer();    // 顶点索引序列 | indexBuffer
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBufferID);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indexes, gl.STATIC_DRAW);

    const a_Position = gl.getAttribLocation(program, "a_Position");
    if (a_Position < 0) { alert("Failed to get a_Position"); return; }
    gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Position);
    u_MVPMatrix = gl.getUniformLocation(program, "u_MVPMatrix");
    if (!u_MVPMatrix) { alert("Failed to get u_matMVP"); return; }
    const u_MinDist = gl.getUniformLocation(program, "u_MinDist");
    if (!u_MinDist) { alert("Failed to get u_MinDist"); return; }
    const u_MaxDist = gl.getUniformLocation(program, "u_MaxDist");
    if (!u_MaxDist) { alert("Failed to get u_MaxDist"); return; }
    u_Time = gl.getUniformLocation(program, "u_Time");
    if (!u_Time) { alert("Failed to get u_Time"); return; }
    gl.uniform1f(u_MinDist, halfSize);
    gl.uniform1f(u_Time, 0.0);
    gl.uniform1f(u_MaxDist, Math.sqrt(3.0) * halfSize);

    canvas.onmousedown = (event) => {
        switch (event.button) {
            case 0: axis = 0; break;
            case 1: axis = 1; break;
            case 2: axis = 2; break;
        }
    };
    canvas.oncontextmenu = (event) => { event.preventDefault(); };
    render();
};

function render() {
    animation();
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    const matMVP = mult(matProj,
        mult(rotateX(angle[0]), mult(rotateY(angle[1]), rotateZ(angle[2]))));
    // 绘制前面 | Front
    gl.uniformMatrix4fv(u_MVPMatrix, false, flatten(matMVP));
    gl.drawElements(gl.TRIANGLES, nIndexCount, gl.UNSIGNED_SHORT, 0);
    // 绘制后面(绕X轴180度)| Back
    gl.uniformMatrix4fv(u_MVPMatrix, false, flatten(mult(matMVP, rotateX(180))));
    gl.drawElements(gl.TRIANGLES, nIndexCount, gl.UNSIGNED_SHORT, 0);
    // 绘制右面(绕Y轴90度) | Right
    gl.uniformMatrix4fv(u_MVPMatrix, false, flatten(mult(matMVP, rotateY(90))));
    gl.drawElements(gl.TRIANGLES, nIndexCount, gl.UNSIGNED_SHORT, 0);
    // 绘制左面(绕Y轴-90度) | Left
    gl.uniformMatrix4fv(u_MVPMatrix, false, flatten(mult(matMVP, rotateY(-90))));
    gl.drawElements(gl.TRIANGLES, nIndexCount, gl.UNSIGNED_SHORT, 0);
    // 绘制顶面(绕X轴-90度) | Top
    gl.uniformMatrix4fv(u_MVPMatrix, false, flatten(mult(matMVP, rotateX(-90))));
    gl.drawElements(gl.TRIANGLES, nIndexCount, gl.UNSIGNED_SHORT, 0);
    // 绘制底面(绕X轴90度) | Bottom
    gl.uniformMatrix4fv(u_MVPMatrix, false, flatten(mult(matMVP, rotateX(90))));
    gl.drawElements(gl.TRIANGLES, nIndexCount, gl.UNSIGNED_SHORT, 0);
    requestAnimationFrame(render);
}

function animation() {
    const now = Date.now();
    const elapsed = now - lastTime;
    lastTime = now;
    angle[axis] += delta * elapsed / 1000.0;
    angle[axis] %= 360;
    time += elapsed / 1000.0;
    if (time > 2) time -= 2;
    gl.uniform1f(u_Time, time);
}
