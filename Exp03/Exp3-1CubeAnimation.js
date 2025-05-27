const size = 25;
const vertices = [
    vec2(-size, -size), vec2(size, -size),
    vec2(size, size), vec2(-size, size)
];
// 定义旋转角度与速度 | Define rotation angle and speed
let u_Angle;
let angle = 0;
let rotationSpeed = 60;
let lastTime = 0;
/** @type {WebGLRenderingContext} */ let gl;

window.onload = () => {
    const canvas = document.getElementById("gl-canvas");
    if (!canvas) { alert("Canvas element not obtained"); return; }
    /** @type {WebGLRenderingContext} */
    gl = canvas.getContext("webgl2")
    if (!gl) { alert("Failed to get webgl2 context"); return; }

    gl.viewport(0, 0, canvas.width, canvas.height); // 设置视口 | Set viewport
    gl.clearColor(0.0, 0.0, 0.0, 1.0);              // 设置清除颜色 | Set clear color
    const program = initShaders(gl, "vertex-shader", "fragment-shader");  // 初始化着色器 | Initialize the shader
    gl.useProgram(program);    // 使用着色器 | Use shaders

    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();
    function resizeCanvas() {
        const rect = canvas.getBoundingClientRect();
        canvas.width = innerWidth - 2 * rect.left;
        canvas.height = innerHeight - 60;
        if (canvas.width > canvas.height) {
            gl.viewport((canvas.width - canvas.height) / 2, 0, canvas.height, canvas.height)
        } else {
            gl.viewport(0, (canvas.height - canvas.width) / 2, canvas.width, canvas.width)
        }
    }

    const verticesBufferID = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, verticesBufferID);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW);

    const u_matProj = gl.getUniformLocation(program, "u_matProj");
    const u_Color = gl.getUniformLocation(program, "u_Color");
    u_Angle = gl.getUniformLocation(program, "u_Angle");

    // 初始化Uniform | Initialize Uniform
    gl.uniformMatrix4fv(u_matProj, false, flatten(ortho2D(-size * 2, size * 2, -size * 2, size * 2)));
    gl.uniform3f(u_Color, 1.0, 1.0, 1.0);    // 设置颜色 | Set color

    const a_PositionLoc = gl.getAttribLocation(program, "a_Position");
    if (a_PositionLoc < 0) { alert("Failed to get a_Position"); return; }
    gl.vertexAttribPointer(a_PositionLoc, 2, gl.FLOAT, false, 0, 0);
    // 启用顶点着色器中的a_Position变量 | Enable the a_Position variable in the vertex shader
    gl.enableVertexAttribArray(a_PositionLoc);

    // 绑定按钮和下拉菜单事件 | Bind button and drop-down menu events
    document.getElementById("hurryup").addEventListener("click", () => { rotationSpeed += 10; });
    document.getElementById("slowdown").addEventListener("click", () => { rotationSpeed -= 10; });
    document.getElementById("color-menu").addEventListener("change", (event) => {
        const colorValues = event.target.value.split(',').map(parseFloat);  // 获取选项中的颜色值 | Get color values from the option
        gl.uniform3f(u_Color, colorValues[0], colorValues[1], colorValues[2]);
    });

    render(0);
}

function render(timestamp) {
    const elapsed = timestamp - lastTime;
    lastTime = timestamp;
    angle = (angle + rotationSpeed * elapsed / 1000) % 360;
    gl.uniform1f(u_Angle, angle);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
    requestAnimationFrame(render);
}
