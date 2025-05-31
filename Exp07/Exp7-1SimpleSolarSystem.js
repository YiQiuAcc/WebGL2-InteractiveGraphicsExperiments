//#region 全局常量 | Global constants
// 天体尺寸 | Planet size
const EARTH_SIZE = 0.4;
const MOON_SIZE = 0.1;
const MOON_SATELLITE_SIZE = 0.05;
const SUN_SIZE = 0.5;
const PLANET_X_SIZE = 0.4;
const SATELLITE_SIZE = 0.15;
// 轨道参数 | Orbit parameters
const RADIUS_EARTH_ORBIT = 5;
const RADIUS_MOON_ORBIT = 0.7;
const RADIUS_MOON_SATELLITE_ORBIT = 0.2;
const RADIUS_PLANET_X_ORBIT = 2.8;
const RADIUS_STAR_ORBIT = 0.7;
const RADIUS_SATELLITE1_ORBIT = 0.7;
const RADIUS_SATELLITE2_ORBIT = 1.1;
// 时间参数 | Time parameters
const EARTH_DAY_HOURS = 24;
const EARTH_YEAR_DAYS = 365;
const PLANET_X_DAY_HOURS = 36;
const PLANET_X_YEAR_DAYS = 300;
const SATELLITE2_ORBITS_PER_YEAR = 8;
// 运动参数 | Motion parameters
const DOUBLE_STAR_SPEED = 50.0; // 双星每年转50圈 | Double star yearly turn 50 circles
const MOON_ORBIT_SPEED = 12.0;  // 月球每年绕地球12圈 | The moon orbits the earth 12 times a year
const MOON_SATELLITE_ORBIT_SPEED = 48.0;  // 月球卫星每年绕月球48圈 | The moon satellite orbits the moon 48 times a year
// 颜色参数 | Color parameters
const COLOR_SUN1 = [1.0, 0.0, 0.0];      // 红色 | Red
const COLOR_SUN2 = [0.0, 0.8, 1.0];      // 青色 | Cyan
const COLOR_EARTH = [0.2, 0.2, 1.0];     // 蓝色 | Blue
const COLOR_MOON = [0.3, 0.7, 0.3];      // 绿色 | Green
const COLOR_PLANET_X = [0.8, 0.2, 0.8];  // 紫色 | Purple
const COLOR_SATELLITE1 = [0.2, 1.0, 0.2];// 亮绿 | Light Green
const COLOR_SATELLITE2 = [1.0, 0.5, 0.0];// 橙色 | Orange
const COLOR_MOON_SATELLITE = [0.7, 0.7, 0.7]; // 月卫颜色 | Moon satellite color
// 观察参数 | Observation parameters
const CAMERA_DISTANCE = 7.0;
const GLOBAL_SCALE = 0.6;
const CAMERA_POSITION = vec3(0, 3, 16);
const CAMERA_TARGET = vec3(0, 0, 0);
const CAMERA_UP = vec3(0, 1, 0);
//#endregion
//#region 全局变量 | Global variables
/** @type {WebGL2RenderingContext} */ let gl;
/** @type {HTMLCanvasElement} */ let canvas;
/** @type {WebGLUniformLocation} */ let u_MVPMatrix;
/** @type {WebGLUniformLocation} */ let u_Color;
/** @type {Float32Array<ArrayBuffer>} */ let matProj;
/** @type {Float32Array<ArrayBuffer>} */ let matMVP;
/** @type {Array} */ let mvpStack = [];
/** @type {Array} */ let spherePoints = [];
/** 一个球的顶点数 | Vertice count of one sphere */ let verticesCount;
/** 控制动画运行和暂停 | Control animation running and pausing */
let runAnimation = true;
/** 控制单步执行模式开启和关闭 | Toggles single-step mode on and off*/ let singleStep = false;
/** 一天中的小时数 | Hours of the day */ let hourOfDay = 0.0
/** 一年中的天数 | Days of the year */ let dayOfYear = 0.0;
/** 行星X自转时间(36小时为一天) | Rotation time of Planet X (36 hours per day) */
let hourOfDayX = 0.0;
/** 行星X公转时间(300天为一年) | Planet X's orbital time (300 days per year) */
let dayOfYearX = 0.0;
/** 控制动画速度变量, 表示真实时间1秒对应的小时数 
 * Controls the animation speed variable, indicating the number of hours 
 * corresponding to 1 second in real time */
