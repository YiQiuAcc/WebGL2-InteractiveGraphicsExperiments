const InitCapacity = 500;
const MaxHalfSize = 30;
const FSIZE = Float32Array.BYTES_PER_ELEMENT;

let bufferCapacity = InitCapacity;
let vertexData = new Float32Array(bufferCapacity * 6 * 6);
let a_Position, a_Color;
let bufferID;
let count = 0;
/** @type {WebGLRenderingContext} */
let gl;
/** @type {HTMLCanvasElement} */
let canvas;

window.onload = () => {
    canvas = document.getElementById("gl-canvas");
    if (!canvas) { alert("Canvas element not obtained"); return; }
    /** @type {WebGLRenderingContext} */
    gl = canvas.getContext("webgl2")
    if (!gl) { alert("Failed to get webgl2 context"); return; }

    gl.viewport(0, 0, canvas.width, canvas.height); // 设置视口 | Set viewport
    const program = initShaders(gl, "vertex-shader", "fragment-shader");  // 初始化着色器 | Initialize the shader
    gl.useProgram(program);    // 使用着色器 | Use shaders
    gl.clearColor(0.9, 0.9, 0.9, 1.0);

    bufferID = gl.createBuffer();    // 创建缓冲区
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferID);    // 绑定缓冲区
    gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.DYNAMIC_DRAW);

    a_Position = gl.getAttribLocation(program, "a_Position");
    if (a_Position < 0) { alert("Failed to get a_Position"); return; }
    gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, FSIZE * 6, 0);
    gl.enableVertexAttribArray(a_Position);

    a_Color = gl.getAttribLocation(program, "a_Color");
    if (a_Color < 0) { alert("Failed to get a_Color"); return; }
    gl.vertexAttribPointer(a_Color, 3, gl.FLOAT, false, FSIZE * 6, FSIZE * 3);
    gl.enableVertexAttribArray(a_Color);

    const u_matMVP = gl.getUniformLocation(program, "u_matMVP")
    if (u_matMVP < 0) { alert("Failed to get u_matMVP"); return; }
    const matProj = ortho2D(0, canvas.width, 0, canvas.height);
    gl.uniformMatrix4fv(u_matMVP, false, flatten(matProj));

    canvas.onclick = (event) => { addSquare(event.clientX, event.clientY); }

    let isDrawing = false;
    canvas.onmousedown = (event) => { if (event.button == 0) isDrawing = true; };
    canvas.onmouseup = (event) => { if (event.button == 0) isDrawing = false; };
    canvas.onmousemove = (event) => {
        if (isDrawing) addSquare(event.clientX, event.clientY);
    };

    render();
}

function render() {
    // 使用当前缓冲区 | Use the current buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferID);
    // 重新绑定顶点属性 | Rebind vertex attributes
    gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 6 * FSIZE, 0);
    gl.vertexAttribPointer(a_Color, 3, gl.FLOAT, false, 6 * FSIZE, 3 * FSIZE);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, count * 6);
    requestAnimationFrame(render);
}

function addSquare(x, y) {
    const rect = canvas.getBoundingClientRect();
    x = x - rect.left;
    y = canvas.height - (y - rect.top);
    const halfSize = MaxHalfSize * Math.random(); // 随机大小 | Random size
    const vertices = [
        vec3(x - halfSize, y + halfSize, 0), vec3(x - halfSize, y - halfSize, 0),
        vec3(x + halfSize, y - halfSize, 0), vec3(x - halfSize, y + halfSize, 0),
        vec3(x + halfSize, y - halfSize, 0), vec3(x + halfSize, y + halfSize, 0)
    ];
    const colors = [
        vec3(Math.random(), Math.random(), Math.random()), // 颜色1 (左上) | Color 1 (left top)
        vec3(Math.random(), Math.random(), Math.random()), // 颜色2 (左下) | Color 2 (left bottom)
        vec3(Math.random(), Math.random(), Math.random()), // 颜色3 (右上) | Color 3 (right top)
        vec3(Math.random(), Math.random(), Math.random())  // 颜色4 (右下) | Color 4 (right bottom)
    ];
    const vertexColors = [
        colors[0], colors[1], colors[3], // 第一个三角形 | The first triangle
        colors[0], colors[3], colors[2]  // 第二个三角形 | The second triangle
    ];

    const data = new Float32Array(6 * 6); // 每个正方形6顶点×6属性 | 6 vertices × 6 attributes per vertex
    let offset = 0;
    for (let i = 0; i < 6; i++) {
        data[offset++] = vertices[i][0];     // x
        data[offset++] = vertices[i][1];     // y
        data[offset++] = vertices[i][2];     // z
        data[offset++] = vertexColors[i][0]; // r
        data[offset++] = vertexColors[i][1]; // g
        data[offset++] = vertexColors[i][2]; // b
    }
    // 检查缓冲区容量 | Check buffer capacity
    if (count >= bufferCapacity) expandBuffer();

    // 更新内存数据和显存数据 | Update memory and display memory data
    const elementSize = 6;
    const startIndex = count * 6 * elementSize;
    // 更新内存中的vertexData | Update vertexData in memory
    vertexData.set(data, startIndex);
    // 更新显存数据 | Update display memory data
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferID);
    gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.DYNAMIC_DRAW);
    count++;
}
// 动态扩展缓冲区 | Dynamic expansion of buffer
function expandBuffer() {
    const newCapacity = bufferCapacity * 2; // 容量翻倍 | Capacity double
    const newData = new Float32Array(newCapacity * 6 * 6);
    newData.set(vertexData);                // 复制旧数据 | Copy old data
    const newBuffer = gl.createBuffer();    // 创建新缓冲区 | Create a new buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, newBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, newData, gl.DYNAMIC_DRAW);
    gl.deleteBuffer(bufferID);              // 更新引用 | Update reference
    bufferID = newBuffer;
    vertexData = newData;
    bufferCapacity = newCapacity;
    console.log(`Double the buffer capacity: ${newCapacity}`);
}
