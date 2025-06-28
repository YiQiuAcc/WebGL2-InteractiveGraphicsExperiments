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
const BOARD_SIZE = 11;
let chess = Array(BOARD_SIZE).fill().map(() => Array(BOARD_SIZE).fill(0));
chess[3][3] = 1;
chess[3][4] = -1;
chess[4][3] = -1;
chess[4][4] = 1;

let turn = 1;
let winFlag = 0;
let FBOforSelect;
// 以下全局变量用于控制动画的状态和速度 | The following global variables are used to control the state and speed of the animation
const animations = new Map();   // 存储棋子动画数据，键为 (i,j) 字符串 | Key (i,j) string for chess piece animation data
let angleY = 0.0;               // 绕y轴旋转的角度 | Rotation angle around the y axis
let angleX = 45.0;              // 绕x轴旋转的角度 | Rotation angle around the x axis
let angleStep = 3.0;            // 角度变化步长(3度) | Angle change step (3 degrees)
let hoverPos = { i: -1, j: -1 };

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

    gl.clearColor(0.5, 0.5, 0.5, 0.7);  // 设置背景色为灰色 | Set background color to gray
    gl.enable(gl.DEPTH_TEST);           // 开启深度检测 | Enable depth test
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    // gl.enable(gl.CULL_FACE); // 开启面剔除, 默认剔除背面 | Enable face culling, default to cull the back face
    // 设置视口, 占满整个canvas | Set the viewport to cover the entire canvas
    gl.viewport(0, 0, canvas.width, canvas.height);
    // 设置投影矩阵：透视投影, 根据视口宽高比指定视域体
    // Set the projection matrix: perspective projection, specify the field of view based on the aspect ratio of the viewport
    matProj = perspective(35.0,         // 垂直方向视角 | Vertical viewing angle
        canvas.width / canvas.height,    // 视域体宽高比 | View volume aspect ratio
        1.0, 100.0);                    // 相机到近远裁剪面距离 | Distance from camera to near and far clipping planes

    const program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);    // 启用该shader程序对象 | Enable the shader program object

    // 获取名称为"a_Position"的shader属性变量的位置 | Get the position of the shader attribute variable named "a_Position"
    a_PositionLoc = gl.getAttribLocation(program, "a_Position");
    if (a_PositionLoc < 0) { alert("Failed to get a_Position"); return; }
    gl.enableVertexAttribArray(a_PositionLoc);    // 为a_Position启用顶点数组 | Enable the vertex array for a_Position

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
    document.getElementById("turn").innerHTML = turn < 0 ? "Black" : "White";
    // 按键响应, 用于控制视角 | Keyboard response, used to control the view
    /** @param {KeyboardEvent} e  */
    window.onkeydown = (e) => {
        switch (e.key) {
            case "a": case "ArrowLeft": // 方向键Left | Directional key Left
                angleY -= angleStep;
                if (angleY < -180.0) angleY += 360.0;
                break;
            case "w": case "ArrowUp":   // 方向键Up | Directional key Up
                angleX -= angleStep;
                if (angleX < -80.0) angleX = -80.0;
                break;
            case "d": case "ArrowRight":// 方向键Right | Directional key Right
                angleY += angleStep;
                if (angleY > 180.0) angleY -= 360.0;
                break;
            case "s": case "ArrowDown": // 方向键Down | Directional key Down
                angleX += angleStep;
                if (angleX > 80.0) angleX = 80.0;
                break;
            default: return;
        }
        requestAnimationFrame(render); // 请求重绘 | Request redraw
    }
    canvas.onmousedown = (e) => {
        if (e.button === 0 && !winFlag) {
            let x = e.clientX, y = e.clientY;
            let rect = e.target.getBoundingClientRect();
            let xInCanvas = x - rect.left;
            let yInCanvas = rect.bottom - y;
            let id = getSelectedObj(xInCanvas, yInCanvas);
            if (id >= 0) {
                let i = Math.floor(id / BOARD_SIZE);
                let j = id % BOARD_SIZE;
                if (chess[i][j] === 0) {
                    // 调用翻转函数判断该落子是否能翻转对手棋子
                    // Call the flip function to determine whether the drop can flip the opponent's chess piece
                    if (flipChessAt(i, j, turn)) {
                        chess[i][j] = turn;
                        startDropAnimation(i, j);
                        checkWin(turn);
                        turn = -turn;
                        requestAnimationFrame(render);
                    } else {
                        document.getElementById("notice").innerHTML =
                            "You cannot flip any chess pieces when you place your move here, it is an illegal move";
                        setTimeout(() => {
                            document.getElementById("notice").innerHTML = "";
                        }, 1000)
                    }
                }
            }
        }
        if (e.button === 2) {
            winFlag = 0;
            for (let i = 0; i < BOARD_SIZE; i++) {
                for (let j = 0; j < BOARD_SIZE; j++)
                    chess[i][j] = 0;
            }
            chess[3][3] = 1;
            chess[3][4] = -1;
            chess[4][3] = -1;
            chess[4][4] = 1;
            requestAnimationFrame(render);
        }
        document.getElementById("turn").innerHTML = turn < 0 ? "Black" : "White";
    };
    const MOUSE_MOVE_THROTTLE = 50; // 50ms节流 | 50ms throttle
    let lastMouseMoveTime = 0;
    canvas.onmousemove = (e) => {
        const now = Date.now();
        if (now - lastMouseMoveTime < MOUSE_MOVE_THROTTLE) return;
        lastMouseMoveTime = now;
        const rect = canvas.getBoundingClientRect();
        const cssX = e.clientX - rect.left;
        const cssY = e.clientY - rect.top;
        // 转换为canvas实际像素坐标 | Convert to canvas actual pixel coordinates
        const x = cssX * (canvas.width / rect.width);
        const y = (rect.height - cssY) * (canvas.height / rect.height);
        const id = getSelectedObj(x, y);
        if (id >= 0) {
            hoverPos.i = Math.floor(id / BOARD_SIZE);
            hoverPos.j = id % BOARD_SIZE;
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
    // 创建变换矩阵 | Create transformation matrix
    matMVP = mult(mult(matProj, mult(translate(0.0, 0.0, -35.0),
        mult(rotateY(angleY), rotateX(angleX)))), scale(1.2, 1.2, 1.2));
    // 传值给shader中的u_MVPMatrix | Pass value to u_MVPMatrix in shader
    gl.uniformMatrix4fv(u_MVPMatrixLoc, false, flatten(matMVP));

    gl.enable(gl.POLYGON_OFFSET_FILL);
    gl.polygonOffset(1.0, 1.0);
    gl.uniform4f(u_ColorLoc, 0.85, 0.67, 0.44, 1.0);
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
    for (let i = 0; i < BOARD_SIZE; i++) {
        for (let j = 0; j < BOARD_SIZE; j++) {
            if (chess[i][j]) {
                // 检查是否有动画 | Check for animation
                const anim = animations.get(`${i},${j}`);
                drawChess(i, j, anim ? anim.currentY : 0.0);
            }
        }
    }
    if (animations.size > 0) requestAnimationFrame(render);
    if (hoverPos.i >= 0 && hoverPos.j >= 0 && chess[hoverPos.i][hoverPos.j] === 0) {
        gl.uniform4f(u_ColorLoc, 0.0, 0.8, 0.0, 0.3);   // 半透明绿色 | Half-transparent green
        gl.bindBuffer(gl.ARRAY_BUFFER, highlightBuffer);
        gl.vertexAttribPointer(a_PositionLoc, 3, gl.FLOAT, false, 0, 0);
        const hoverMVP = mult(matMVP, translate(-5.0 + hoverPos.j, 0, -5.0 + hoverPos.i));
        gl.uniformMatrix4fv(u_MVPMatrixLoc, false, flatten(hoverMVP));
        gl.drawArrays(gl.TRIANGLE_FAN, 0, highlightVerticesCount);
    }
    // 绘制当前玩家所有合法落子位置 | Draw all legal moves for the current player
    for (let i = 0; i < BOARD_SIZE; i++) {
        for (let j = 0; j < BOARD_SIZE; j++) {
            if (chess[i][j] === 0 && isValidMove(i, j, turn)) {
                gl.uniform4f(u_ColorLoc, 0.0, 0.0, 1.0, 0.35); // 蓝色半透明 | Blue semi-transparent
                gl.bindBuffer(gl.ARRAY_BUFFER, highlightBuffer);
                gl.vertexAttribPointer(a_PositionLoc, 3, gl.FLOAT, false, 0, 0);
                let moveMVP = mult(matMVP, translate(-5.0 + j * 1.0, 0, -5.0 + i * 1.0));
                gl.uniformMatrix4fv(u_MVPMatrixLoc, false, flatten(moveMVP));
                gl.drawArrays(gl.TRIANGLE_FAN, 0, highlightVerticesCount);
            }
        }
    }
}

function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
// 落子动画 | Drop animation
function startDropAnimation(i, j) {
    const key = `${i},${j}`;
    animations.set(key, {
        startTime: performance.now(),
        duration: 500, // 动画时长 500ms | Animation duration 500ms
        startY: 5.0,   // 起始 Y 坐标（高处） | Start Y coordinate (height)
        targetY: 0.0   // 目标 Y 坐标（棋盘表面） | Target Y coordinate (chessboard surface)
    });
}

function getSelectedObj(x, y) {
    let pixels = new Uint8Array(4);
    gl.bindFramebuffer(gl.FRAMEBUFFER, FBOforSelect);   // 绑定到拾取FBO | Bind to the selection FBO
    let status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (status == gl.FRAMEBUFFER_COMPLETE) {            // 检查FBO完整性 | Check FBO completeness
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        matMVP = mult(mult(matProj, mult(translate(0.0, 0.0, -35.0), mult(rotateY(angleY), rotateX(angleX)))), scale(1.2, 1.2, 1.2));
        gl.uniformMatrix4fv(u_MVPMatrixLoc, false, flatten(matMVP));
        gl.bindBuffer(gl.ARRAY_BUFFER, sphereBuffer);
        gl.vertexAttribPointer(a_PositionLoc, 3, gl.FLOAT, false, 0, 0);
        for (let i = 0; i < BOARD_SIZE; i++) {
            for (let j = 0; j < BOARD_SIZE; j++)
                drawChessForSelect(i, j);
        }
        gl.finish();
        // 获取与鼠标位置对应的FrameBuffer中的像素颜色 | Get the pixel color in the FrameBuffer corresponding to the mouse position
        gl.readPixels(
            x,    // 像素区域左下角x坐标(窗口坐标系) | Pixel area left bottom x coordinate (window coordinate system)
            y,    // 像素区域左下角y坐标(窗口坐标系) | Pixel area left bottom y coordinate (window coordinate system)
            1, 1, // 像素区域宽高 | Pixel area width and height
            gl.RGBA,            // 像素格式 | Pixel format
            gl.UNSIGNED_BYTE,   // 像素数据类型 | Pixel data type
            pixels);            // 存放获取结果的数组 | Array to store the pixel color
    } else return -2;           // 返回 -2 表示出错 | Return -2 for error
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    if (pixels[2] > 0) {        // 如果蓝色分量非0, 说明是背景颜色, 返回-1 | If the blue component is not 0, return -1
        return -1;
    } else {
        let i = pixels[0] / 17;
        let j = pixels[1] / 17;
        return i * BOARD_SIZE + j;
    }
}

function flipChessAt(x, y, player) {
    // 8个方向, 定义相邻的坐标变化 | 8 directions, define the coordinate changes of adjacent
    const directions = [
        [1, 0], [-1, 0],
        [0, 1], [0, -1],
        [1, 1], [1, -1],
        [-1, 1], [-1, -1]
    ];
    let legal = false;      // 标记是否存在可翻转的方向 | Mark whether there is a direction that can be flipped
    let opponent = -player; // 对手棋子的标识 | Opponent's identifier

    // 针对每个方向进行判断 | For each direction, judge
    for (let d = 0; d < directions.length; d++) {
        let dx = directions[d][0], dy = directions[d][1];
        let i = x + dx, j = y + dy;
        let piecesToFlip = []; // 存储该方向上待翻转的对手棋子的坐标 | Store the coordinates of the opponent's pieces to be flipped in this direction

        // 第一个相邻位置必须是对手棋子 | The first adjacent position must be an opponent's piece
        if (i >= 0 && i < BOARD_SIZE && j >= 0 && j < BOARD_SIZE && chess[i][j] === opponent) {
            piecesToFlip.push([i, j]);
            i += dx, j += dy;
            // 往该方向找连续对手棋子，直到越界或遇到己方棋子或空位
            // Find continuous opponent's pieces in this direction, until out of bounds or encounter friendly pieces or empty spaces
            while (i >= 0 && i < BOARD_SIZE && j >= 0 && j < BOARD_SIZE) {
                if (chess[i][j] === opponent) {
                    piecesToFlip.push([i, j]);
                } else if (chess[i][j] === player) {
                    // 找到己方棋子，说明此方向可以翻转 | This direction can be flipped
                    if (piecesToFlip.length > 0) {
                        legal = true;
                        // 翻转该方向的所有对手棋子 | Flip all opponent's pieces in this direction
                        for (let k = 0; k < piecesToFlip.length; k++) {
                            let pos = piecesToFlip[k];
                            chess[pos[0]][pos[1]] = player;
                        }
                    }
                    break;
                } else { // 遇到空格 | Encountered an empty space
                    break;
                }
                i += dx, j += dy;
            }
        }
    }
    return legal;
}

function isValidMove(i, j, player) {
    if (chess[i][j] !== 0) return false;
    const directions = [
        [1, 0], [-1, 0],
        [0, 1], [0, -1],
        [1, 1], [1, -1],
        [-1, 1], [-1, -1]
    ];
    const opponent = -player;
    for (let d = 0; d < directions.length; d++) {
        const dx = directions[d][0], dy = directions[d][1];
        let x = i + dx, y = j + dy;
        let hasOpponent = false;
        // 第一个方向上必须紧邻对手棋子 | The first direction must be adjacent to an opponent's piece
        while (x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE) {
            if (chess[x][y] === opponent) {
                hasOpponent = true;
            } else if (chess[x][y] === player) {
                if (hasOpponent) return true;
                else break;
            } else { // 空位，无法夹住对手棋子 | Empty space, cannot hold opponent's pieces
                break;
            }
            x += dx;
            y += dy;
        }
    }
    return false;
}

function getValidMoves(player) {
    let moves = [];
    for (let i = 0; i < BOARD_SIZE; i++) {
        for (let j = 0; j < BOARD_SIZE; j++) {
            if (isValidMove(i, j, player)) {
                moves.push([i, j]);
            }
        }
    }
    return moves;
}
function checkWin(turn) {
    // 判断棋盘是否已满 | Check whether the board is full
    let boardFull = true;
    for (let i = 0; i < BOARD_SIZE; i++) {
        for (let j = 0; j < BOARD_SIZE; j++) {
            if (chess[i][j] === 0) {
                boardFull = false;
                break;
            }
        }
        if (!boardFull) break;
    }
    const validMovesCurrent = getValidMoves(turn);
    const validMovesOpponent = getValidMoves(-turn);
    // 如果棋盘已满，或双方均无合法走步，则游戏结束 | If the board is full or both players have no valid moves, the game ends
    if (boardFull || (validMovesCurrent.length === 0 && validMovesOpponent.length === 0)) {
        let scoreBlack = 0, scoreWhite = 0;
        for (let i = 0; i < BOARD_SIZE; i++) {
            for (let j = 0; j < BOARD_SIZE; j++) {
                if (chess[i][j] === 1) scoreWhite++;
                else if (chess[i][j] === -1) scoreBlack++;
            }
        }
        let result;
        if (scoreWhite > scoreBlack) result = "White chess victory";
        else if (scoreWhite < scoreBlack) result = "Black Chess Victory";
        else result = "Draw";
        winFlag = 1;        // 标记游戏结束 | Mark the game as ended
        setTimeout(() => {  // 延时显示结果 | Display the result after delay
            alert(`${result} White: ${scoreWhite} Black: ${scoreBlack}`);
        }, 550);
    } else if (validMovesCurrent.length === 0 && validMovesOpponent.length > 0) {
        alert("The current player has no legal walking, it is the other party's turn");
        turn = -turn;
    }
}

function initChessBoard() {
    // 创建棋盘顶点数组 | Create a vertex array for the chessboard
    const ptChessBoard = [
        vec3(-6.0, 0.0, -6.0), vec3(-6.0, 0.0, 6.0),
        vec3(6.0, 0.0, 6.0), vec3(-6.0, 0.0, -6.0),
        vec3(6.0, 0.0, 6.0), vec3(6.0, 0.0, -6.0),
    ]
    chessBoardBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, chessBoardBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(ptChessBoard), gl.STATIC_DRAW);
}

