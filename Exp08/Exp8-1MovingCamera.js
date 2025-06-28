//#region
const GROUND_SIZE = 20.0;
const SPHERE_COUNT = 50;
const SPHERE_RADIUS = 0.3;
const TORUS_OUTER_RADIUS = 0.5;
const TORUS_INNER_RADIUS = 0.25;
const TORUS_COLLISION_RADIUS = 0.5;
const CAMERA_MOVE_SPEED = 0.3;      // 单位/秒 | Unit/second
const CAMERA_CROUCH_MOVE_SPEED = 0.15;      // 单位/秒 | Unit/second
const CAMERA_ROTATE_SPEED = 45;     // 度/秒 | degrees/second
const CAMERA_RADIUS = 0.5;
// 摄像机眼睛离地面的标准高度 | Standard height of camera eye from the ground
const EYE_LEVEL_OFFSET = 0.4;
const GRAVITY = -9.81;             // 重力加速度(单位/秒^2) | Gravity acceleration (unit/second^2)
const INITIAL_JUMP_SPEED = 5.0;    // 初始向上速度 | Initial upward speed
const CROUCH_SPEED = 4.0;       // 下蹲/起身速度(单位/秒) | Squat/stand up speed (units/second)
const CROUCH_HEIGHT = -0.25;    // 下蹲时的垂直偏移量 | Vertical displacement when squatting
const Y_ADJUST_SPEED = 5.0;

const TERRAIN_SCALE = 10;       // 地形缩放系数 | Terrain scaling factor
const NOISE_OCTAVES = 4;        // 噪声叠加层数 | Number of noise overlays
const NOISE_PERSISTENCE = 0.5;  // 噪声持久度 | Noise persistence
const MAX_HEIGHT = 0.4;         // 最大高度 | Maximum height

/** @type {WebGL2RenderingContext} */ let gl;
/** @type {Array} - 模视投影矩阵栈 | Model View Projection Matrix Stack */
let mvpStack = [];
/** @type {Float32Array<ArrayBuffer>} 投影矩阵 | Projection Matrix */
let matProj;
/** shader中属性变量a_Position的索引 | The index of the attribute variable a_Position in the shader */
let a_PositionLocation;
/** Shader中uniform变量"u_MVPMatrix"的索引 | The index of the uniform variable "u_MVPMatrix" in the Shader */
let u_MVPMatrixLocation;
let matCamera = mat4();
let matReverse = mat4();
/** 地面顶点的个数 | Number of ground vertices */ let groundVerticesCount;
/** 存放地面顶点数据的Buffer对象 | Buffer object storing ground vertex data */ let groundBuffer;
/** 保存球位置的数组, 对每个球位置保存x、z坐标 | An array that stores the ball positions, storing the x and z coordinates for each ball position */
let spherePositions = [];
/** 一个球的顶点数 | Number of vertices of a sphere */ let sphereVerticesCount;
/** 存放球顶点数据的Buffer对象 | Buffer object storing ball vertex data */ let sphereBuffer;
/** 一个圆环的顶点数 | The number of vertices of a ring */ let torusVerticesCount;
/** 存放圆环顶点数据的Buffer对象 | Buffer object storing the ring vertex data */ let torusBuffer;
// 跳跃状态相关全局变量 | Jump state related global variables
let isJumping = false;       // 是否处于跳跃中 | Whether jumping
let jumpY = 0.0;             // 当前的垂直位移 | Current vertical displacement
let jumpVelocity = 0.0;      // 当前的垂直速度 | Current vertical speed

let isCrouching = false;       // 当前是否处于下蹲状态 | Is currently in a squatting state
let targetCrouchY = 0.0;       // 目标垂直偏移(动态过渡用) | Target vertical offset (for dynamic transition)
let currentCrouchY = 0.0;      // 当前实际垂直偏移 | Current actual vertical offset
// 保存W、S、A、D四个方向键的按键状态数组 | Save the key status array of the four direction keys W, S, A, and D
let keyDown = [false, false, false, false];
let deltaAngle = 60.0;
let lastTime = performance.now();
let sphereYRot = 0.0;
let torusYRot = 0.0;
let freezeTorus = false;
let freezeRotSphere = false;
let rotSphereAngle = 0.0;
let getOutOfStuck = false;
//#endregion

