// 正方形细分后每行顶点数 | The number of vertices per row after the square is subdivided
const perSideVertexCount = 50;
// 一个面的顶点数 | The number of vertices on one face after the square is subdivided
const nVertexCount = perSideVertexCount * perSideVertexCount;
// 一个面的三角形数 | The number of triangles on one face after the square is subdivided
const triangleCount = (perSideVertexCount - 1) * (perSideVertexCount - 1) * 2;
// 一个面的顶点索引数 | The number of vertex indices on one face after the square is subdivided
const indexCount = 3 * triangleCount;

/** @type {WebGL2RenderingContext} */ let gl;
/** @type {HTMLCanvasElement} */ let canvas;
// uniform变量的索引 | Index of uniform variables
let u_MVPMatrix;
let u_StartColor;
let u_EndColor;

let matProj;    // 投影矩阵 | Projection matrix
let matMVP;     // 模视投影矩阵 | Model-View-Projection matrix
let angleX = 0.0, angleY = 0.0, angleStep = 3.0;
let yScale = 1, scaleFactor = 1.1;  // 中间长方体y的缩放因子与系数 | Y scale factor and coefficient of the middle cube
let theta = 0, delta = 60;  // 左方, 右方长方体旋转角度与每秒旋转角度 | Left and right cube rotation angle and rotation angle per second
let vertices = [];
let indexes = new Uint16Array(indexCount);

