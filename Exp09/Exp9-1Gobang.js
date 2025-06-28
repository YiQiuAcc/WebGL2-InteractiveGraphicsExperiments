//#region
/** @type {HTMLCanvasElement} */ let canvas;
/** @type {WebGL2RenderingContext} */ let gl;
let chessBoardBuffer;
let chessBoardVerticesCount = 6;
let chessLineBuffer;
let chessLineVerticesCount;
let sphereBuffer;
let sphereVerticesCount;
let highlightBuffer;
let highlightVerticesCount;
let chess = new Array(15);

let turn = 1;
let winFlag = 0;
let FBOforSelect;
// 以下全局变量用于控制动画的状态和速度 | The following global variables are used to control the state and speed of the animation
const animations = new Map(); // 存储棋子动画数据，键为 (i,j) 字符串 | Key (i,j) string for chess piece animation data
let angleY = 0.0;        // 绕y轴旋转的角度 | Rotation angle around the y axis
let angleX = 45.0;        // 绕x轴旋转的角度 | Rotation angle around the x axis
let angleStep = 3.0;    // 角度变化步长(3度) | Angle change step (3 degrees)
let hoverPos = { i: -1, j: -1 };
// 触发落子动画 | Trigger the chess piece animation
function startDropAnimation(i, j) {
    const key = `${i},${j}`;
    animations.set(key, {
        startTime: performance.now(),
        duration: 500, // 动画时长 500ms | Animation duration 500ms
        startY: 5.0,   // 起始 Y 坐标（高处） | Starting Y coordinate (high place)
        targetY: 0.0   // 目标 Y 坐标（棋盘表面） | Target Y coordinate (chessboard surface)
    });
}

let mvpStack = [];  // 模视投影矩阵栈 | Modelling matrix stack
let matProj;        // 投影矩阵 | Projection matrix
let matMVP;         // 模视投影矩阵 | Model view projection matrix

// shader中变量的索引 | Shader variable index
let a_PositionLoc;
let u_MVPMatrixLoc;
let u_ColorLoc;
//#endregion

