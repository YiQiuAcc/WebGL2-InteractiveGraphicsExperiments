//#region
/** @type {WebGL2RenderingContext} */ let gl;
// 以下全局变量用于控制动画的状态和速度 | Animation control variables
let angleY = 0.0;   // 绕y轴旋转的角度 | Angle of rotation around the y-axis
let angleX = 90.0;  // 绕x轴旋转的角度 | Angle of rotation around the x-axis
let angleStep = 3;  // 角度变化步长(度) | Angle change step (degrees)

let program; // shader程序对象 | Shader program object
let matProj; // 投影矩阵 | Projection matrix
let cube;
let light = {
    light_position: vec4(0.0, 0.0, 2.0, 1.0),   // 近距离光源 | Close light source
    light_ambient: vec3(0.2, 0.2, 0.2),         // 环境光 | Ambient light
    light_diffuse: vec3(1.0, 1.0, 1.0),         // 漫反射光 | Diffuse light
    light_specular: vec3(1.0, 1.0, 1.0)         // 镜面反射光 | Specular light
};
// 正常光照(白光) | Normal lighting (white light)
let lightNormal = {
    light_position: vec4(0.0, 0.0, 2.0, 1.0),
    light_ambient: vec3(0.2, 0.2, 0.2),
    light_diffuse: vec3(1.0, 1.0, 1.0),
    light_specular: vec3(1.0, 1.0, 1.0)
};
// 暖色调光照(偏黄) | Warm light (yellow)
let lightWarm = {
    light_position: vec4(1.0, 1.0, 2.0, 1.0),
    light_ambient: vec3(0.25, 0.20, 0.15),
    light_diffuse: vec3(1.0, 0.9, 0.7),
    light_specular: vec3(1.0, 0.9, 0.8)
};
// 冷色调光照(偏蓝) | Cold light (blue)
let lightCool = {
    light_position: vec4(-1.0, 0.5, 1.5, 1.0),
    light_ambient: vec3(0.15, 0.15, 0.25),
    light_diffuse: vec3(0.7, 0.8, 1.0),
    light_specular: vec3(0.8, 0.8, 1.0)
};
// 黄铜材质 | Brass material
let mtlBrass = {
    material_ambient: vec3(0.329412, 0.223529, 0.027451),   // 环境光反射系数 | Ambient light reflection coefficient
    material_diffuse: vec3(0.780392, 0.568627, 0.113725),   // 漫反射系数 | Diffuse reflection coefficient
    material_specular: vec3(0.992157, 0.941176, 0.807843),  // 镜面反射系数 | Specular reflection coefficient
    material_shininess: 27.897400                           // 高光系数 | High light coefficient
}
// 金材质 | Gold material
let mtlGold = {
    material_ambient: vec3(0.24725, 0.1995, 0.0745),
    material_diffuse: vec3(0.75164, 0.60648, 0.22648),
    material_specular: vec3(0.628281, 0.555802, 0.366065),
    material_shininess: 51.2
};
// 银材质 | Silver material
let mtlSilver = {
    material_ambient: vec3(0.19225, 0.19225, 0.19225),
    material_diffuse: vec3(0.50754, 0.50754, 0.50754),
    material_specular: vec3(0.508273, 0.508273, 0.508273),
    material_shininess: 51.2
};
// 玉材质 | Jade material
let mtlJade = {
    material_ambient: vec3(0.135, 0.2225, 0.1575),
    material_diffuse: vec3(0.54, 0.89, 0.63),
    material_specular: vec3(0.316228, 0.316228, 0.316228),
    material_shininess: 12.8
};
//#endregion