window.onload = () => {
    canvas = document.getElementById("gl-canvas");
    if (!canvas) { alert("Canvas element not obtained"); return; }
    gl = canvas.getContext("webgl2")
    if (!gl) { alert("Failed to get webgl2 context"); return; }

    gl.clearColor(0.9, 0.9, 0.9, 1.0);
    gl.enable(gl.DEPTH_TEST);   // 开启深度检测 | Enable depth test
    gl.enable(gl.CULL_FACE);    // 开启面剔除, 默认剔除背面 | Enable face culling, default to cull the back face
    gl.viewport(0, 0, canvas.width, canvas.height);

    // 透视投影, 根据视口宽高比指定视域体 | Perspective projection, specify the viewport aspect ratio as the aspect ratio of the view frustum
    // 垂直方向视角, 视域体宽高比, 视域体宽高比, 相机到远裁剪面距离
    // Vertical field of view, viewport aspect ratio, viewport aspect ratio, distance from camera to far clipping plane
    matProj = perspective(35.0, canvas.width / canvas.height, 20.0, 100.0);

    // 计算中心在原点的, 位于z=0平面的, 边长为1的正方形的所有顶点坐标
    // Calculate the coordinates of all vertices of the square located at z = 0, centered at the origin, with a side length of 1
    // x和y方向相邻顶点间距 | The spacing between adjacent vertices in the x and y directions
    let step = 1.0 / (perSideVertexCount - 1);
    let y = 0.5;        // 初始y坐标 | Initial y coordinate
    for (let i = 0; i < perSideVertexCount; i++) {
        let x = -0.5;   // 初始x坐标  | Initial x coordinate
        for (let j = 0; j < perSideVertexCount; j++) {
            vertices.push(vec2(x, y));
            x += step;
        }
        y -= step;
    }

    let index = 0; // indexes数组下标
    let start = 0; // 初始索引
    for (let i = 0; i < perSideVertexCount - 1; i++) {
        for (let j = 0; j < perSideVertexCount - 1; j++) {
            // 添加构成一个小正方形的两个三角形的顶点索引
            indexes[index++] = start;
            indexes[index++] = start + perSideVertexCount;
            indexes[index++] = start + perSideVertexCount + 1;
            indexes[index++] = start;
            indexes[index++] = start + perSideVertexCount + 1;
            indexes[index++] = start + 1;
            start++;
        }
        start++;
    }
    const verticesBufferID = gl.createBuffer(); // 存顶点坐标 | Storing vertex coordinates
    gl.bindBuffer(gl.ARRAY_BUFFER, verticesBufferID);
    // 为当前Array Buffer提供数据, 传输到GPU, 一次提供数据, 多遍绘制
    // Provide data for the current Array Buffer, transfer to GPU, provide data once, draw multiple times
    gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW);
    const indexBufferID = gl.createBuffer();    // 存顶点索引序列 | Storing the sequence of vertex indices
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBufferID);
    // 为当前Element Array Buffer提供数据, 传输到GPU, 一次提供数据, 多遍绘制
    // provide data to the currently bound element array buffer, transfer to GPU, one time
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indexes, gl.STATIC_DRAW);

    // 加载shader程序, 并进行编译和链接, 返回shader程序对象program
    // Load shader program, compile and link, return shader program object program
    const program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);    // 启用该shader程序对象 | Enable the shader program object
    // 获取名称为"a_Position"的shader属性变量的位置
    // Get the location of shader attribute variable "a_Position"
    const a_Position = gl.getAttribLocation(program, "a_Position");
    if (a_Position < 0) { alert("Failed to get a_Position"); return; }
    // 指定利用当前Array Buffer为a_Position提供数据的具体方式
    // Specify how to use the data in the current Array Buffer for a_Position
    // shader属性变量位置, 每个顶点属性有2个分量, 不进行归一化处理, 相邻顶点属性首址间隔(0为紧密排列), 第一个顶点属性在Buffer中偏移量
    // Shader attribute variable position, each vertex attribute has 2 components, no normalization, 
    // the interval between the first addresses of adjacent vertex attributes (0 means close arrangement), 
    // the offset of the first vertex attribute in the buffer
    gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Position);// 启用顶点属性数组 | Enable vertex attribute array
    // 获取shader中uniform变量索引 | Get shader uniform variable index
    u_MVPMatrix = gl.getUniformLocation(program, "u_MVPMatrix");
    if (!u_MVPMatrix) { alert("Failed to get u_MVPMatrix"); return; }
    u_StartColor = gl.getUniformLocation(program, "u_StartColor");
    if (!u_StartColor) { alert("Failed to get u_StartColor"); return; }
    u_EndColor = gl.getUniformLocation(program, "u_EndColor");
    if (!u_EndColor) { alert("Failed to get u_EndColor"); return; }

    const u_MaxDist = gl.getUniformLocation(program, "u_MaxDist");
    if (!u_MaxDist) { alert("Failed to get u_MaxDist"); return; }

    // 正方形内一点到正方形中心的最大距离 | The maximum distance from a point in the square to the center of the square
    gl.uniform1f(u_MaxDist, Math.sqrt(2.0) / 2);
    window.onkeydown = (e) => {
        switch (e.keyCode) {
            case 37: angleY -= angleStep; if (angleY < -180.0) angleY += 360.0; break; // 左箭头
            case 38: angleX -= angleStep; if (angleX < -80.0) angleX = -80.0; break;   // 上箭头
            case 39: angleY += angleStep; if (angleY > 180.0) angleY -= 360.0; break; // 右箭头
            case 40: angleX += angleStep; if (angleX > 80.0) angleX = 80.0; break;     // 下箭头
        }
    }
    render();
}

let last = Date.now();
// 根据时间更新旋转角度 | Update the rotation angle based on time
function animation() {
    // 计算距离上次调用经过多长的时间 | Calculate how long it has been since the last call
    const now = Date.now();
    const elapsed = now - last; // 毫秒 | millisecond
    last = now;
    const maxScaleChange = 0.01;
    if (yScale > 20) scaleFactor = 0.9;
    if (yScale < 1) scaleFactor = 1.1;
    const newScaleFactor = Math.min(Math.max(scaleFactor, 1 - maxScaleChange), 1 + maxScaleChange);
    yScale *= newScaleFactor;
    theta += delta * elapsed / 1000.0;
    if (theta > 360) theta -= 360;
}

