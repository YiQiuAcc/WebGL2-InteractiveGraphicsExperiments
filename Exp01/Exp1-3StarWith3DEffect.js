// 顶点数组 | Vertex array
let vertices = [];
// 颜色数组 | Color array
let colors = [];

window.onload = () => {
    const canvas = document.getElementById("gl-canvas");
    if (!canvas) { alert("Canvas element not obtained"); return; }
    /** @type {WebGLRenderingContext} */
    const gl = canvas.getContext("webgl2")
    if (!gl) { alert("Failed to get webgl2 context"); return; }

    colors = [
        vec3(1.0, 0.84, 0.25), vec3(1.0, 0.84, 0.25), vec3(0.1, 0.10, 0.00),
        vec3(1.0, 0.84, 0.25), vec3(0.1, 0.10, 0.00), vec3(1.0, 0.84, 0.25),
        vec3(0.1, 0.10, 0.00), vec3(1.0, 0.84, 0.25), vec3(0.1, 0.10, 0.00),
        vec3(1.0, 0.84, 0.25), vec3(0.1, 0.10, 0.00), vec3(1.0, 0.84, 0.25),
    ]
    vertices = [
        // 逆时针顺序排列顶点 | Arrange vertices in counterclockwise order
        0.0, 0.0,// 中心点 | Center Point
        0.0, 1.0,               // 顶点1：外部顶点 | External vertex
        -0.224514, 0.309017,    // 顶点2：内部顶点 | Internal vertex
        -0.951057, 0.309017,    // 顶点3：外部顶点 | External vertex
        -0.363271, -0.117001,   // 顶点4：内部顶点 | Internal vertex
        -0.587785, -0.809017,   // 顶点5：外部顶点 | External vertex
        0.0, -0.381966,         // 顶点6：内部顶点 | Internal vertex
        0.587785, -0.809017,    // 顶点7：外部顶点 | External vertex
        0.363271, -0.117001,    // 顶点8：内部顶点 | Internal vertex
        0.951057, 0.309017,     // 顶点9：外部顶点 | External vertex
        0.224514, 0.309017,     // 顶点10：内部顶点 | Internal vertex
        0.0, 1.0                // 顶点11：外部顶点 | External vertex
    ];

    gl.viewport(0, 0, canvas.width, canvas.height); // 设置视口 | Set viewport
    gl.clearColor(0.0, 0.0, 0.0, 1.0);              // 设置清除颜色 | Set clear color
    const program = initShaders(gl, "vertex-shader", "fragment-shader");  // 初始化着色器 | Initialize the shader
    gl.useProgram(program);    // 使用着色器 | Use shaders

    const verticesBufferID = gl.createBuffer();         // 创建顶点缓冲区 | Create a vertex buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, verticesBufferID);   // 绑定顶点缓冲区 | Bind vertex buffer
    gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW);  // 向缓冲区写入顶点数据 | Write vertex data to the buffer

    // 获取名称为"a_Position"的shader属性变量 | Get the shader attribute variable named "a_Position"
    const a_PositionLoc = gl.getAttribLocation(program, "a_Position");
    if (a_PositionLoc < 0) { alert("Failed to get a_Position"); return; }
    // 将缓冲区中的数据传递给顶点着色器中的a_Position变量 | Pass the data in the buffer to the a_Position variable in the vertex shader
    gl.vertexAttribPointer(a_PositionLoc, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_PositionLoc);// 启用顶点着色器中的a_Position变量 | Enable the a_Position variable in the vertex shader

    const colorsBufferID = gl.createBuffer();       // 创建颜色缓冲区 | Create a color buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, colorsBufferID); // 绑定颜色缓冲区 | Bind a color buffer
    gl.bufferData(gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW);    // 向缓冲区写入颜色数据 | Write color data to the buffer
    
    const a_ColorLoc = gl.getAttribLocation(program, "a_Color");        // 获取顶点着色器中的a_Color变量 | get the a_Color variable in the vertex shader
    if (a_ColorLoc < 0) { alert("Failed to get a_Color"); return; }
    // 将缓冲区中的数据传递给顶点着色器中的a_Color变量 | Pass the data in the buffer to the a_Color variable in the vertex shade
    gl.vertexAttribPointer(a_ColorLoc, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_ColorLoc); // 启用顶点着色器中的a_Color变量 | Enable the a_Color variable in the vertex shader

    render(gl);
}
/** @param {WebGLRenderingContext} gl */
function render(gl) {
    gl.clear(gl.COLOR_BUFFER_BIT)
    // gl.drawArrays(gl.POINTS, 0, vertices.length)
    // gl.drawArrays(gl.LINE_LOOP, 0, vertices.length);
    // 绘制图元类型为三角条带, 从第零个顶点开始, 绘制vertices.length个
    // Draw the primitive type as a triangle strip, starting from the zeroth vertex, and draw vertices.length
    gl.drawArrays(gl.TRIANGLE_FAN, 0, vertices.length);
}
