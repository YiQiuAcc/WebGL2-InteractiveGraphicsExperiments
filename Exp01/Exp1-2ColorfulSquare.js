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

    vertices = [
        vec2(-0.5, -0.5), vec2(0.5, -0.5),
        vec2(-0.5, 0.5), vec2(0.5, 0.5)
    ]
    colors = [
        vec3(1.0, 0.0, 0.0), vec3(0.0, 1.0, 0.0),
        vec3(0.0, 0.0, 1.0), vec3(1.0, 1.0, 1.0)
    ]

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
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, vertices.length);
}