let animationStep = 24.0;
/** 双星系统旋转角度 | Rotation angle of binary star system */ let doubleStarAngle = 0.0;
/** 上一次调用函数的时刻 | The time when the function was last called */ let last = Date.now();
//#endregion

window.onload = () => {
    canvas = document.getElementById("gl-canvas");
    if (!canvas) { alert("Canvas element not obtained"); return; }
    gl = canvas.getContext("webgl2")
    if (!gl) { alert("Failed to get webgl2 context"); return; }

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.enable(gl.DEPTH_TEST);   // 开启深度检测 | Enable depth test
    gl.viewport(0, 0, canvas.width, canvas.height);
    matProj = perspective(30.0, canvas.width / canvas.height, 1.0, 30.0);
    // 生成中心在原点半径为1,15条经线和纬线的球的顶点
    // Generate a sphere with a center at the origin, radius 1, 15 longitude lines and 15 latitude lines
    buildSphere(1.0, 15, 15);

    const verticesBufferID = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, verticesBufferID);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(spherePoints), gl.STATIC_DRAW);

    const program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    const a_Position = gl.getAttribLocation(program, "a_Position");
    if (a_Position < 0) { alert("Failed to get a_Position"); return; }
    gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Position);

    u_MVPMatrix = gl.getUniformLocation(program, "u_MVPMatrix");
    if (!u_MVPMatrix) { alert("Failed to get uniform variable u_MVPMatrix"); return; }
    u_Color = gl.getUniformLocation(program, "u_Color");
    if (!u_Color) { alert("Failed to get uniform variable u_Color"); return; }
    render();
}
window.onkeydown = (e) => {
    switch (e.keyCode) {
        case 82: // R
            if (singleStep) { singleStep = false; runAnimation = true; }// 结束单步执行并重启动画 | End single-step execution and restart animation
            else runAnimation = !runAnimation; break;       // 切换动画开关状态 | Toggle animation switch status
        case 83: singleStep = true; runAnimation = true; break; // S
        case 38: animationStep = Math.min(animationStep * 2, 3600); break;  // Up键, 加快动画速度 | Up key, speed up animation
        case 40: animationStep = Math.max(animationStep / 2, 0.1); break;   // Down键, 减慢动画速度 | Down key, slow down animation
    }
}
// 根据时间更新旋转角度 |  Update rotation angle
function animation() {
    let now = Date.now();
    let elapsed = now - last;
    last = now;
    if (runAnimation) {
        let hours = animationStep * elapsed / 1000.0;
        // 更新地球系统时间 |  Update earth system time
        hourOfDay += hours;
        dayOfYear += hours / 24.0;
        // 更新行星X系统时间(36小时为一天) | Update planet X system time (36 hours per day)
        hourOfDayX += hours * (24.0 / 36.0); // 自转速度是地球的2/3 | The rotation speed is 2/3 of the Earth's
        dayOfYearX += hours / (36.0);        // 每年300天 | 300 days per year
        // 更新双星系统角度 | Update binary system angles
        doubleStarAngle += 360.0 * (hours / 24.0) * DOUBLE_STAR_SPEED / 365.0;
        hourOfDay %= 24;
        dayOfYear %= 365;
        hourOfDayX %= 36;   // 行星X天长36小时 |Planet X day is 36 hours long
        dayOfYearX %= 300;  // 行星X年长300天 | Planet X year is 300 days long
        doubleStarAngle %= 360;
    }
}

/**
 * 用于生成一个中心在原点的球的顶点坐标数据(南北极在z轴方向)
 * Used to generate vertex coordinate data of a sphere centered at the origin
 *  (the north and south poles are in the z-axis direction)
 * @param {float} radius  球的半径 | Sphere radius
 * @param {int} columns  经线数 | Longitude lines
 * @param {int} rows  纬线数 | Latitude lines
 */
