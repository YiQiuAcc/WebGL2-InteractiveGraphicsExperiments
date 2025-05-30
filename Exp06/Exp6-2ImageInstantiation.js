const perSideVertexCount = 2;   // 每边顶点数 | Number of vertices per edge
const vertexCount = perSideVertexCount * perSideVertexCount;   // 一面顶点数 | Number of vertices per face
const perSideTriangleCount = perSideVertexCount - 1;
const indexCount = perSideTriangleCount * perSideTriangleCount * 6; // 每个格子6个索引 | Number of indices per cell
const step = 1.0 / (perSideVertexCount - 1);
const cubeSize = 1.0;   // 立方体绘制时的大小 |  Size of the cube when drawing
const vertices = new Float32Array(vertexCount * 2); // x, y交错存储正方形顶点数据 |  x, y interlaced storage of square vertex data
const indexes = new Uint16Array(indexCount);

/** @type {WebGL2RenderingContext} */ let gl;
/** @type {HTMLCanvasElement} */ let canvas;
// uniform变量的索引 | Index of uniform variables
let u_MVPMatrix, u_Color;

let matProj;    // 投影矩阵 | Projection matrix
let matMVP;     // 模视投影矩阵 | Model-View-Projection matrix
let angleX = 0.0, angleY = 0.0, angleStep = 2.0, zoom = 0.8;
let theta = 0, delta = 60, timeScale = 2000.0;  // 动画旋转角度与速率 | Animation rotation angle and speed
// blocks 数组保存从图像生成的每个方块的位置信息与颜色信息
// The blocks array stores the position information and color information of each block generated from the image
let blocks = [];

const imageBinary = imageData
const blob = new Blob([imageBinary], { type: 'image/png' });
const blobUrl = URL.createObjectURL(blob);
const img = new Image();
img.src = blobUrl;
img.onload = () => {
    const hiddenCanvas = document.createElement('canvas');
    const ctx = hiddenCanvas.getContext('2d');
    hiddenCanvas.width = img.width;
    hiddenCanvas.height = img.height;
    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, img.width, img.height);
    const pixels = imageData.data;
    URL.revokeObjectURL(blobUrl);
    generateBlocksFromPixels(pixels, img.width, img.height);
};
/**
 * Generate block data based on image pixel data
 * @param {Uint8Array} pixels - pixel array of image data
 * @param {number} width - Image width (pixels)
 * @param {number} height -Image height (pixels)
 */
function generateBlocksFromPixels(pixels, width, height) {
    blocks = []; // 清空之前的数据 | Clear previous data
    const whiteThreshold = 0.9
    const spacing = 1.1;    // 方块间距 | Block spacing
    const baseHeight = 0;   // 基本高度 | Base height
    // 遍历图像中的每个像素 | Traverse each pixel in the image
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const index = (y * width + x) * 4;
            const r = pixels[index];
            const g = pixels[index + 1];
            const b = pixels[index + 2];
            const a = pixels[index + 3] / 255; // 转换为0-1范围 | Convert to 0-1 range
            // 跳过完全透明像素
            if (a <= 0.01) continue;
            // 计算亮度值并检查是否接近白色
            const brightness = (r + g + b) / (3 * 255);
            const isWhite = r / 255 > whiteThreshold &&
                g / 255 > whiteThreshold &&
                b / 255 > whiteThreshold;
            // 跳过接近白色的像素
            if (isWhite && brightness > 0.9) continue;
            // 只生成非透明非全白像素的立方体 | Generate only non-transparent and non-white pixels
            if (a > 0 || !(r == 255 && g == 255 && b == 255)) {
                // 将图像坐标映射为3D坐标, 图像中心作为原点 | Map image coordinates to 3D coordinates, with the center of the image as the origin
                const posX = (x - width / 2) * spacing;
                const posZ = (y - height / 2) * spacing;
                const posY = baseHeight;
                // 用颜色的亮度作为高度偏移, 颜色较亮的像素产生更高的方块
                // Use the brightness of the color to offset the height
                const heightOffset = brightness * 8;
                blocks.push({
                    position: [posX, posY + heightOffset, posZ],
                    color: [r / 255, g / 255, b / 255, a]
                });
            }
        }
    }
}
// 计算各面本地变换矩阵 | Calculate the local transformation matrix for each face
const faceTransforms = [
    translate(0, 0, 0.5),                       // 前面 | Front
    mult(translate(0, 0, -0.5), rotateY(180)),  // 后面 | Back
    mult(translate(-0.5, 0, 0), rotateY(-90)),  // 左面 | Left
    mult(translate(0.5, 0, 0), rotateY(90)),    // 右面 | Right
    mult(translate(0, 0.5, 0), rotateX(-90)),   // 上面 | Top
    mult(translate(0, -0.5, 0), rotateX(90))    // 下面 | Bottom
];

