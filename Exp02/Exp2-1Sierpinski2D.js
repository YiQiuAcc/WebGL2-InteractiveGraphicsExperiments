const PointCount = 10000;
let vertices = [];
let points = [];
let colors = [];

window.onload = () => {
    const canvas = document.getElementById("gl-canvas");
    if (!canvas) { alert("Canvas element not obtained"); return; }
    /** @type {WebGLRenderingContext} */
    const gl = canvas.getContext("webgl2")
    if (!gl) { alert("Failed to get webgl2 context"); return; }

    vertices = [
        vec2(-1.0, -1.0), vec2(0.0, 1.0), vec2(1.0, -1.0)
    ];

    const a = Math.random();
    const b = (1 - a) * Math.random();
    let currentPoint = add(mult(a, vertices[0]), add(mult(b, vertices[1]), mult(1 - a - b, vertices[2])));
    console.log("Initial point: (", Number(currentPoint[0]).toFixed(4), ",", Number(currentPoint[1]).toFixed(4), ")")
    // points.push(currentPoint); // 初始点加入数组 | Add the initial point to the array

    for (let i = 0; i < PointCount; i++) {
        // 通过随机选择三个顶点中的一个，计算当前点与选中顶点的中点
        // Calculate the current point and the midpoint of 
        // the selected vertex by randomly selecting one of the three vertices.
        const j = Math.floor(Math.random() * 3);
        currentPoint = mult(0.5, add(currentPoint, vertices[j]));
        points.push(currentPoint);
    }

    for (let i = 0; i < PointCount; i++) {
        colors.push(vec4(Math.random(), Math.random(), Math.random(), 1.0))
    }

    gl.viewport(0, 0, canvas.width, canvas.height); // 设置视口 | Set viewport
    gl.clearColor(0.0, 0.0, 0.0, 1.0);              // 设置清除颜色 | Set clear color
    const program = initShaders(gl, "vertex-shader", "fragment-shader");  // 初始化着色器 | Initialize the shader
    gl.useProgram(program);    // 使用着色器 | Use shaders

    const verticesBufferID = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, verticesBufferID);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW);

    // 获取名称为"a_Position"的shader属性变量 | Get the shader attribute variable named "a_Position"
    const a_PositionLoc = gl.getAttribLocation(program, "a_Position");
    if (a_PositionLoc < 0) { alert("Failed to get a_Position"); return; }
    gl.vertexAttribPointer(a_PositionLoc, 2, gl.FLOAT, false, 0, 0);
    // 启用顶点着色器中的a_Position变量 | Enable the a_Position variable in the vertex shader
    gl.enableVertexAttribArray(a_PositionLoc);

    const colorsBufferID = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorsBufferID);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW);
    // 获取顶点着色器中的属性变量a_Color的位置 | Get the position of the attribute variable a_Color in the vertex shader
    const a_ColorLoc = gl.getAttribLocation(program, "a_Color");
    if (a_ColorLoc < 0) { alert("Failed to get a_Color"); return; }
    gl.vertexAttribPointer(a_ColorLoc, 3, gl.FLOAT, false, 0, 0);
    // 启用顶点着色器中的a_Color变量 | Enable the a_Color variable in the vertex shader
    gl.enableVertexAttribArray(a_ColorLoc);

    render(gl);
}
/**
 * 渲染函数 | Rendering function
 * @param {WebGLRenderingContext} gl 
 */
function render(gl) {
    gl.clear(gl.COLOR_BUFFER_BIT);
    // 绘制图元类型为点, 从第零个顶点开始, point.length个
    // Draw the primitive type as a point, starting from the zeroth vertex, and draw point.length
    gl.drawArrays(gl.POINTS, 0, points.length);
}