window.onload = () => {
    const canvas = document.getElementById("gl-canvas");
    if (!canvas) { alert("Canvas element not obtained"); return; }
    gl = canvas.getContext("webgl2")
    if (!gl) { alert("Failed to get webgl2 context"); return; }

    const vProgram = initShaders(gl, "vertex-vShading", "fragment-vShading");
    const fProgram = initShaders(gl, "vertex-fShading", "fragment-fShading");

    vProgram.a_PositionLoc = gl.getAttribLocation(vProgram, "a_Position");
    if (vProgram.a_PositionLoc < 0) { alert("Failed to get the index of attribute variable a_Position!"); return; }
    vProgram.a_NormalLoc = gl.getAttribLocation(vProgram, "a_Normal");
    if (vProgram.a_NormalLoc < 0) { alert("Failed to get the index of attribute variable a_Normal!"); return; }
    fProgram.a_PositionLoc = gl.getAttribLocation(fProgram, "a_Position");
    if (fProgram.a_PositionLoc < 0) { alert("Failed to get the index of attribute variable a_Position!"); return; }
    fProgram.a_NormalLoc = gl.getAttribLocation(fProgram, "a_Normal");
    if (fProgram.a_NormalLoc < 0) { alert("Failed to get the index of attribute variable a_Normal!"); return; }

    const uniforms = [
        'u_matModel', 'u_matView', 'u_matProj',
        'u_matNormal', 'u_LightPosition', 'u_Shininess',
        'u_AmbientProduct', 'u_DiffuseProduct', 'u_SpecularProduct'
    ];

    uniforms.forEach(name => {
        const vLoc = gl.getUniformLocation(vProgram, name);
        const fLoc = gl.getUniformLocation(fProgram, name);
        if (!vLoc || !fLoc)
            alert(`Failed to get the position of uniform variable ${name}`);
        // 动态设置属性 | Dynamic Set up attributes
        vProgram[name + "Loc"] = vLoc;
        fProgram[name + "Loc"] = fLoc;
    });

    gl.clearColor(1.0, 1.0, 1.0, 1.0);  // 设置背景色为白色 | Set the background color to white
    gl.enable(gl.DEPTH_TEST);           // 开启深度检测 | Enable depth detection
    gl.enable(gl.CULL_FACE);            // 开启面剔除，默认剔除背面 | Enable face culling, culling back faces by default
    // 设置视口，占满整个canvas | Set the viewport to cover the entire canvas
    gl.viewport(0, 0, canvas.width, canvas.height);
    // 设置投影矩阵：透视投影，根据视口宽高比指定视域体
    // Set the projection matrix: perspective projection, specify the field of view based on the aspect ratio of the viewport
    matProj = perspective(35.0,         // 垂直方向视角 | Vertical viewing angle
        canvas.width / canvas.height,   // 视域体宽高比 | View volume aspect ratio
        0.1,                            // 相机到近裁剪面距离 | Distance from camera to near clipping plane
        10.0);                          // 相机到远裁剪面距离 | Distance from camera to far clipping plane
    program = vProgram;
    cube = new Cube();
    cube.init();
    cube.useProgram(program);
    document.getElementById("btn-vShading").addEventListener("click", () => {
        program = vProgram;
        cube.useProgram(program);
        requestAnimationFrame(render);
    });
    document.getElementById("btn-fShading").addEventListener("click", () => {
        program = fProgram;
        cube.useProgram(program);
        requestAnimationFrame(render);
    });
    document.getElementById("changeMtl").addEventListener("change", () => {
        switch (document.getElementById("changeMtl").value) {
            case "Brass":
                cube.setMaterial(mtlBrass);
                light = lightNormal;
                break;
            case "Gold":
                cube.setMaterial(mtlGold);
                light = lightWarm;
                break;
            case "Silver":
                cube.setMaterial(mtlSilver);
                light = lightCool;
                break;
            case "Jade":
                cube.setMaterial(mtlJade);
                light = lightCool;
                break;
        }
        requestAnimationFrame(render);
    })
    render();
};
function render() {
    // 清颜色缓存和深度缓存 | Clear the color buffer and depth buffer
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    let matView = translate(0.0, 0.0, -3.0);                // 观察矩阵 | View matrix
    let matModel = mult(rotateY(angleY), rotateX(angleX));  // 绕Y轴旋转, 绕X轴旋转 | Rotate around the Y axis, Rotate around the X axis
    let matNormal = normalMatrix(mult(matView, matModel));  // 计算法向矩阵 | Calculate the normal matrix
    // 传递uniform变量 | Pass uniform variables
    // 计算光照材质乘积 | Calculate the product of the lighting material
    const ambient_product = mult(light.light_ambient, cube.material_ambient);
    const diffuse_product = mult(light.light_diffuse, cube.material_diffuse);
    const specular_product = mult(light.light_specular, cube.material_specular);
    // 设置所有uniform变量 | Set all uniform variables
    gl.uniform4fv(program.u_LightPositionLoc, flatten(light.light_position));
    gl.uniform3fv(program.u_AmbientProductLoc, flatten(ambient_product));
    gl.uniform3fv(program.u_DiffuseProductLoc, flatten(diffuse_product));
    gl.uniform3fv(program.u_SpecularProductLoc, flatten(specular_product));
    gl.uniform1f(program.u_ShininessLoc, cube.material_shininess);

    gl.uniformMatrix4fv(program.u_matProjLoc, false, flatten(matProj));
    gl.uniformMatrix4fv(program.u_matViewLoc, false, flatten(matView));
    gl.uniformMatrix4fv(program.u_matModelLoc, false, flatten(matModel));
    gl.uniformMatrix3fv(program.u_matNormalLoc, false, flatten(matNormal));

    cube.draw();
}