window.onload = () => {
    canvas = document.getElementById("gl-canvas");
    if (!canvas) { alert("Canvas element not obtained"); return; }
    gl = canvas.getContext("webgl2")
    if (!gl) { alert("Failed to get webgl2 context"); return; }

    gl.clearColor(0.9, 0.9, 0.9, 1.0);
    gl.enable(gl.DEPTH_TEST);   // 开启深度检测 | Enable depth test
    gl.enable(gl.CULL_FACE);    // 开启面剔除, 默认剔除背面 | Enable face culling, default to cull the back face
    gl.viewport(0, 0, canvas.width, canvas.height);

    // 透视投影矩阵, 视角60度, 视域体从20到100单位 | Perspective projection matrix, field of view 60 degrees, view frustum from 20 to 100 units
    matProj = perspective(60.0, canvas.width / canvas.height, 5.0, 200.0);
    // 构造用于绘制单个面的顶点数据与索引 | Construct the vertex data and index for a single face
    let vIndex = 0, idx = 0;
    for (let i = 0; i < perSideVertexCount; i++) {
        const y = 0.5 - i * step;
        for (let j = 0; j < perSideVertexCount; j++) {
            const x = -0.5 + j * step;
            vertices[vIndex++] = x;
            vertices[vIndex++] = y;
        }
    }
    for (let i = 0; i < perSideTriangleCount; i++) {
        for (let j = 0; j < perSideTriangleCount; j++) {
            const topLeft = i * perSideVertexCount + j;
            const bottomLeft = topLeft + perSideVertexCount;
            indexes[idx++] = topLeft;     // 三角形1 | Triangle 1
            indexes[idx++] = bottomLeft;
            indexes[idx++] = bottomLeft + 1;
            indexes[idx++] = topLeft;     // 三角形2 | Triangle 2
            indexes[idx++] = bottomLeft + 1;
            indexes[idx++] = topLeft + 1;
        }
    }

    // 上传顶点数据到 GPU | Upload vertex data to GPU
    const verticesBufferID = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, verticesBufferID);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW);
    // 上传索引数据到 GPU | Upload index data to GPU
    const indexBufferID = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBufferID);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indexes, gl.STATIC_DRAW);

    // 加载与启用 shader 程序 | Load and enable shader program
    const program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);
    // 设置顶点属性, 将当前 Array Buffer 中的数据送入 a_Position
    // Set the vertex attributes and send the data in the current Array Buffer to a_Position
    const a_Position = gl.getAttribLocation(program, "a_Position");
    if (a_Position < 0) { alert("Failed to get a_Position"); return; }
    gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Position);
    // 获取shader中uniform变量索引 | Get shader uniform variable index
    u_MVPMatrix = gl.getUniformLocation(program, "u_MVPMatrix");
    if (!u_MVPMatrix) { alert("Failed to get u_MVPMatrix"); return; }
    u_Color = gl.getUniformLocation(program, "u_Color");
    if (!u_Color) { alert("Failed to get u_Color"); return; }

    let stop = false;
    // 键盘控制来调整场景旋转 | Control the scene rotation by keyboard
    window.onkeydown = (e) => {
        switch (e.keyCode) {
            case 37: angleY -= angleStep; if (angleY < -180.0) angleY += 360.0; break;
            case 38: angleX -= angleStep; if (angleX < -180.0) angleX += 360.0; break;
            case 39: angleY += angleStep; if (angleY > 180.0) angleY -= 360.0; break;
            case 40: angleX += angleStep; if (angleX > 180.0) angleX -= 360.0; break;
            case 32: stop = !stop; timeScale = stop ? 999999.0 : 2000.0; break;
        }
    };
    window.addEventListener('wheel', (e) => {
        if (e.deltaY < 0) { zoom += 0.1; } else zoom -= 0.1;
        zoom = Math.max(0.2, zoom);
        zoom = Math.min(4.0, zoom);
        document.getElementById("resize").value = zoom;
    });
    document.getElementById("pause").addEventListener("click", () => { stop = !stop; timeScale = stop ? 99999.0 : 2000.0; })
    document.getElementById("resize").addEventListener("input", (e) => {
        zoom = e.target.value;
    })
    render();
}

let last = Date.now();
function animation() {
    const now = Date.now();
    const elapsed = now - last;
    last = now;
    theta += delta * elapsed / timeScale;
    if (theta > 360) theta -= 360;
}

function render() {
    animation();
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    // 构建模视投影矩阵：先用透视矩阵, 再平移并旋转
    // Build MVP matrix: first use perspective matrix, then translate and rotate
    matMVP = matProj;
    matMVP = mult(matMVP, translate(0.0, 0.0, -90.0));
    matMVP = mult(matMVP, scale(zoom, zoom, zoom));
    matMVP = mult(matMVP, rotateY(theta));
    matMVP = mult(matMVP, mult(rotateY(angleY), rotateX(angleX + 90)));
    // 遍历每个从像素数据生成的 block, 并调用 drawCube 绘制立方体
    // Iterate over each block generated from pixel data and call drawCube to draw the cube
    blocks.forEach(block => {
        drawCube(block.position, block.color);
    });
    requestAnimationFrame(render);
}
function drawCube(position, color) {
    // 构造立方体的实例矩阵 | Construct the instance matrix of the cube
    let instanceMat = mult(translate(position[0], position[1], position[2]),
        scale(cubeSize, cubeSize, cubeSize));
    let matNew = mult(matMVP, instanceMat);
    gl.uniform4f(u_Color, color[0], color[1], color[2], color[3]);
    // 使用预计算的变换矩阵渲染每个面 | Render each face using the pre-calculated transformation matrix
    for (let i = 0; i < faceTransforms.length; i++) {
        let finalMat = mult(matNew, faceTransforms[i]);
        gl.uniformMatrix4fv(u_MVPMatrix, false, flatten(finalMat));
        gl.drawElements(gl.TRIANGLES, indexCount, gl.UNSIGNED_SHORT, 0);
    }
}