window.onload = () => {
    const canvas = document.getElementById("gl-canvas");
    if (!canvas) { alert("Canvas element not obtained"); return; }
    gl = canvas.getContext("webgl2")
    if (!gl) { alert("Failed to get webgl2 context"); return; }

    gl.clearColor(0.0, 0.0, 0.5, 1.0);  // 设置背景色为蓝色 | Set background color to blue
    gl.enable(gl.DEPTH_TEST);           // 开启深度检测 | Enable depth test
    // 设置视口，占满整个canvas | Set the viewport to cover the entire canvas
    gl.viewport(0, 0, canvas.width, canvas.height);
    // 设置投影矩阵：透视投影，根据视口宽高比指定视域体
    // Set the projection matrix: perspective projection, specify the field of view based on the aspect ratio of the viewport
    matProj = perspective(35.0,         // 垂直方向视角 | Vertical viewing angle
        canvas.width / canvas.height,   // 视域体宽高比 | View volume aspect ratio
        0.5,                            // 相机到近裁剪面距离 | Distance from camera to near clipping plane
        50.0);                          // 相机到远裁剪面距离 | Distance from camera to far clipping plane
    const program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);    // 启用该shader程序对象 | Enable this shader program object

    // 获取名称为"a_Position"的shader属性变量的位置 | Get the location of shader attribute variable "a_Position"
    a_PositionLocation = gl.getAttribLocation(program, "a_Position"); // getAttribLocation获取失败则返回-1 | getAttribLocation returns -1 if failed
    if (a_PositionLocation < 0) { alert("Failed to get a_Position"); return; }
    gl.enableVertexAttribArray(a_PositionLocation);    // 为a_Position启用顶点数组 | Enable vertex array for a_Position
    // 获取名称为"u_MVPMatrix"的shader uniform变量位置 | Get the location of shader uniform variable "u_MVPMatrix"
    u_MVPMatrixLocation = gl.getUniformLocation(program, "u_MVPMatrix");
    if (!u_MVPMatrixLocation) { alert("Failed to get uniform variable u_MVPMatrix"); return; }
    // 获取名称为"u_Color"的shader uniform变量位置 | Get the position of the shader uniform variable named "u_Color"
    const u_Color = gl.getUniformLocation(program, "u_Color");
    if (!u_Color) { alert("Failed to get uniform variable u_Color"); return; }
    gl.uniform3f(u_Color, 1.0, 1.0, 1.0);
    initGround();
    initSpheres();
    initTorus();
    render();
};
/** @param {KeyboardEvent} e  */
window.onkeydown = (e) => {
    switch (e.key) {
        case "w": case "ArrowUp": keyDown[0] = true; break;
        case "s": case "ArrowDown": keyDown[1] = true; break;
        case "a": case "ArrowLeft": keyDown[2] = true; break;
        case "d": case "ArrowRight": keyDown[3] = true; break;
        case " ": startJump(); break;
        case "c": case "Control": if (!isCrouching) {
            isCrouching = true;
            targetCrouchY = CROUCH_HEIGHT;
        } break;
        case "Escape": getOutOfStuck = true; break;
        case "F12": debugger; return;
        case "F5": location.reload(); return;
    }
    e.preventDefault();
}
/** @param {KeyboardEvent} e  */
window.onkeyup = (e) => {
    switch (e.key) {
        case "w": case "ArrowUp": keyDown[0] = false; break;
        case "s": case "ArrowDown": keyDown[1] = false; break;
        case "a": case "ArrowLeft": keyDown[2] = false; break;
        case "d": case "ArrowRight": keyDown[3] = false; break;
        case "c": case "Control": isCrouching = false; targetCrouchY = 0.0; break;
    }
}
function render() {
    const currentTime = performance.now();
    const deltaTime = (currentTime - lastTime) / 1000; // 转换为秒 | Convert to seconds
    lastTime = currentTime;
    animation(deltaTime);
    updateCamera(deltaTime);
    updateJump(deltaTime);
    // 清颜色缓存和深度缓存 | Clear color buffer and depth buffer
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    matMVP = mult(matProj, matCamera);
    matMVP = mult(matProj, mult(translate(0, -jumpY - currentCrouchY, 0), matCamera));
    // 将顶点位置数据传递给a_Position变量(数据存放在groundBuffer中)
    // Pass vertex position data to a_Position variable (data stored in groundBuffer)
    gl.bindBuffer(gl.ARRAY_BUFFER, groundBuffer);
    gl.vertexAttribPointer(a_PositionLocation, 3, gl.FLOAT, false, 0, 0);
    mvpStack.push(matMVP);
    matMVP = mult(matMVP, translate(0.0, -0.6, 0.0));
    gl.uniformMatrix4fv(u_MVPMatrixLocation, false, flatten(matMVP));
    gl.drawArrays(gl.LINES, 0, groundVerticesCount);
    matMVP = mvpStack.pop();

    gl.bindBuffer(gl.ARRAY_BUFFER, sphereBuffer);
    gl.vertexAttribPointer(a_PositionLocation, 3, gl.FLOAT, false, 0, 0);
    for (let i = 0; i < SPHERE_COUNT; i++) {
        mvpStack.push(matMVP);
        matMVP = mult(matMVP, translate(spherePositions[i][0], -0.2, spherePositions[i][1]));
        matMVP = mult(matMVP, rotateX(90));
        gl.uniformMatrix4fv(u_MVPMatrixLocation, false, flatten(matMVP));
        gl.drawArrays(gl.LINES, 0, sphereVerticesCount);
        matMVP = mvpStack.pop();
    }
    matMVP = mult(matMVP, translate(0.0, 0.0, -2.5));
    mvpStack.push(matMVP);
    matMVP = mult(matMVP, rotateY(-sphereYRot * 2.0));
    matMVP = mult(matMVP, translate(1.0, 0.0, 0.0));
    matMVP = mult(matMVP, rotateX(90));
    gl.uniformMatrix4fv(u_MVPMatrixLocation, false, flatten(matMVP));
    gl.drawArrays(gl.LINES, 0, sphereVerticesCount);
    matMVP = mvpStack.pop();

    mvpStack.push(matMVP);
    gl.bindBuffer(gl.ARRAY_BUFFER, torusBuffer);
    gl.vertexAttribPointer(a_PositionLocation, 3, gl.FLOAT, false, 0, 0);
    matMVP = mult(matMVP, rotateY(torusYRot));
    gl.uniformMatrix4fv(u_MVPMatrixLocation, false, flatten(matMVP))
    gl.drawArrays(gl.LINES, 0, torusVerticesCount);
    matMVP = mvpStack.pop();

    requestAnimationFrame(render);
}
function animation(deltaTime) {
    if (!freezeTorus) {
        torusYRot += deltaAngle * deltaTime;
        torusYRot %= 360;
    }
    if (!freezeRotSphere) {
        sphereYRot += deltaAngle * deltaTime;
        sphereYRot %= 360;
    }
    updateJump(deltaTime);
    updateCrouch(deltaTime);
}
function startJump() {
    if (!isJumping && currentCrouchY === 0.0) { // 仅允许站立时跳跃 | Jumping is only allowed while standing
        isJumping = true;
        jumpVelocity = INITIAL_JUMP_SPEED;
    }
}
function updateJump(deltaTime) {
    if (isJumping) {
        // 精确积分计算 | Exact integral calculation
        const deltaY = jumpVelocity * deltaTime + 0.5 * GRAVITY * deltaTime * deltaTime;
        jumpY += deltaY;
        jumpVelocity += GRAVITY * deltaTime;
        if (jumpY <= 0.0) { // 落地检测 | Landing detection
            jumpY = 0.0;
            isJumping = false;
            jumpVelocity = 0.0;
        }
    }
}
function updateCrouch(deltaTime) {
    // 平滑过渡到目标高度 | Smooth transition to target height
    if (currentCrouchY !== targetCrouchY) {
        const direction = targetCrouchY > currentCrouchY ? 1 : -1;
        currentCrouchY += direction * CROUCH_SPEED * deltaTime;
        if ((direction === 1 && currentCrouchY > targetCrouchY) ||
            (direction === -1 && currentCrouchY < targetCrouchY)) {
            currentCrouchY = targetCrouchY;
        }
    }
}
/**
 * 更新摄像机变换，并进行碰撞检测，如果发生碰撞则撤销本次变换
 * Update the camera transformation and perform collision detection. If a collision occurs, undo the transformation.
 * @param {number} deltaTime 当前帧与上一帧之间的秒数差 | The difference in seconds between the current frame and the previous frame
 */
