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

    // 初始渲染设置 | Initial rendering settings
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    gl.enable(gl.DEPTH_TEST);
    // 初始化着色器 | Initialize shaders
    const program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    const bufferID = gl.createBuffer();         // 顶点和颜色使用同一个缓冲区 | Vertex and color use the same buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferID);   // 绑定缓冲区 | Bind buffer
    
    updateData();

    // 将缓冲区中的顶点数据传递给a_Position | Pass data to a_Position
    const a_PositionLoc = gl.getAttribLocation(program, "a_Position");
    if (a_PositionLoc < 0) { alert("Failed to get a_Position"); return; }
    gl.vertexAttribPointer(a_PositionLoc, 3, gl.FLOAT, false, 6 * 4, 0);
    gl.enableVertexAttribArray(a_PositionLoc);

    // 将缓冲区中的颜色数据传递给a_Color | Pass data to a_Color
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
    if (VerticesCount == 9 * Math.pow(4.0, iterations)) return;
    VerticesCount = 9 * Math.pow(4.0, iterations);    // 更新顶点数 | Update the number of vertices
    updateData();           // 重新初始化顶点数据 | Reinitialize vertex data
    render();               // 重新绘制 | Redraw
    event.preventDefault(); // 屏蔽默认鼠标响应 | Shut down default mouse response
};

function divideTetra(a, b, c, d, k) {
    if (k > 0) {
        const mid = [
            // 计算各边的中点 | Calculate the midpoint of each edge
            mult(0.5, add(a, b)),
            mult(0.5, add(a, c)),
            mult(0.5, add(a, d)),
            mult(0.5, add(b, c)),
            mult(0.5, add(c, d)),
            mult(0.5, add(b, d))
        ];
        divideTetra(a, mid[0], mid[1], mid[2], k - 1);
        divideTetra(mid[0], b, mid[3], mid[5], k - 1);
        divideTetra(mid[1], mid[3], c, mid[4], k - 1);
        divideTetra(mid[2], mid[5], mid[4], d, k - 1);
    } else {
        tetra(a, b, c, d);
    }
}

function tetra(a, b, c, d) {
    triangle(a, b, c, 0);
    triangle(a, c, d, 1);
    triangle(a, d, b, 2);
}

function updateData() {
    // 清空现有顶点属性数据 | Clear existing vertex attribute data
    attributes.length = 0;
    divideTetra(vertices[0], vertices[1], vertices[2], vertices[3], iterations);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(attributes), gl.STATIC_DRAW);
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