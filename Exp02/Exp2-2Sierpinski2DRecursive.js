let NumSubdivideTimes = 5;
let NumTriangles = Math.pow(3, NumSubdivideTimes);
let NumVertices = 3 * NumTriangles;
/** @type {WebGLRenderingContext} */
let gl;
/** @type {WebGLBuffer} 顶点缓冲区对象 | Vertex Buffer Object*/
let verticesBufferID;
let points = [];

const vertices = [
    vec2(-1.0, -1.0), vec2(0.0, 1.0), vec2(1.0, -1.0)
];

window.onload = () => {
    const canvas = document.getElementById("gl-canvas")
    if (!canvas) { alert("Canvas element not obtained"); return; }
    gl = canvas.getContext("webgl2")
    if (!gl) { alert("Failed to get webgl2 context"); return; }
    // 初始渲染设置 | Initial rendering settings
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(1.0, 1.0, 1.0, 1.0);

    // 创建并绑定缓冲区 | Create and bind buffer
    verticesBufferID = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, verticesBufferID);

    // 初始化着色器 | Initialize shaders
    const program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    // 设置顶点属性指针 | Set vertex attribute pointer
    const a_PositionLoc = gl.getAttribLocation(program, "a_Position");
    gl.vertexAttribPointer(a_PositionLoc, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_PositionLoc);

    generateGeometry();
}

window.addEventListener('contextmenu', e => e.preventDefault(), false);
window.addEventListener("mousedown", function (e) {
    if (e.button === 0) {       // 左键减少递归次数 | Click left mouse button to reduce recursion times
        NumSubdivideTimes = Math.max(0, NumSubdivideTimes - 1);
    } else if (e.button === 2) {// 右键增加递归次数 | Click right mouse button to increase recursion times
        NumSubdivideTimes = Math.min(10, NumSubdivideTimes + 1);
    }
    e.preventDefault(); // 阻止默认操作 | Prevent default operation
    generateGeometry();     // 重新生成几何图形 | Recalculate the geometry
    console.log("Current recursion times:", NumSubdivideTimes);
});

function generateGeometry() {
    // 重新计算顶点 | Recalculate the vertices
    NumTriangles = Math.pow(3, NumSubdivideTimes);
    NumVertices = 3 * NumTriangles;
    // 重新生成顶点 | Regenerate the vertices
    points = [];
    divideTriangle(vertices[0], vertices[1], vertices[2], NumSubdivideTimes);
    // 更新缓冲区数据 | Update buffer data
    gl.bindBuffer(gl.ARRAY_BUFFER, verticesBufferID);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW);
    render(gl); // 重绘 | Redraw
}

function triangle(a, b, c) {
    points.push(a);
    points.push(b);
    points.push(c);
}
/**
 * 递归分割三角形为更小的三角形 | Recursively divide the triangle into smaller triangles
 * @param {Array} a - 三角形的第一个顶点坐标 | Vertex coordinates of the first triangle
 * @param {Array} b - 三角形的第二个顶点坐标 | Vertex coordinates of the second triangle
 * @param {Array} c - 三角形的第三个顶点坐标 | Vertex coordinates of the third triangle
 * @param {number} count - 递归次数，决定细分程度
 */
function divideTriangle(a, b, c, count) {
    // 当递归次数大于0时继续分割 | When the recursion count is greater than 0, continue to divide
    if (count > 0) {
        // 计算边ab的中点 | Calculate the midpoint of edge ab
        const ab = mult(add(a, b), 0.5);
        // 计算边ac的中点 | Calculate the midpoint of edge ac
        const ac = mult(add(a, c), 0.5);
        // 计算边bc的中点 | Calculate the midpoint of edge bc
        const bc = mult(add(b, c), 0.5);
        // 递归调用，将大三角形分为三个较小的三角形之一
        // Recursively call to divide the large triangle into one of three smaller triangles
        divideTriangle(a, ab, ac, count - 1);
        divideTriangle(c, ac, bc, count - 1);
        divideTriangle(b, bc, ab, count - 1);
    } else {
        // 当递归次数达到0时绘制三角形 | When the recursion count reaches 0, draw the triangle
        triangle(a, b, c);
    }
}
/**
 * 渲染函数 | Rendering function
 * @param {WebGLRenderingContext} gl 
 */
function render(gl) {
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, NumVertices);
}