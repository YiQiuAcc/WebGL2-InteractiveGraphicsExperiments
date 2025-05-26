let attributes = [];
let iterations = 0;
let VerticesCount = 12 * Math.pow(3, iterations);
/** @type {WebGLRenderingContext} */
let gl;
// 四面体顶点 | Tetrahedron vertex
const vertices = [
    vec3(0.0, 0.0, -1.0),
    vec3(0.0, 0.942809, -0.333333),
    vec3(-0.816497, -0.471405, -0.333333),
    vec3(0.816497, -0.471405, -0.333333)
];
const colors = [
    vec3(1.0, 0.0, 0.0), 	// 红 | Red
    vec3(0.0, 1.0, 0.0),    // 绿 | Green
    vec3(0.0, 0.0, 1.0),    // 蓝 | Blue
    vec3(0.0, 0.0, 0.0)     // 黑 | Black
];

window.onload = () => {
    const canvas = document.getElementById("gl-canvas")
    if (!canvas) { alert("Canvas element not obtained"); return; }
    gl = canvas.getContext("webgl2")
    if (!gl) { alert("Failed to get webgl2 context"); return; }

    tetrahedron(vertices[0], vertices[1], vertices[2], vertices[3], 4);
    // 初始渲染设置 | Initial rendering settings
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    gl.enable(gl.DEPTH_TEST);
    // 初始化着色器 | Initialize shaders
    const program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    const bufferID = gl.createBuffer();         // 顶点和颜色使用同一个缓冲区 | Vertex and color use the same buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferID);   // 绑定缓冲区 | Bind buffer
    gl.bufferData(gl.ARRAY_BUFFER, flatten(attributes), gl.STATIC_DRAW);

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

    // 注册鼠标点击事件响应函数 | Register a mouse click event response function
    canvas.onmousedown = e => mouseDown(e);
    canvas.oncontextmenu = e => e.preventDefault();
    render();
}

function mouseDown(event) {
    // 调整细分次数 | Adjust the number of subdivisions
    switch (event.button) {
        case 0:	// 鼠标左键 | Left mouse button
            if (iterations < 8) iterations++; break;
        case 2: // 鼠标右键 | Right mouse button
            if (iterations > 0) iterations--; break;
    }
    if (VerticesCount == 12 * Math.pow(3.0, iterations)) return;
    VerticesCount = 12 * Math.pow(3.0, iterations);	// 更新顶点数 | Update the number of vertices
    updateData();           // 重新初始化顶点数据 | Reinitialize vertex data
    render();               // 重新绘制 | Redraw
    event.preventDefault(); // 屏蔽默认鼠标响应 | Shut down default mouse response
};
/**
 * 生成3D Sierpinski的四面体结构 | Generate tetrahedral structure of Sierpinski 3D surface
 * @param {number} k - 递归次数 | Recursion times
 */
function tetrahedron(k) {
    divideTriangle(vertices[0], vertices[1], vertices[2], k, 0);
    divideTriangle(vertices[0], vertices[2], vertices[3], k, 1);
    divideTriangle(vertices[0], vertices[3], vertices[1], k, 2);
    divideTriangle(vertices[1], vertices[3], vertices[2], k, 3);
}
/**
 * 递归分割三角形生成3D Sierpinski | Recursively divide triangles to generate Sierpinski surface
 * @param {Array<number>} a - 三角形顶点A坐标 | Triangle vertex A coordinate
 * @param {Array<number>} b - 三角形顶点B坐标 | Triangle vertex B coordinate
 * @param {Array<number>} c - 三角形顶点C坐标 | Triangle vertex C coordinate
 * @param {number} k - 剩余递归次数 | Remaining recursive times
 * @param {number} colorIndex - 颜色索引(0-3) | Color index (0-3)
 */
function divideTriangle(a, b, c, k, colorIndex) {
    if (k > 0) {
        const ab = mult(0.5, add(a, b));
        const ac = mult(0.5, add(a, c));
        const bc = mult(0.5, add(b, c));
        divideTriangle(a, ab, ac, k - 1, colorIndex);
        divideTriangle(c, ac, bc, k - 1, colorIndex);
        divideTriangle(b, bc, ab, k - 1, colorIndex);
    } else {
        triangle(a, b, c, colorIndex);
    }
}

function updateData() {
    // 清空现有顶点属性数据 | Clear existing vertex attribute data
    attributes.length = 0;
    tetrahedron(iterations);
    // 更新缓冲数据 | Update buffer data
    gl.bufferData(gl.ARRAY_BUFFER, flatten(attributes), gl.STATIC_DRAW);
    attributes.length = 0;
}

function triangle(a, b, c, colorIndex) {
    const color = colors[colorIndex];
    attributes.push(...a, ...color);
    attributes.push(...b, ...color);
    attributes.push(...c, ...color);
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, VerticesCount);
}