function buildSphere(radius, columns, rows) {
    let vertices = [];
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
            let u = c / columns; // u在[0,1]区间 | u in [0,1] range
            let theta2 = u * Math.PI * 2; // theta2在[0,2PI]区间 | theta2 in [0,2PI] range
            let pos = vec3(n);
            temp = vec3(n);
            let cosTheta2 = Math.cos(theta2);
            let sinTheta2 = Math.sin(theta2);
            pos[0] = temp[0] * cosTheta2 - temp[1] * sinTheta2;
            pos[1] = temp[0] * sinTheta2 + temp[1] * cosTheta2;

            let posFull = mult(radius, pos);
            vertices.push(posFull);
        }
    }
    // 生成最终顶点数组数据(使用线段进行绘制) | Generate final vertex array data (using lines to draw)
    if (spherePoints.length > 0) spherePoints.length = 0; // 如果sphere已经有数据, 先回收 | If sphere already has data, recycle first
    verticesCount = rows * columns * 6; // 顶点数 | Vertex count

    let colLength = columns + 1;
    for (let r = 0; r < rows; r++) {
        let offset = r * colLength;
        for (let c = 0; c < columns; c++) {
            let ul = offset + c;                  // 左上 | Upper left
            let ur = offset + c + 1;              // 右上 | Upper right
            let br = offset + (c + 1 + colLength);// 右下 | Lower right
            let bl = offset + (c + 0 + colLength);// 左下 | Lower left
            // 由两条经线和纬线围成的矩形, 只绘制从左上顶点出发的3条线段
            // A rectangle formed by two longitudes and latitudes, with only three line segments drawn starting from the upper left vertex
            spherePoints.push(vertices[ul]);
            spherePoints.push(vertices[ur]);
            spherePoints.push(vertices[ul]);
            spherePoints.push(vertices[bl]);
            spherePoints.push(vertices[ul]);
            spherePoints.push(vertices[br]);
        }
    }
    vertices.length = 0;
}
/**
 * 绘制太阳系 | draw the Solar System
 * @param {Float32Array<ArrayBuffer>} mvp 模视投影矩阵 | Model View Projection Matrix
 */
function drawSolarSystem(mvp) {
    mvpStack.push(mvp);
    // 双星系统旋转 | Double star system rotation
    mvp = mult(mvp, rotateY(doubleStarAngle));
    // 绘制第一个小太阳(左) | Draw the first sun (left)
    mvpStack.push(mvp);
    mvp = mult(mvp, translate(-RADIUS_STAR_ORBIT, 0, 0));
    mvp = mult(mvp, rotateX(90));   //调整南北极 | Adjust the North and South Poles
    mvp = mult(mvp, scale(SUN_SIZE, SUN_SIZE, SUN_SIZE));
    gl.uniformMatrix4fv(u_MVPMatrix, false, flatten(mvp));
    gl.uniform3fv(u_Color, COLOR_SUN1);
    gl.drawArrays(gl.LINES, 0, verticesCount);
    mvp = mvpStack.pop();

    // 绘制第二个小太阳(右) | Draw the second sun (right)
    mvpStack.push(mvp);
    mvp = mult(mvp, translate(RADIUS_STAR_ORBIT, 0, 0));
    mvp = mult(mvp, rotateX(90));   //调整南北极 | Adjust the North and South Poles
    mvp = mult(mvp, scale(SUN_SIZE, SUN_SIZE, SUN_SIZE));
    gl.uniformMatrix4fv(u_MVPMatrix, false, flatten(mvp));
    gl.uniform3fv(u_Color, COLOR_SUN2);
    gl.drawArrays(gl.LINES, 0, verticesCount);
    mvp = mvpStack.pop();
    mvp = mvpStack.pop();
    mvpStack.push(mvp);
    // 地球系统 | Earth system
    mvpStack.push(mvp);
    mvp = mult(mvp, rotateY(360 * dayOfYear / EARTH_YEAR_DAYS));
    mvp = mult(mvp, translate(RADIUS_EARTH_ORBIT, 0, 0));
    mvp = mult(mvp, rotateY(-360 * dayOfYear / EARTH_YEAR_DAYS));
    mvp = mult(mvp, rotateZ(-40));
    drawEarthSystem(mvp);
    mvp = mvpStack.pop();
    // 行星X系统 | Planet X system
    mvpStack.push(mvp);
    mvp = mult(mvp, rotateY(360 * dayOfYearX / PLANET_X_YEAR_DAYS));
    mvp = mult(mvp, translate(RADIUS_PLANET_X_ORBIT, 0, 0));
    drawPlanetXSystem(mvp);
    mvp = mvpStack.pop();
}
/**
 * 绘制地球系统 | draw the Earth system
 * @param {Float32Array<ArrayBuffer>} mvp 模视投影矩阵 | Model View Projection Matrix
 */