function updateCamera(deltaTime) {
    if (getOutOfStuck) {
        matCamera = mat4();
        matReverse = mat4();
        getOutOfStuck = false;
    }
    let camPos = getCameraPosition();
    // 采样当前(x, z)位置处的地形高度 | Sample the terrain height at the current (x, z) position
    let terrainHeight = calcHeight(camPos[0], camPos[2]);
    // 根据当前跳跃和下蹲状态调整期望的 y 坐标 | Adjust the desired y coordinate based on the current jump and crouch state
    let baseHeight = terrainHeight + EYE_LEVEL_OFFSET;
    if (isJumping) {            // 如果正在跳跃，则加上跳跃高度 | If jumping, add the jump height
        baseHeight += jumpY;
    } else if (isCrouching) {   // 如果正在下蹲，则减去下蹲高度 | If squatting, subtract the squat height
        baseHeight += CROUCH_HEIGHT;
    }
    let targetCamY = baseHeight;
    // 线性插值 | Linear interpolation
    let currentCamY = camPos[1];
    let newCamY = currentCamY + (targetCamY - currentCamY) * (Y_ADJUST_SPEED * deltaTime);
    matReverse[7] = newCamY;
    matCamera[7] = -newCamY;
    // console.log(newCamY);
    // 备份当前矩阵状态，以便在发生碰撞时恢复 | Back up the current matrix state
    const oldMatCamera = matCamera;
    const oldMatReverse = matReverse;
    moveSpeed = isCrouching ? CAMERA_CROUCH_MOVE_SPEED : CAMERA_MOVE_SPEED;
    if (keyDown[0]) {  // 前进 | Forward
        matCamera = mult(translate(0.0, 0.0, moveSpeed * deltaTime * 20), matCamera);
        matReverse = mult(matReverse, translate(0.0, 0.0, -moveSpeed * deltaTime * 20));
    }
    if (keyDown[1]) {  // 后退 | Backward
        matCamera = mult(translate(0.0, 0.0, -moveSpeed * deltaTime * 20), matCamera);
        matReverse = mult(matReverse, translate(0.0, 0.0, moveSpeed * deltaTime * 20));
    }
    const rotateAmount = CAMERA_ROTATE_SPEED * deltaTime * 80 * (Math.PI / 180);
    if (keyDown[2]) {  // 向左旋转 | Rotate left
        matCamera = mult(rotateY(-rotateAmount), matCamera);
        matReverse = mult(matReverse, rotateY(rotateAmount));
    }
    if (keyDown[3]) {  // 向右旋转 | Rotate right
        matCamera = mult(rotateY(rotateAmount), matCamera);
        matReverse = mult(matReverse, rotateY(-rotateAmount));
    }
    // 检测更新后的摄像机位置是否发生碰撞 | Check whether the updated camera position has collided
    let collision = checkCollision();
    if (collision) {
        // 如果发生碰撞，则恢复原来的摄像机矩阵，阻挡摄像机运动
        // If collision occurs, restore the original camera matrix to block camera motion
        matCamera = oldMatCamera;
        matReverse = oldMatReverse;
    }
}
function getCameraPosition() {
    return [matReverse[3], matReverse[7], matReverse[11]];
}
/**
 * 碰撞检测 | Collision detection
 * @returns {boolean} 返回 collision 表示是否碰撞 | Returns collision to indicate whether there is a collision
 */
