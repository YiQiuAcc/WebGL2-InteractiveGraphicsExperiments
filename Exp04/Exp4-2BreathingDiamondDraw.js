const MaxHalfSize = 30;
const FSIZE = Float32Array.BYTES_PER_ELEMENT;
const MIN_DISTANCE = 15; // 最小间隔像素 | Minimum distance between squares
const MaxCount = 2000;
const MaxVerticesCount = MaxCount * 8;
// 存储所有已生成图形的中心坐标 | Store the center coordinates of all generated graphics
let centers = [];
let count = 0;
let u_Time;
/** @type {WebGLRenderingContext} */ let gl;
/** @type {HTMLCanvasElement} */ let canvas;

window.onload = () => {
    canvas = document.getElementById("gl-canvas");
    if (!canvas) { alert("Canvas element not obtained"); return; }
    /** @type {WebGLRenderingContext} */
    gl = canvas.getContext("webgl2")
    if (!gl) { alert("Failed to get webgl2 context"); return; }

    gl.viewport(0, 0, canvas.width, canvas.height); // 设置视口 | Set viewport
    gl.clearColor(0.05, 0.05, 0.05, 1.0);
    const program = initShaders(gl, "vertex-shader", "fragment-shader");  // 初始化着色器 | Initialize the shader
    gl.useProgram(program);    // 使用着色器 | Use shaders
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    bufferID = gl.createBuffer();    // 创建缓冲区 | Create a buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferID);
    gl.bufferData(gl.ARRAY_BUFFER, 10 * MaxVerticesCount * FSIZE, gl.STATIC_DRAW);

    // 设置顶点属性 | Set vertex attributes
    const variables = {
        a_Position: { size: 3, offset: 0 },
        a_Color: { size: 3, offset: 3 * FSIZE },
        a_Center: { size: 2, offset: 8 * FSIZE },
    };

    Object.entries(variables).forEach(([name, { size, offset }]) => {
        const loc = gl.getAttribLocation(program, name);
        if (loc < 0) { alert("Get variable location failed"); return; }
        gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 10 * FSIZE, offset);
        gl.enableVertexAttribArray(loc);
    });

    u_Time = gl.getUniformLocation(program, "u_Time");
    const u_matMVP = gl.getUniformLocation(program, "u_matMVP")
    if (u_matMVP < 0) { alert("Failed to get u_matMVP"); return; }
    const resizeCanvas = () => {
        const rect = canvas.getBoundingClientRect();
        canvas.width = innerWidth - 2 * rect.left;
        canvas.height = innerHeight - 20;
        const matProj = ortho2D(0, canvas.width, 0, canvas.height);
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.uniformMatrix4fv(u_matMVP, false, flatten(matProj));
    };
    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();

    // 鼠标交互 | Mouse interaction
    canvas.onclick = (e) => addDiamond(e);
    canvas.onmousemove = (e) => { if (e.buttons === 1) addDiamond(e); };
    render();
}

function render() {
    gl.uniform1f(u_Time, performance.now() * 0.001);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.LINES, 0, count * 8);
    requestAnimationFrame(render);
}

function addDiamond(event) {
    if (count >= MaxCount) return;
    // 坐标转换 | Coordinate transformation
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = canvas.height - (event.clientY - rect.top);
    // 生成属性 | Generate attributes
    const halfSize = Math.max(8.0, MaxHalfSize * Math.random());
    const color = [Math.random(), Math.random(), Math.random()];
    const isValidPosition = centers.every(center => {
        const dx = center[0] - x;
        const dy = center[1] - y;
        return Math.sqrt(dx * dx + dy * dy) >= MIN_DISTANCE;
    });

    if (!isValidPosition && centers.length > 0) return;
    // 记录新中心点 | Record new center point
    centers.push([x, y]);

    const vertices = [
        x - halfSize, y, 0,     // 左点 | Left point
        x, y + halfSize, 0,     // 上点 | Top point
        x, y + halfSize, 0,     // 上点 | Top point
        x + halfSize, y, 0,     // 右点 | Right point
        x + halfSize, y, 0,     // 右点 | Right point
        x, y - halfSize, 0,     // 下点 | Bottom point
        x, y - halfSize, 0,     // 下点 | Bottom point
        x - halfSize, y, 0      // 左点 | Left point
    ];
    // 构建缓冲区数据 | Build buffer data
    const data = new Float32Array(10 * 8); // 10元素/顶点 × 8顶点 | 10 elements/vertex × 8 vertices
    for (let i = 0; i < 8; i++) {
        const base = i * 10;
        // 位置 | Position
        const xPos = vertices[i * 3];
        const yPos = vertices[i * 3 + 1];
        data.set([xPos, yPos, vertices[i * 3 + 2]], base);
        // 颜色 | Color
        data.set(color, base + 3);
        // 中心点 | Center point
        data.set([x, y], base + 8);
    }
    // 更新缓冲区 | Update buffer
    gl.bufferSubData(gl.ARRAY_BUFFER, count * 8 * 10 * FSIZE, data);
    count++;
}