function drawEarthSystem(mvp) {
    // 绘制地球, 地球的缩放和自转不应该影响月球
    // Draw the Earth, the scaling and rotation of the Earth should not affect the Moon
    mvpStack.push(mvp); // 保存矩阵状态 | Save the matrix
    // 地球自转, 用hourOfDay进行控制 | Earth rotation, which should not affect the Moon
    mvp = mult(mvp, rotateY(360 * hourOfDay / EARTH_DAY_HOURS));
    mvp = mult(mvp, rotateX(90));   //调整南北极 | Adjust the North and South Poles
    mvp = mult(mvp, scale(EARTH_SIZE, EARTH_SIZE, EARTH_SIZE));// 控制地球大小 | Control the size of the Earth
    // 画一个蓝色的球来表示地球 | Draw a blue ball to represent the Earth
    gl.uniformMatrix4fv(u_MVPMatrix, false, flatten(mvp));
    gl.uniform3fv(u_Color, COLOR_EARTH);
    gl.drawArrays(gl.LINES, 0, verticesCount);
    mvp = mvpStack.pop();
    // 月球 | Moon
    mvpStack.push(mvp); // 保存地球系统坐标系 | Save the Earth system
    mvp = mult(mvp, rotateY(360 * MOON_ORBIT_SPEED * dayOfYear / EARTH_YEAR_DAYS));
    mvp = mult(mvp, translate(RADIUS_MOON_ORBIT, 0, 0));
    drawMoonSystem(mvp); // 调用月球系统绘制函数 | Call the Moon system drawing function
    mvp = mvpStack.pop();
}
/**
 * 绘制月球及其卫星系统 | Draw the Moon and its satellite system
 * @param {Float32Array<ArrayBuffer>} mvp 模视投影矩阵 | Model View Projection Matrix
 */
function drawMoonSystem(mvp) {
    // 绘制月球本体 | Draw the Moon
    mvpStack.push(mvp); // 保存月球系统坐标系  | Save the moon system coordinate system
    mvp = mult(mvp, rotateX(90));   //调整南北极 | Adjust the North and South Poles
    mvp = mult(mvp, scale(MOON_SIZE, MOON_SIZE, MOON_SIZE));
    gl.uniformMatrix4fv(u_MVPMatrix, false, flatten(mvp));
    gl.uniform3fv(u_Color, COLOR_MOON);
    gl.drawArrays(gl.LINES, 0, verticesCount);
    mvp = mvpStack.pop(); // 恢复至月球系统坐标系(平移后的位置) | Restore to the moon system coordinate system (the position after translation)
    // 绘制月球卫星 | Draw the moon satellite
    mvpStack.push(mvp); // 保存月球位置坐标系 | Save the moon position coordinate system
    mvp = mult(mvp, rotateY(360 * MOON_SATELLITE_ORBIT_SPEED * dayOfYear / EARTH_YEAR_DAYS));
    mvp = mult(mvp, translate(RADIUS_MOON_SATELLITE_ORBIT, 0, 0));
    mvp = mult(mvp, rotateX(90));   //调整南北极 | Adjust the North and South Poles
    mvp = mult(mvp, scale(MOON_SATELLITE_SIZE, MOON_SATELLITE_SIZE, MOON_SATELLITE_SIZE));
    gl.uniformMatrix4fv(u_MVPMatrix, false, flatten(mvp));
    gl.uniform3fv(u_Color, COLOR_MOON_SATELLITE);
    gl.drawArrays(gl.LINES, 0, verticesCount);
    mvp = mvpStack.pop(); // 恢复至月球位置坐标系 | Restore to the moon position coordinate system
}
/**
 * 绘制行星X及其卫星系统 | Draw Planet X and its satellite system
 * @param {Float32Array<ArrayBuffer>} mvp 模视投影矩阵 | Model View Projection Matrix
 */
