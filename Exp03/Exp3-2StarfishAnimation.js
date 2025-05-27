const points = 100;
const size = 25;
/** @type {WebGLRenderingContext} */ let gl;
let starPoints = [];
let u_Time;
let u_TwistStrength;
// 动画控制参数 | Animation control parameters
let twist = { strength: 0.7, speed: 0.4 };

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

    for (let i = 0; i < points; i++) {
        const angle = i * 2 * Math.PI / points;
        const radius = size * (1 + 0.1 * Math.sin(5 * angle));
        starPoints.push(vec2(radius * Math.cos(angle), radius * Math.sin(angle)));
    }

    const verticesBufferID = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, verticesBufferID);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(starPoints), gl.STATIC_DRAW);

    const u_matProj = gl.getUniformLocation(program, "u_matProj");
    u_Time = gl.getUniformLocation(program, "u_Time"),
        u_TwistStrength = gl.getUniformLocation(program, "u_TwistStrength")
    // 初始化Uniform | Initialize Uniform
    gl.uniformMatrix4fv(u_matProj, false, flatten(ortho2D(-size * 2, size * 2, -size * 2, size * 2)));

    const a_PositionLoc = gl.getAttribLocation(program, "a_Position");
    if (a_PositionLoc < 0) { alert("Failed to get a_Position"); return; }
    gl.vertexAttribPointer(a_PositionLoc, 2, gl.FLOAT, false, 0, 0);
    // 启用顶点着色器中的a_Position变量 | Enable the a_Position variable in the vertex shader
    gl.enableVertexAttribArray(a_PositionLoc);

    // 控件交互 | Control interaction
    document.getElementById("reset").addEventListener("click", () => {
        twist = { strength: 0.7, speed: 0.4 };
        document.getElementById("strengthControl").value = twist.strength / 0.02;
    });
    document.getElementById("strengthControl").addEventListener("input", e => { twist.strength = e.target.value * 0.02; });
    // 键盘控制 | Keyboard control
    window.addEventListener("keydown", (e) => {
        switch (e.key) {
            case "ArrowUp": twist.strength = Math.min(2.0, twist.strength + 0.1); break;
            case "ArrowDown": twist.strength = Math.max(0.0, twist.strength - 0.1); break;
            case "ArrowLeft": twist.speed = Math.max(0.0, twist.speed - 0.1); break;
            case "ArrowRight": twist.speed = Math.min(2.0, twist.speed + 0.1); break;
        }
        document.getElementById("strengthControl").value = twist.strength / 0.02;
    });

    render(0);
}

function render(timestamp) {
    gl.uniform1f(u_Time, timestamp * twist.speed);
    gl.uniform1f(u_TwistStrength, twist.strength);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.LINE_LOOP, 0, starPoints.length);
    requestAnimationFrame(render);
}