function checkCollision() {
    let collision = false;
    let camPos = getCameraPosition();
    // 边界检测 | Boundary detection
    if (Math.abs(camPos[0]) > GROUND_SIZE ||
        Math.abs(camPos[2]) > GROUND_SIZE) {
        return true;
    }
    // 静止球体的碰撞检测 | Collision detection of static ball
    for (let i = 0; i < SPHERE_COUNT; i++) {
        let sphereX = spherePositions[i][0];
        let sphereY = -0.2;
        let sphereZ = spherePositions[i][1];
        let dx = camPos[0] - sphereX;
        let dy = camPos[1] + jumpY - currentCrouchY - sphereY;
        let dz = camPos[2] - sphereZ;
        if (dx * dx + dy * dy + dz * dz < Math.pow(CAMERA_RADIUS + SPHERE_RADIUS, 2)) {
            collision = true;
        }
    }
    // 旋转球体的碰撞检测 | Rotate sphere collision detection
    const [sphereX, sphereY, sphereZ] = computeRotatingSphereCenter();
    let rdx = camPos[0] - sphereX;
    let rdy = camPos[1] - sphereY;
    let rdz = camPos[2] - sphereZ;
    if (rdx * rdx + rdy * rdy + rdz * rdz < Math.pow(CAMERA_RADIUS + SPHERE_RADIUS, 2)) {
        collision = true;
        freezeRotSphere = true;  // 发生碰撞后冻结运动球体的旋转 | Freeze the rotation of the moving sphere after collision
        return collision;
    } else {
        freezeRotSphere = false; // 条件允许则继续运动 | Continue to move if the condition is allowed
    }
    // 圆环的碰撞检测 | Ring collision detection
    let torusCenter = vec3(0.0, 0.0, -2.5);
    // 只检测 x 和 z 坐标 | Only detect x and z coordinates
    let dx = camPos[0] - torusCenter[0];
    let dz = camPos[2] - torusCenter[2];
    if (dx * dx + dz * dz < Math.pow(CAMERA_RADIUS + TORUS_COLLISION_RADIUS, 2)) {
        collision = true;
        freezeTorus = true;  // 碰撞后冻结圆环的运动 | Freeze the motion of the ring after collision
    } else if (dx * dx + dz * dz > Math.pow(CAMERA_RADIUS + TORUS_COLLISION_RADIUS, 2) + 0.5) {
        // 如果没有碰撞，恢复圆环运动 | If there is no collision, restore the motion of the ring
        freezeTorus = false;
    }
    return collision;
}
function computeRotatingSphereCenter() {
    // 角度转弧度 | Convert degrees to radians
    const theta = (-sphereYRot * 2.0) * Math.PI / 180;
    // 平移(1.0, 0, 0)后经过 Y 轴旋转得到的新坐标 | New coordinates after translation (1.0, 0, 0) and Y axis rotation
    const x = Math.cos(theta) * 1.0;
    const z = -Math.sin(theta) * 1.0 - 2.5;  // 加上最终的 z 平移 | Add the final z translation
    const y = 0.0;  // 根据绘制时使用的 y 偏移 | According to the y offset used when drawing
    return [x, y, z];
}
// 初始化地面缓冲区对象(VBO) | Initialize the ground buffer object (VBO)
function initGround() {
    let ptGround = buildGround(GROUND_SIZE, 1.0);   // 构建地面网格 | Build the ground mesh
    groundBuffer = gl.createBuffer(); // 创建缓冲区 | Create buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, groundBuffer);   // 绑定缓冲区 | Bind buffer
    gl.bufferData(gl.ARRAY_BUFFER, flatten(ptGround), gl.STATIC_DRAW);
    ptGround.length = 0;  // 清空数组 | Empty the array
}
// 初始化球 | Initialize spheres
function initSpheres() {
    for (let iSphere = 0; iSphere < SPHERE_COUNT; iSphere++) {
        const x = Math.random() * GROUND_SIZE * 2 - GROUND_SIZE;
        const z = Math.random() * GROUND_SIZE * 2 - GROUND_SIZE;
        spherePositions.push(vec2(x, z));
    }
    let ptSphere = buildSphere(SPHERE_RADIUS, 15, 15);
    sphereBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, sphereBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(ptSphere), gl.STATIC_DRAW);
    ptSphere.length = 0;
}
// 初始化圆环 | Initialize the torus
function initTorus() {
    let ptTorus = buildTorus(TORUS_OUTER_RADIUS, TORUS_INNER_RADIUS, 40, 20);
    torusBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, torusBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(ptTorus), gl.STATIC_DRAW);
    ptTorus.length = 0;
}
/**
 * 在y=0平面绘制中心点在原点的格状方形地面 | Draw a grid square ground with the center point at the origin on the y=0 plane
 * @param {*} fExtent 决定地面区域大小(方形地面边长的一半) | determines the size of the ground area (half the length of the square ground side)
 * @param {*} fStep 决定线之间的间隔 | determines the interval between lines
 * @returns 用于保存地面顶点的数组 | An array used to store ground vertices
 */