function drawPlanetXSystem(mvp) {
    // 行星X本体 | Planet X
    mvpStack.push(mvp); // 保存公转后的位置 | Save the position after rotation
    // 自转(36小时一天) | Self rotation (36 hours a day)
    mvp = mult(mvp, rotateY(360 * hourOfDayX / PLANET_X_DAY_HOURS));
    mvp = mult(mvp, rotateX(90));   //调整南北极 | Adjust the North and South Poles
    mvp = mult(mvp, scale(PLANET_X_SIZE, PLANET_X_SIZE, PLANET_X_SIZE));
    gl.uniformMatrix4fv(u_MVPMatrix, false, flatten(mvp));
    gl.uniform3fv(u_Color, COLOR_PLANET_X);
    gl.drawArrays(gl.LINES, 0, verticesCount);
    mvp = mvpStack.pop();
    // 同步卫星 | Synchronous satellite
    mvpStack.push(mvp);
    // 与行星X自转同步(36小时一圈) | Synchronous with the Planet X self rotation (36 hours a circle)
    mvp = mult(mvp, rotateY(360 * hourOfDayX / PLANET_X_DAY_HOURS));
    mvp = mult(mvp, translate(RADIUS_SATELLITE1_ORBIT, 0, 0));
    mvp = mult(mvp, rotateX(90));   //调整南北极  | Adjust the North and South Poles
    mvp = mult(mvp, scale(SATELLITE_SIZE, SATELLITE_SIZE, SATELLITE_SIZE));
    gl.uniformMatrix4fv(u_MVPMatrix, false, flatten(mvp));
    gl.uniform3fv(u_Color, COLOR_SATELLITE1);
    gl.drawArrays(gl.LINES, 0, verticesCount);
    mvp = mvpStack.pop();
    // 反向卫星 | Reverse satellite
    mvpStack.push(mvp);
    // 反向旋转：每年绕8圈，负角度实现逆时针 | Reverse satellite: one year around 8 circles, negative angle to implement counterclockwise
    mvpStack.push(mvp);
    mvp = mult(mvp, rotateY(-360 * SATELLITE2_ORBITS_PER_YEAR * dayOfYearX / PLANET_X_YEAR_DAYS));
    mvp = mult(mvp, translate(RADIUS_SATELLITE2_ORBIT, 0, 0));
    mvp = mult(mvp, rotateX(90));   //调整南北极 | Adjust the North and South Poles
    mvp = mult(mvp, scale(SATELLITE_SIZE, SATELLITE_SIZE, SATELLITE_SIZE));
    gl.uniformMatrix4fv(u_MVPMatrix, false, flatten(mvp));
    gl.uniform3fv(u_Color, COLOR_SATELLITE2);
    gl.drawArrays(gl.LINES, 0, verticesCount);
    mvp = mvpStack.pop();
}
function render() {
    animation();
    // 清颜色缓存和深度缓存 | Clear color cache and depth cache
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    let mvp = matProj;    // 定义模视投影矩阵, 初始化为投影矩阵 | Define MVP matrix, initialize to projection matrix
    // 在观察坐标系(照相机坐标系)下思考, 定位整个场景(第一种观点)或世界坐标系(第二种观点)
    // Think in terms of the viewing coordinate system (camera coordinate system),
    // positioning the entire scene (first point of view) or the world coordinate system (second point of view)
    // mvp = mult(mvp, translate(0, 1.0, -CAMERA_DISTANCE));
    // mvp = mult(mvp, scale(GLOBAL_SCALE, GLOBAL_SCALE, GLOBAL_SCALE));
    mvp = mult(mvp, lookAt(CAMERA_POSITION, CAMERA_TARGET, CAMERA_UP))
    // 将太阳系绕x轴旋转30度以便在xy平面上方观察, 或者使用lookAt
    // Rotate the solar system around the x-axis by 30 degrees to be able to observe it on the xy plane above,or use lookAt
    // mvp = mult(mvp, rotateX(90.0));
    // 绘制太阳系 | Draw the solar system
    drawSolarSystem(mvp);
    // 如果是单步执行, 则关闭动画 | If it is a single step, turn off the animation
    if (singleStep) runAnimation = false;
    requestAnimationFrame(render); // 请求重绘 | Request redraw
}