window.onload = () => {
    canvas = document.getElementById("gl-canvas");
    if (!canvas) { alert("Canvas element not obtained"); return; }
    gl = canvas.getContext("webgl2")
    if (!gl) { alert("Failed to get webgl2 context"); return; }

    gl.clearColor(0.5, 0.5, 0.5, 1.0);  // 设置背景色为灰色 | Set background color to gray
    gl.enable(gl.DEPTH_TEST);           // 开启深度检测 | Enable depth test
    // gl.enable(gl.CULL_FACE);         // 开启面剔除, 默认剔除背面 | Enable face culling, default to cull the back face
    // 设置视口, 占满整个canvas | Set the viewport to cover the entire canvas
    gl.viewport(0, 0, canvas.width, canvas.height);
    // 设置投影矩阵：透视投影, 根据视口宽高比指定视域体
    // Set the projection matrix: perspective projection, specify the field of view based on the aspect ratio of the viewport
    matProj = perspective(35.0,         // 垂直方向视角 | Vertical field of view
        canvas.width / canvas.height,    // 视域体宽高比 | Width/height ratio
        1.0, 100.0);                    // 相机到近远裁剪面距离 | Camera distance to near and far clipping planes

    const program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);    // 启用该shader程序对象 | Enable the shader program object

    // 获取名称为"a_Position"的shader属性变量的位置 | Get the position of the shader attribute variable named "a_Position"
    a_PositionLoc = gl.getAttribLocation(program, "a_Position");
    if (a_PositionLoc < 0) { alert("Failed to get a_Position"); return; }
    gl.enableVertexAttribArray(a_PositionLoc);    // 为a_Position启用顶点数组 | Enable the vertex array for attribute variable "a_Position"

    // 获取名称为"u_MVPMatrix"的shader uniform变量位置 | Get the position of the shader uniform variable named "u_MVPMatrix"
    u_MVPMatrixLoc = gl.getUniformLocation(program, "u_MVPMatrix");
    if (!u_MVPMatrixLoc) { alert("Failed to get uniform variable u_MVPMatrix"); return; }
    // 获取名称为"u_Color"的shader uniform变量位置 | Get the position of the shader uniform variable named "u_Color"
    u_ColorLoc = gl.getUniformLocation(program, "u_Color");
    if (!u_ColorLoc) { alert("Failed to get uniform variable u_Color!"); return; }

    initChessBoard();
    initChessLine();
    initSphere();
    initFrameBufferForSelect();
    initHighlight();
    for (let i = 0; i < 15; i++) {
        chess[i] = new Array(15);
        for (let j = 0; j < 15; j++) {
            chess[i][j] = 0;
        }
    }
    // 按键响应, 用于控制视角 | Keyboard response, used to control the view
    /** @param {KeyboardEvent} e  */
    window.onkeydown = (e) => {
        switch (e.key) {
            case "a": case "ArrowLeft": // 方向键Left | Left direction key
                angleY -= angleStep;
                if (angleY < -180.0) angleY += 360.0;
                break;
            case "w": case "ArrowUp":   // 方向键Up | Up direction key
                angleX -= angleStep;
                if (angleX < -80.0) angleX = -80.0;
                break;
            case "d": case "ArrowRight": // 方向键Right | Right direction key
                angleY += angleStep;
                if (angleY > 180.0) angleY -= 360.0;
                break;
            case "s": case "ArrowDown": // 方向键Down | Down direction key
                angleX += angleStep;
                if (angleX > 80.0) angleX = 80.0;
                break;
            default: return;
        }
        requestAnimationFrame(render); // 请求重绘 | Request redraw
    }
    canvas.onmousedown = (e) => {
        if (e.button == 0 && !winFlag) {
            let x = e.clientX, y = e.clientY;
            let rect = e.target.getBoundingClientRect();
            let xInCanvas = x - rect.left;
            let yInCanvas = rect.bottom - y;
            let id = getSelectedObj(xInCanvas, yInCanvas);
            if (id >= 0) {
                let i = Math.floor(id / 15);
                let j = id % 15;
                if (chess[i][j] == 0) {
                    chess[i][j] = turn;
                    startDropAnimation(i, j);
                    if (checkWin(turn)) {
                        winFlag = turn;
                        setTimeout(() => {
                            if (winFlag > 0) alert("White side victory");
                            else alert("Black side victory");
                        }, 550);
                    }
                    turn = -turn;
                    requestAnimationFrame(render);
                }
            }
        }
        if (e.button == 2) {
            winFlag = 0;
            for (let i = 0; i < 15; i++) {
                for (let j = 0; j < 15; j++)chess[i][j] = 0;
            }
            requestAnimationFrame(render);
        }
    }
    canvas.onmousemove = (e) => {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = canvas.height - (e.clientY - rect.top);
        const id = getSelectedObj(x, y);
        if (id >= 0) {
            hoverPos.i = Math.floor(id / 15);
            hoverPos.j = id % 15;
        } else {
            hoverPos.i = -1;
        }
        requestAnimationFrame(render);
    }
    canvas.oncontextmenu = (e) => { e.preventDefault(); };
    render();
};
function render() {
    // 清颜色缓存和深度缓存 | Clear color cache and depth cache
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    animations.forEach((anim, key) => {
        const progress = Math.min((performance.now() - anim.startTime) / anim.duration, 1.0);
        const currentY = anim.startY + (anim.targetY - anim.startY) * easeOutCubic(progress);
        anim.currentY = currentY;
        // 动画结束后移除状态 | Remove status after animation ends
        if (progress >= 1.0) {
            animations.delete(key);
        }
    });

    // 创建变换矩阵 | Create a transformation matrix
    matMVP = mult(matProj,                  // 投影矩阵 | Projection matrix
        mult(translate(0.0, 0.0, -35.0),    // 沿z轴平移 | Translation along the z-axis
            mult(rotateY(angleY),           // 绕y轴旋转 | Rotation around the y-axis
                rotateX(angleX))));         // 绕x轴旋转 | Rotation around the x-axis
    // 传值给shader中的u_MVPMatrix | Pass values to the shader's u_MVPMatrix
    gl.uniformMatrix4fv(u_MVPMatrixLoc, false, flatten(matMVP));

    gl.enable(gl.POLYGON_OFFSET_FILL);
    gl.polygonOffset(1.0, 1.0);
    gl.uniform4f(u_ColorLoc, 0.93, 0.8, 0.22, 1.0);
    gl.bindBuffer(gl.ARRAY_BUFFER, chessBoardBuffer);
    gl.vertexAttribPointer(a_PositionLoc, 3, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLES, 0, chessBoardVerticesCount);
    gl.disable(gl.POLYGON_OFFSET_FILL);

    gl.uniform4f(u_ColorLoc, 0.0, 0.0, 0.0, 1.0);
    gl.bindBuffer(gl.ARRAY_BUFFER, chessLineBuffer);
    gl.vertexAttribPointer(a_PositionLoc, 3, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.LINES, 0, chessLineVerticesCount);

    gl.bindBuffer(gl.ARRAY_BUFFER, sphereBuffer);
    gl.vertexAttribPointer(a_PositionLoc, 3, gl.FLOAT, false, 0, 0);
    for (let i = 0; i < 15; i++) {
        for (let j = 0; j < 15; j++) {
            if (chess[i][j]) {
                // 检查是否有动画 | Check for animation
                const anim = animations.get(`${i},${j}`);
                drawChess(i, j, anim ? anim.currentY : 0.0);
            }
        }
    }
    if (hoverPos.i >= 0 && hoverPos.j >= 0 && chess[hoverPos.i][hoverPos.j] === 0) {
        gl.uniform4f(u_ColorLoc, 0.0, 0.8, 0.0, 0.3); // 半透明绿色 | Half-transparent green
        gl.bindBuffer(gl.ARRAY_BUFFER, highlightBuffer);
        gl.vertexAttribPointer(a_PositionLoc, 3, gl.FLOAT, false, 0, 0);
        matMVP = mult(matMVP, translate(-7.0 + hoverPos.j * 1.0, 0, -7.0 + hoverPos.i * 1.0));
        gl.uniformMatrix4fv(u_MVPMatrixLoc, false, flatten(matMVP));
        gl.drawArrays(gl.TRIANGLE_FAN, 0, highlightVerticesCount);
    }
    requestAnimationFrame(render);
}