function buildGround(fExtent, fStep) {
    let ptGround = [];
    groundVerticesCount = 0;
    // 生成高度图网格 | Generate height map grid
    const gridSize = Math.floor(fExtent * 2 / fStep) + 1;
    const heightMap = new Array(gridSize);
    for (let i = 0; i < gridSize; i++) {
        heightMap[i] = new Array(gridSize);
    }
    // 填充高度图数据 | Fill height map data
    for (let x = 0; x < gridSize; x++) {
        for (let z = 0; z < gridSize; z++) {
            const worldX = (x - gridSize / 2) * fStep;
            const worldZ = (z - gridSize / 2) * fStep;
            heightMap[x][z] = calcHeight(worldX, worldZ);
        }
    }
    // 生成三角形网格 | Generate triangle mesh
    for (let x = 0; x < gridSize - 1; x++) {
        for (let z = 0; z < gridSize - 1; z++) {
            const x0 = (x - gridSize / 2) * fStep;
            const z0 = (z - gridSize / 2) * fStep;
            const x1 = x0 + fStep;
            const z1 = z0 + fStep;
            // 四个顶点 | Four vertices
            const y00 = heightMap[x][z];
            const y01 = heightMap[x][z + 1];
            const y10 = heightMap[x + 1][z];
            const y11 = heightMap[x + 1][z + 1];
            // 两个三角形组成一个网格面 | Two triangles make up a grid face
            ptGround.push(vec3(x0, y00, z0));
            ptGround.push(vec3(x1, y10, z0));
            ptGround.push(vec3(x0, y00, z0));
            ptGround.push(vec3(x0, y01, z1));

            ptGround.push(vec3(x1, y10, z0));
            ptGround.push(vec3(x1, y11, z1));
            ptGround.push(vec3(x0, y01, z1));
            ptGround.push(vec3(x1, y11, z1));

            groundVerticesCount += 8;
        }
    }
    return ptGround;
}
function calcHeight(x, z) {
    let value = 0;
    let amplitude = MAX_HEIGHT;
    let frequency = 1.0 / TERRAIN_SCALE;
    for (let i = 0; i < NOISE_OCTAVES; i++) {
        value += amplitude * noise(x * frequency, z * frequency);
        amplitude *= NOISE_PERSISTENCE;
        frequency *= 2.0;
    }
    return value;
}
function noise(x, z) {
    const X = Math.floor(x) & 255;
    const Z = Math.floor(z) & 255;
    x -= Math.floor(x);
    z -= Math.floor(z);
    const u = fade(x);
    const v = fade(z);
    const a = grad(X + Z, x, z);
    const b = grad(X + Z + 1, x, z - 1);
    const c = grad(X + Z + 1, x - 1, z);
    const d = grad(X + Z + 2, x - 1, z - 1);
    return lerp(v, lerp(u, a, b), lerp(u, c, d));
}

