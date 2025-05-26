let attributes = [];
let iterations = 0;
let xRot = 0.0;
let yRot = 0.0;
let VerticesCount = 24 * Math.pow(3, iterations);
/** @type {WebGLRenderingContext} */
let gl;
let u_matMVPLoc;
// 投影矩阵 | Projection matrix
const matProj = ortho2D(-1, 1, -1, 1);
// 八面体顶点 | Octahedron vertex
const vertices = [
    vec3(1.0, 0.0, 0.0),   // 右顶点 (红) | Right vertex (red)
    vec3(-1.0, 0.0, 0.0),  // 左顶点 (绿) | Left vertex (green)
    vec3(0.0, 1.0, 0.0),   // 上顶点 (蓝) | Upper vertex (blue)
    vec3(0.0, -1.0, 0.0),  // 下顶点 (黄) | Lower vertex (yellow)
    vec3(0.0, 0.0, 1.0),   // 前顶点 (青) | Front vertex (cyan)
    vec3(0.0, 0.0, -1.0)   // 后顶点 (紫) | Back vertex (purple)
];
const colors = [
    vec3(1.0, 0.0, 0.0),   // 红 | Red
    vec3(0.0, 1.0, 0.0),   // 绿 | Green
    vec3(0.0, 0.0, 1.0),   // 蓝 | Blue
    vec3(1.0, 1.0, 0.0),   // 黄 | Yellow
    vec3(0.0, 1.0, 1.0),   // 青 | Cyan
    vec3(1.0, 0.0, 1.0),   // 紫 | Purple
    vec3(1.0, 0.5, 0.0),   // 橙 | Orange
    vec3(0.5, 0.0, 1.0)    // 靛 | Violet
];

window.onload = () => {
    const canvas = document.getElementById("gl-canvas")
    if (!canvas) { alert("Canvas element not obtained"); return; }
    gl = canvas.getContext("webgl2")
    if (!gl) { alert("Failed to get webgl2 context"); return; }

    // 初始渲染设置 | Initial rendering settings
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    gl.enable(gl.DEPTH_TEST);
    // 初始化着色器 | Initialize shaders
    const program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);
    // 顶点和颜色使用同一个缓冲区 | Vertex and color use the same buffer
    const bufferID = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferID);   // 绑定缓冲区 | Bind buffer

    updateData();

    // 获取uniform变量u_matMVP的索引 | Get the index of uniform variable u_matMVP
    u_matMVPLoc = gl.getUniformLocation(program, "u_matMVP");
    if (!u_matMVPLoc) { alert("Failed to get u_matMVP"); return; }

    // 将缓冲区中的数据传递给a_Position | Pass data in the buffer to a position
    const a_PositionLoc = gl.getAttribLocation(program, "a_Position");
    if (a_PositionLoc < 0) { alert("Failed to get a_Position"); return; }
    gl.vertexAttribPointer(a_PositionLoc, 3, gl.FLOAT, false, 6 * 4, 0);
    gl.enableVertexAttribArray(a_PositionLoc);

    // 设置颜色属性指针 | Set vertex attribute pointer
    const a_ColorLoc = gl.getAttribLocation(program, "a_Color");
    if (a_ColorLoc < 0) { alert("Failed to get a_Color"); return; }
    gl.vertexAttribPointer(a_ColorLoc, 3, gl.FLOAT, false, 6 * 4, 3 * 4);
    gl.enableVertexAttribArray(a_ColorLoc);
    
    // 添加按键响应 | Add keyboard response
    window.addEventListener("keydown", keyDown, true);
    // 注册鼠标点击事件响应函数 | Register a mouse click event response function
    canvas.onmousedown = e => mouseDown(e);
    canvas.oncontextmenu = e => e.preventDefault();
    render();
}

function mouseDown(event) {
    switch (event.button) {
        case 0: if (iterations < 5) iterations++; break;
        case 2: if (iterations > 0) iterations--; break;
    }
    if (VerticesCount === 24 * Math.pow(3, iterations)) return;
    VerticesCount = 24 * Math.pow(3, iterations);
    updateData();
    render();
    event.preventDefault();
};

function keyDown(event) {
    let keyID = event.keyCode ? event.keyCode : event.which;
    switch (keyID) {
        case 38: xRot -= 5.0; break;    // 上方向键 | Up key
        case 40: xRot += 5.0; break;    // 下方向键 | Down key
        case 37: yRot -= 5.0; break;    // 左方向键 | Left key
        case 39: yRot += 5.0; break;    // 右方向键 | Right key
        default: return;
    }
    if (xRot > 356.0) xRot = 0.0;
    if (xRot < -1.0) xRot = 355.0;
    if (yRot > 356.0) yRot = 0.0;
    if (yRot < -1.0) yRot = 355.0;
    render();
}

function divideOcta(a, b, c, k, colorIndex) {
    if (k > 0) {
        const AB = mult(0.45, add(a, b));
        const BC = mult(0.45, add(b, c));
        const CA = mult(0.45, add(c, a));
        // 递归处理三角形
        divideOcta(a, AB, CA, k - 1, colorIndex);
        divideOcta(AB, b, BC, k - 1, colorIndex);
        divideOcta(CA, BC, c, k - 1, colorIndex);
    } else {
        triangle(a, b, c, colorIndex);
    }
}

function initOcta() {
    // 初始化八面体面 | Initialize the octahedron face
    divideOcta(vertices[0], vertices[2], vertices[4], iterations, 0);
    divideOcta(vertices[0], vertices[4], vertices[3], iterations, 1);
    divideOcta(vertices[0], vertices[3], vertices[5], iterations, 2);
    divideOcta(vertices[0], vertices[5], vertices[2], iterations, 3);
    divideOcta(vertices[1], vertices[2], vertices[5], iterations, 4);
    divideOcta(vertices[1], vertices[5], vertices[3], iterations, 5);
    divideOcta(vertices[1], vertices[3], vertices[4], iterations, 6);
    divideOcta(vertices[1], vertices[4], vertices[2], iterations, 7);
}

function triangle(a, b, c, colorIndex) {
    const color = colors[colorIndex % colors.length];
    attributes.push(...a, ...color);
    attributes.push(...b, ...color);
    attributes.push(...c, ...color);
}

function updateData() {
    attributes.length = 0;
    initOcta();
    document.getElementById("iterations").innerText = iterations;
    gl.bufferData(gl.ARRAY_BUFFER, flatten(attributes), gl.STATIC_DRAW);
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    let matMVP = mult(matProj, mult(rotateX(xRot), rotateY(yRot)));    // 计算模视投影矩阵
    gl.uniformMatrix4fv(u_matMVPLoc, false, flatten(matMVP));    // 将矩阵值传给Shader
    gl.drawArrays(gl.TRIANGLES, 0, VerticesCount);
}