class Cube {
    constructor() {
        this.verticesCount = 36;
        this.vertice = [
            vec3(-0.5, -0.5, 0.5),  // 左下前 | Lower left front
            vec3(-0.5, 0.5, 0.5),   // 左上前 | Upper left front
            vec3(0.5, 0.5, 0.5),    // 右上前 | Upper right front
            vec3(0.5, -0.5, 0.5),   // 右下前 | Lower right front
            vec3(-0.5, -0.5, -0.5), // 左下后 | Lower left back
            vec3(-0.5, 0.5, -0.5),  // 左上后 | Upper left back
            vec3(0.5, 0.5, -0.5),   // 右上后 | Upper right back
            vec3(0.5, -0.5, -0.5)   // 右下后 | Lower right back
        ];
        this.points = new Array(0); // 顶点坐标数组 | Vertex coordinate array
        this.normals = new Array(0);// 顶点法向量数组 | Vertex normal array
        this.pointBuffer = null;    // 顶点坐标缓冲对象 | Vertex coordinate buffer object
        this.normalsBuffer = null;  // 法向缓冲对象 | Normal buffer object
        this.setMaterial(mtlBrass); // 设置材质参数 | Set material parameters
    }
    // 生成立方体一个面的顶点坐标和法向数据, a,b,c,d对应的顶点需为逆时针绕向
    // Generate the vertex coordinates and normal data for a face of the cube, 
    // a, b, c, d corresponding to the vertices that are not parallel to each other
    quad(a, b, c, d) {
        // 计算四边形的两个不平行的边向量 | Calculate the two non-parallel edge vectors
        const u = subtract(this.vertice[b], this.vertice[a]);
        const v = subtract(this.vertice[c], this.vertice[b]);
        // 通过叉乘计算法向 | Calculate the normal through cross multiplication
        const normal = normalize(cross(u, v));

        this.normals.push(normal);
        this.points.push(this.vertice[a]);
        this.normals.push(normal);
        this.points.push(this.vertice[b]);
        this.normals.push(normal);
        this.points.push(this.vertice[c]);
        this.normals.push(normal);
        this.points.push(this.vertice[a]);
        this.normals.push(normal);
        this.points.push(this.vertice[c]);
        this.normals.push(normal);
        this.points.push(this.vertice[d]);
    }
    // 生成立方体顶点坐标和法向数据 | Generate the vertex coordinates and normal data for a cube
    genVertices() {
        this.quad(1, 0, 3, 2); // 前 | front
        this.quad(2, 3, 7, 6); // 右 | right
        this.quad(3, 0, 4, 7); // 下 | bottom
        this.quad(6, 5, 1, 2); // 上 | top
        this.quad(4, 5, 6, 7); // 后 | back
        this.quad(5, 4, 0, 1); // 左 | left
    }
    // 初始化顶点缓冲对象 | Initialize the vertex buffer object
    init() {
        this.genVertices(); // 生成立方体的顶点坐标和法向数据 | Generate the vertex coordinates and normal data for a cube
        // 创建缓冲区对象, 存于变量bufferSphere中 | Create a buffer object, stored in the variable bufferSphere
        this.pointBuffer = gl.createBuffer();
        // 将pointBuffer绑定为当前ARRAY_BUFFER对象 | Bind pointBuffer to the current ARRAY_BUFFER object
        gl.bindBuffer(gl.ARRAY_BUFFER, this.pointBuffer);
        // 为Buffer对象在GPU端申请空间, 并提供数据 | Provide data to the Buffer object on the GPU side and allocate space
        gl.bufferData(gl.ARRAY_BUFFER, flatten(this.points), gl.STATIC_DRAW);
        this.points.length = 0;
        // 创建缓冲区对象, 存于变量normalBuffer中 | Create a buffer object, stored in the variable normalBuffer
        this.normalsBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.normalsBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(this.normals), gl.STATIC_DRAW);
        this.normals.length = 0;
    }
    // 设置材质参数 | Set material parameters
    setMaterial(mtl) {
        this.material_ambient = mtl.material_ambient;
        this.material_diffuse = mtl.material_diffuse;
        this.material_specular = mtl.material_specular;
        this.material_shininess = mtl.material_shininess;
    }
    // 选用shader program, 为顶点属性变量和光照相关uniform变量提供数据
    // Select shader program, provide data for vertex attribute variables and light-related uniform variables
    useProgram(program) {
        gl.useProgram(program);
        // 绑定顶点属性 | Bind vertex attribute
        gl.bindBuffer(gl.ARRAY_BUFFER, this.pointBuffer);
        gl.vertexAttribPointer(program.a_PositionLoc, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(program.a_PositionLoc);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.normalsBuffer);
        gl.vertexAttribPointer(program.a_NormalLoc, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(program.a_NormalLoc);
    }
    // 绘制函数 | Draw function
    draw() {
        gl.drawArrays(gl.TRIANGLES, 0, this.verticesCount);
    }
}
/** @param {KeyboardEvent} e*/
window.onkeydown = (e) => {
    switch (e.key) {
        case "a": case "ArrowLeft":   // 方向键Left | Arrow keyLeft
            angleY -= angleStep;
            if (angleY < -180.0) angleY += 360.0;
            break;
        case "w": case "ArrowUp":     // 方向键Up | Arrow keyUp
            angleX -= angleStep;
            if (angleX < -90.0) angleX = 90.0;
            break;
        case "d": case "ArrowRight":  // 方向键Right | Arrow keyRight
            angleY += angleStep;
            if (angleY > 180.0) angleY -= 360.0;
            break;
        case "s": case "ArrowDown":   // 方向键Down | Arrow keyDown
            angleX += angleStep;
            if (angleX > 90.0) angleX = -90.0;
            break;
        default: return;
    }
    requestAnimationFrame(render); // 请求重绘 | Request redraw
}