function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
function lerp(t, a, b) { return a + t * (b - a); }
function grad(hash, x, z) {
    const h = hash & 15;
    const u = h < 8 ? x : z;
    const v = h < 4 ? z : h === 12 || h === 14 ? x : 0;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
}
/**
 * 用于生成一个中心在原点的球的顶点坐标数据(南北极在z轴方向) | Used to generate vertex coordinate data of a sphere with the center at the origin (the north and south poles are in the z-axis direction)
 * @param {*} radius 球的半径 | The radius of the sphere
 * @param {*} columns 经线数 | The number of longitudes
 * @param {*} rows 纬线数 | The number of latitudes
 * @returns 返回用于保存球顶点数据的数组 | Returns the array used to store the vertex data of the sphere
 */
function buildSphere(radius, columns, rows) {
    let vertices = [];              // 存放不同顶点的数组 | Array to store different vertices
    for (let r = 0; r <= rows; r++) {
        let v = r / rows;           // v在[0,1]区间 | v in [0,1] range
        let theta1 = v * Math.PI;   // theta1在[0,PI]区间 | theta1 in [0,PI] range

        let temp = vec3(0, 0, 1);
        let n = vec3(temp);         // 实现Float32Array深拷贝 | Float32Array deep copy
        let cosTheta1 = Math.cos(theta1);
        let sinTheta1 = Math.sin(theta1);
        n[0] = temp[0] * cosTheta1 + temp[2] * sinTheta1;
        n[2] = -temp[0] * sinTheta1 + temp[2] * cosTheta1;

        for (let c = 0; c <= columns; c++) {
            let u = c / columns;    // u在[0,1]区间 | u in [0,1] range
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
    let spherePoints = []; // 用于存放球顶点坐标的数组 | Array used to store the coordinates of the sphere vertices
    let colLength = columns + 1;
    for (let r = 0; r < rows; r++) {
        let offset = r * colLength;
        for (let c = 0; c < columns; c++) {
            let ul = offset + c;        // 左上 | Top left
            let ur = offset + c + 1;    // 右上 | Top right
            let br = offset + (c + 1 + colLength);  // 右下 | Bottom right
            let bl = offset + (c + 0 + colLength);  // 左下 | Bottom left
            // 由两条经线和纬线围成的矩形 | A rectangle formed by two longitudes and one latitude
            // 只绘制从左上顶点出发的3条线段 | Only three line segments starting from the upper left vertex are drawn
            spherePoints.push(vertices[ul]);
            spherePoints.push(vertices[ur]);
            spherePoints.push(vertices[ul]);
            spherePoints.push(vertices[bl]);
            spherePoints.push(vertices[ul]);
            spherePoints.push(vertices[br]);
        }
    }
    vertices.length = 0;
    sphereVerticesCount = rows * columns * 6; // 顶点数 | Vertex count
    return spherePoints;    // 返回顶点坐标数组 | Return vertex coordinate array
}
/**
 * 构建中心在原点的圆环(由线段构建) | Construct a ring with the center at the origin (constructed by line segments)
 * @param {*} majorRadius 圆环的主半径(决定环的大小) | The major radius of the ring (determines the size of the ring)
 * @param {*} minorRadius 圆环截面圆的半径(决定环的粗细) | The radius of the cross-section of the ring (determines the thickness of the ring)
 * @param {*} numMajor 决定模型精细程度 | Determines the model's level of refinement
 * @param {*} numMinor 决定模型精细程度 | Determines the model's level of refinement
 * @returns 返回用于保存圆环顶点数据的数组 | Returns an array used to store the ring's vertex data
 */
function buildTorus(majorRadius, minorRadius, numMajor, numMinor) {
    let ptTorus = [];   // 用于存放圆环顶点坐标的数组 | Array used to store the ring's vertex coordinates
    torusVerticesCount = numMajor * numMinor * 8; // 修正顶点数计算 | Correct the calculation of vertex count
    const majorStep = 2.0 * Math.PI / numMajor;
    const minorStep = 2.0 * Math.PI / numMinor;
    for (let i = 0; i < numMajor; ++i) {
        const a0 = i * majorStep;
        const a1 = a0 + majorStep;
        const x0 = Math.cos(a0);
        const y0 = Math.sin(a0);
        const x1 = Math.cos(a1);
        const y1 = Math.sin(a1);
        for (let j = 0; j < numMinor; ++j) {
            const b0 = j * minorStep;
            const b1 = b0 + minorStep;
            const c0 = Math.cos(b0);
            const r0 = minorRadius * c0 + majorRadius;
            const z0 = minorRadius * Math.sin(b0);
            const c1 = Math.cos(b1);
            const r1 = minorRadius * c1 + majorRadius;
            const z1 = minorRadius * Math.sin(b1);
            // 计算四边形四个顶点 | Calculate the four vertices of the quadrilateral
            const left0 = vec3(x0 * r0, y0 * r0, z0);
            const right0 = vec3(x1 * r0, y1 * r0, z0);
            const left1 = vec3(x0 * r1, y0 * r1, z1);
            const right1 = vec3(x1 * r1, y1 * r1, z1);
            // 添加四条边(每个边两个顶点) | Add four edges (two vertices per edge)
            ptTorus.push(left0, right0);   // 主半径方向前边 | In front of the main radius
            ptTorus.push(right0, right1);  // 经线方向右边 | On the right side of the meridian
            ptTorus.push(right1, left1);   // 主半径方向后边 | Behind the main radius
            ptTorus.push(left1, left0);    // 经线方向左边 | On the left side of the meridian
        }
    }
    return ptTorus;
}