function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

function getSelectedObj(x, y) {
    let pixels = new Uint8Array(4);
    gl.bindFramebuffer(gl.FRAMEBUFFER, FBOforSelect);// 绑定到拾取FBO | Bind to the selection FBO
    let status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (status == gl.FRAMEBUFFER_COMPLETE) {    // 检查FBO完整性 | Check FBO completeness
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        matMVP = mult(matProj,                  // 投影矩阵 | Projection matrix
            mult(translate(0.0, 0.0, -35.0),    // 沿z轴平移 | Translation along the z-axis
                mult(rotateY(angleY),           // 绕y轴旋转 | Rotation around the y-axis
                    rotateX(angleX))));         // 绕x轴旋转 | Rotation around the x-axis
        gl.uniformMatrix4fv(u_MVPMatrixLoc, false, flatten(matMVP));
        gl.bindBuffer(gl.ARRAY_BUFFER, sphereBuffer);
        gl.vertexAttribPointer(a_PositionLoc, 3, gl.FLOAT, false, 0, 0);
        for (let i = 0; i < 15; i++) {
            for (let j = 0; j < 15; j++)
                drawChessForSelect(i, j);
        }
        gl.finish();
        // 获取与鼠标位置对应的FrameBuffer中的像素颜色 | Get the pixel color in the FrameBuffer corresponding to the mouse position
        gl.readPixels(
            x,    // 像素区域左下角x坐标(窗口坐标系) | The x coordinate of the lower left corner of the pixel area (window coordinate system)
            y,    // 像素区域左下角y坐标(窗口坐标系) | The y coordinate of the lower left corner of the pixel area (window coordinate system)
            1, 1, // 像素区域宽高 | The width and height of the pixel area
            gl.RGBA,          // 像素格式 | Pixel format
            gl.UNSIGNED_BYTE, // 像素数据类型 | Pixel data type
            pixels);          // 存放获取结果的数组 | Array to store the obtained results
    } else return -2;   // 返回 -2 表示出错 | Return -2 indicates an error
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    // 如果蓝色分量非0, 说明是背景颜色, 返回-1 | If the blue component is not 0, it is background color, return -1
    if (pixels[2] > 0) {
        return -1;
    } else {
        let i = pixels[0] / 17;
        let j = pixels[1] / 17;
        return i * 15 + j;
    }
}