function render() {
    // 更新动画相关参数 | Update animation parameters
    animation();
    // 清颜色缓存和深度缓存 | Clear color cache and depth cache
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    // 设置模视投影矩阵 | Set MVP matrix
    matMVP = matProj;    // 初始化为投影矩阵 | Initialize to projection matrix
    // 将后面的所有对象都往z轴负半轴移动60个单位, 使得对象位于照相机的前方(照相机在原点, 面向z轴负半轴拍照)。
    // 后面在建模时z坐标范围须在(-40, 40)
    // Move all the objects behind by 60 units to the negative half of the z-axis, so that the objects are in front of the camera (the camera is at the origin, facing the negative half of the z-axis).
    // The z coordinate range must be (-40, 40) when modeling later
    matMVP = mult(matMVP, translate(0.0, 0.0, -60.0));
    matMVP = mult(matMVP, mult(rotateY(angleY), rotateX(angleX)));

    gl.uniform4f(u_StartColor, 0, 0, 0.5, 1);
    gl.uniform4f(u_EndColor, 0, 0.5, 0, 1);
    drawCube(scale(3, yScale, 3));
    // 缩放->旋转->平移 | Scale -> Rotate -> Translate
    gl.uniform4f(u_StartColor, 0, 0, 0, 1);
    gl.uniform4f(u_EndColor, 0, 0, 1, 1);
    drawCube(mult(translate(-8, 0, 0), mult(rotateZ(theta), scale(2, 10, 10))));
    // 缩放->平移->旋转 | Scale -> Translate -> Rotate
    gl.uniform4f(u_StartColor, 0, 0.5, 0.5, 1);
    gl.uniform4f(u_EndColor, 0.5, 0, 0.5, 1);
    drawCube(mult(rotateX(theta), mult(rotateZ(theta), mult(translate(15, 0, 0), scale(5, 4, yScale * 0.5)))));

    requestAnimationFrame(render); // 请求重绘 | Request redraw
}

function drawCube(matInstance) {
    let matNew = mult(matMVP, matInstance);
    // 绘制前方面 | Draw front face
    gl.uniformMatrix4fv(u_MVPMatrix, false, flatten(mult(matNew, translate(0, 0, 0.5))));
    gl.drawElements(gl.TRIANGLES, indexCount, gl.UNSIGNED_SHORT, 0);
    // 绘制后方面(绕Y轴旋转180度) | Draw back face
    gl.uniformMatrix4fv(u_MVPMatrix, false, flatten(mult(matNew, mult(translate(0, 0, -0.5), rotateY(180)))));
    gl.drawElements(gl.TRIANGLES, indexCount, gl.UNSIGNED_SHORT, 0);
    // 绘制左面(绕Y轴-90度) | Draw left face
    gl.uniformMatrix4fv(u_MVPMatrix, false, flatten(mult(matNew, mult(translate(-0.5, 0, 0), rotateY(-90)))));
    gl.drawElements(gl.TRIANGLES, indexCount, gl.UNSIGNED_SHORT, 0);
    // 绘制右面(绕Y轴90度) | Draw right face
    gl.uniformMatrix4fv(u_MVPMatrix, false, flatten(mult(matNew, mult(translate(0.5, 0, 0), rotateY(90)))));
    gl.drawElements(gl.TRIANGLES, indexCount, gl.UNSIGNED_SHORT, 0);
    // 绘制上面(绕X轴-90度) | Draw top face
    gl.uniformMatrix4fv(u_MVPMatrix, false, flatten(mult(matNew, mult(translate(0, 0.5, 0), rotateX(-90)))));
    gl.drawElements(gl.TRIANGLES, indexCount, gl.UNSIGNED_SHORT, 0);
    // 绘制下面(绕X轴90度) | Draw bottom face
    gl.uniformMatrix4fv(u_MVPMatrix, false, flatten(mult(matNew, mult(translate(0, -0.5, 0), rotateX(90)))));
    gl.drawElements(gl.TRIANGLES, indexCount, gl.UNSIGNED_SHORT, 0);
}