function initChessLine() {
    // 创建棋盘顶点数组 | Create a vertex array for the chessboard
    let ptChessLine = [];
    chessLineVerticesCount = 0;
    for (let i = -5; i <= 5; i++) {
        ptChessLine.push(vec3(i, 0.0, 5.0), vec3(i, 0.0, -5.0));
        ptChessLine.push(vec3(-5.0, 0.0, i), vec3(5.0, 0.0, i));
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
// Initialize the FBO for selection, which consists of a color buffer and a depth buffer for selection
function initFrameBufferForSelect() {
    // 创建帧缓存、颜色缓存和深度缓存 | Create a frame buffer, color buffer, and depth buffer
    FBOforSelect = gl.createFramebuffer();
    const colorBuffer = gl.createRenderbuffer();
    const depthBuffer = gl.createRenderbuffer();
    // 创建颜色缓存 | Create a color buffer
    gl.bindRenderbuffer(gl.RENDERBUFFER, colorBuffer);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.RGBA4, canvas.width, canvas.height)
    // 创建深度缓存 | Create a depth buffer
    gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, canvas.width, canvas.height)
    // 将FBOforSelect绑定到当前FBO | Bind the current FBO to FBOforSelect
    gl.bindFramebuffer(gl.FRAMEBUFFER, FBOforSelect);
    // 将colorBuffer对应的缓存绑定到当前FBO的颜色缓存 | Bind the color buffer corresponding to colorBuffer to the current FBO
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, colorBuffer);
    // 将depthBuffer对应的缓存绑定到当前FBO的深度缓存 | Bind the depth buffer corresponding to depthBuffer to the current FBO
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthBuffer);
    // 绑定默认FrameBuffer, 防止正常绘画到拾取用的FrameBuffer中
    // Bind the default FrameBuffer, preventing normal drawing to the FrameBuffer used for selection
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}
// 初始化高亮圆环顶点数据 | Initialize the vertex data for the highlighted ring
function initHighlight() {
    const pts = [vec3(0.0, 0.0, 0.0)]; // 中心点 | Center point
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
    // 根据i和j决定棋子的颜色 | Determine the color of the chess piece based on i and j
    gl.uniform4f(u_ColorLoc, i * 17 / 255.0, j * 17 / 255.0, 0.0, 1.0);
    // 通过平移变换将棋子从原点位置移动到第i行第j列位置
    // Translate the chess piece from the origin position to the position in the i-th row and j-th column
    matMVP = mult(matMVP, translate(-5.0 + j * 1.0, 0, -5.0 + i * 1.0));
    gl.uniformMatrix4fv(u_MVPMatrixLoc, false, flatten(matMVP));
    gl.drawArrays(gl.TRIANGLES, 0, sphereVerticesCount);
    matMVP = mvpStack.pop();
}