function checkWin(turn) {
    let flag;
    let n;
    for (let i = 0; i < 15; i++) {
        for (let j = 0; j < 15; j++) {
            if (chess[i][j] == turn) {
                if (j < 11) {
                    flag = true;
                    for (n = 1; n < 5; n++) {
                        if (chess[i][j + n] != turn) {
                            flag = false;
                            break;
                        }
                    }
                    if (flag) return true;
                }
                if (i < 11) {
                    flag = true;
                    for (n = 1; n < 5; n++) {
                        if (chess[i + n][j] != turn) {
                            flag = false;
                            break;
                        }
                    }
                    if (flag) return true;
                }
                if (i < 11 && j > 3) {
                    flag = true;
                    for (n = 1; n < 5; n++) {
                        if (chess[i + n][j - n] != turn) {
                            flag = false;
                            break;
                        }
                    }
                    if (flag) return true;
                }
                if (i < 11 && j < 11) {
                    flag = true;
                    for (n = 1; n < 5; n++) {
                        if (chess[i + n][j + n] != turn) {
                            flag = false;
                            break;
                        }
                    }
                    if (flag) return true;
                }
            }
        }
    }
    return false;
}

function initChessBoard() {
    // 创建棋盘顶点数组 | Create a chessboard vertex array
    const ptChessBoard = [
        vec3(-8.0, 0.0, -8.0), vec3(-8.0, 0.0, 8.0),
        vec3(8.0, 0.0, 8.0), vec3(-8.0, 0.0, -8.0),
        vec3(8.0, 0.0, 8.0), vec3(8.0, 0.0, -8.0),
    ]
    chessBoardBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, chessBoardBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(ptChessBoard), gl.STATIC_DRAW);
}

function initChessLine() {
    // 创建棋盘顶点数组 | Create a chessboard vertex array
    let ptChessLine = [];
    chessLineVerticesCount = 0;
    for (let i = -7; i <= 7; i++) {
        ptChessLine.push(vec3(i, 0.0, 7.0), vec3(i, 0.0, -7.0));
        ptChessLine.push(vec3(-7.0, 0.0, i), vec3(7.0, 0.0, i));
        chessLineVerticesCount += 4;
    }
    chessLineBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, chessLineBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(ptChessLine), gl.STATIC_DRAW);
}

function initSphere() {
    const ptSphere = buildSphere(0.4, 10, 10);
    sphereBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, sphereBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(ptSphere), gl.STATIC_DRAW);
}
// 初始化用于拾取的FBO, 用于拾取的帧缓存由一个颜色缓存和一个深度缓存组成
// Initialize the FBO for picking, which consists of a color buffer and a depth buffer for picking
function initFrameBufferForSelect() {
    // 创建帧缓存、颜色缓存和深度缓存 | Create frame buffer, color buffer and depth buffer
    FBOforSelect = gl.createFramebuffer();
    const colorBuffer = gl.createRenderbuffer();
    const depthBuffer = gl.createRenderbuffer();
    // 创建颜色缓存 | Create color buffer
    gl.bindRenderbuffer(gl.RENDERBUFFER, colorBuffer);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.RGBA4, canvas.width, canvas.height)
    // 创建深度缓存 | Create depth buffer
    gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, canvas.width, canvas.height)
    // 将FBOforSelect绑定到当前FBO | Bind FBOforSelect to the current FBO
    gl.bindFramebuffer(gl.FRAMEBUFFER, FBOforSelect);
    // 将colorBuffer对应的缓存绑定到当前FBO的颜色缓存 | Bind the color buffer corresponding to colorBuffer to the current FBO
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, colorBuffer);
    // 将depthBuffer对应的缓存绑定到当前FBO的深度缓存 | Bind the depth buffer corresponding to depthBuffer to the current FBO
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthBuffer);
    // 绑定默认FrameBuffer, 防止正常绘画到拾取用的FrameBuffer中
    // Bind the default FrameBuffer, preventing normal drawing to the FrameBuffer used for picking.
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}
// 初始化高亮圆环顶点数据 | Initialize the vertex data for the highlighted ring
function initHighlight() {
    const pts = [];
    const radius = 0.45;
    const segments = 32;
    for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        pts.push(vec3(radius * Math.cos(angle), 0.0, radius * Math.sin(angle)));
    }
    highlightBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, highlightBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(pts), gl.STATIC_DRAW);
    highlightVerticesCount = pts.length;
}

function drawChessForSelect(i, j) {
    mvpStack.push(matMVP);
    //根据i和j决定棋子的颜色 | Determine the color of the chess piece based on i and j
    gl.uniform4f(u_ColorLoc, i * 17 / 255.0, j * 17 / 255.0, 0.0, 1.0);
    //通过平移变换将棋子从原点位置移动到第i行第j列位置 | Move the chess piece from the original position to the position of the i-th row and j-th column
    matMVP = mult(matMVP, translate(-7.0 + j * 1.0, 0, -7.0 + i * 1.0));
    gl.uniformMatrix4fv(u_MVPMatrixLoc, false, flatten(matMVP));
    gl.drawArrays(gl.TRIANGLES, 0, sphereVerticesCount);
    matMVP = mvpStack.pop();
}

function drawChess(i, j, y = 0.0) {
    mvpStack.push(matMVP);
    gl.uniform4f(u_ColorLoc, chess[i][j] > 0 ? 1.0 : 0.0,
        chess[i][j] > 0 ? 1.0 : 0.0, chess[i][j] > 0 ? 1.0 : 0.0, 1.0);
    matMVP = mult(matMVP, translate(-7.0 + j * 1.0, y, -7.0 + i * 1.0));
    gl.uniformMatrix4fv(u_MVPMatrixLoc, false, flatten(matMVP));
    gl.drawArrays(gl.TRIANGLES, 0, sphereVerticesCount);
    matMVP = mvpStack.pop();
}

/**
 * 用于生成一个中心在原点的球的顶点坐标数据(南北极在z轴方向)
 * Generate a vertex coordinate data centered at the origin of a ball (the poles are in the z-axis direction)
 * @param radius 球的半径 | Radius of the ball
 * @param columns 经线数 | Number of longitudinal lines
 * @param rows 纬线数 | Number of latitudinal lines
 * @returns 用于保存球顶点数据的数组 | Array used to save the vertex data of the ball
 */
function buildSphere(radius, columns, rows) {
    let vertices = []; // 存放不同顶点的数组 | Array to save different vertices
    for (let r = 0; r <= rows; r++) {
        let v = r / rows;           // v在[0,1]区间 | v in [0,1] range
        let theta1 = v * Math.PI;   // theta1在[0,PI]区间 | theta1 in [0,PI] range
        let temp = vec3(0, 0, 1);
        let n = vec3(temp);         // 实现Float32Array深拷贝 | Implement Float32Array deep copy
        let cosTheta1 = Math.cos(theta1);
        let sinTheta1 = Math.sin(theta1);
        n[0] = temp[0] * cosTheta1 + temp[2] * sinTheta1;
        n[2] = -temp[0] * sinTheta1 + temp[2] * cosTheta1;
        for (let c = 0; c <= columns; c++) {
            let u = c / columns;            // u在[0,1]区间 | u in [0,1] range
            let theta2 = u * Math.PI * 2;   // theta2在[0,2PI]区间 | theta2 in [0,2PI] range
            let pos = vec3(n);
            temp = vec3(n);
            let cosTheta2 = Math.cos(theta2);
            let sinTheta2 = Math.sin(theta2);
            pos[0] = temp[0] * cosTheta2 - temp[1] * sinTheta2;
            pos[1] = temp[0] * sinTheta2 + temp[1] * cosTheta2;
            let posFull = mult(pos, radius);
            vertices.push(posFull);
        }
    }
    // 生成最终顶点数组数据(使用线段进行绘制) | Generate final vertex array data (using lines to draw)
    let spherePoints = []; // 用于存放球顶点坐标的数组 | Array used to store ball vertex coordinates
    let colLength = columns + 1;
    for (let r = 0; r < rows; r++) {
        let offset = r * colLength;
        for (let c = 0; c < columns; c++) {
            let ul = offset + c;                    // 左上 | Upper left
            let ur = offset + c + 1;                // 右上 | Upper right
            let br = offset + (c + 1 + colLength);  // 右下 | Lower right
            let bl = offset + (c + 0 + colLength);  // 左下 | Lower left
            // 由两条经线和纬线围成的矩形 | A rectangle formed by two meridians and a parallel
            // 使用三角形进行绘制 | Draw it using triangles
            spherePoints.push(vertices[ul]);
            spherePoints.push(vertices[bl]);
            spherePoints.push(vertices[br]);
            spherePoints.push(vertices[ul]);
            spherePoints.push(vertices[br]);
            spherePoints.push(vertices[ur]);
        }
    }
    vertices.length = 0;
    sphereVerticesCount = rows * columns * 6; // 顶点数 | Number of vertices
    return spherePoints; // 返回顶点坐标数组 | Return the vertex coordinate array
} 