function drawChess(i, j, y = 0.0) {
    mvpStack.push(matMVP);
    gl.uniform4f(u_ColorLoc, chess[i][j] > 0 ? 1.0 : 0.0,
        chess[i][j] > 0 ? 1.0 : 0.0, chess[i][j] > 0 ? 1.0 : 0.0, 1.0);
    matMVP = mult(matMVP, translate(-5.0 + j * 1.0, y, -5.0 + i * 1.0));
    gl.uniformMatrix4fv(u_MVPMatrixLoc, false, flatten(matMVP));
    gl.drawArrays(gl.TRIANGLES, 0, sphereVerticesCount);
    matMVP = mvpStack.pop();
}

/**
 * 用于生成一个中心在原点的球的顶点坐标数据(南北极在z轴方向)
 * Generate a vertex coordinate data set centered at the origin of a ball (the poles are in the z-axis direction)
 * @param radius 球的半径 | Radius of the ball
 * @param columns 经线数 | Longitudinal lines
 * @param rows 纬线数 | Latitudinal lines
 * @returns 用于保存球顶点数据的数组 | Array used to save ball vertex data
 */
function buildSphere(radius, columns, rows) {
    let vertices = [];      // 存放不同顶点的数组 | Array to save different vertices
    for (let r = 0; r <= rows; r++) {
        let v = r / rows;  // v在[0,1]区间 | v in [0,1] range
        let theta1 = v * Math.PI; // theta1在[0,PI]区间 | theta1 in [0,PI] range
        let temp = vec3(0, 0, 1);
        let n = vec3(temp); // 实现Float32Array深拷贝 | Float32Array deep copy
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
    let spherePoints = [];  // 用于存放球顶点坐标的数组 | Array to save ball vertex coordinates
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