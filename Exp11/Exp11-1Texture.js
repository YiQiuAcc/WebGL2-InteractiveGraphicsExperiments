/** @type{WebGL2RenderingContext} */ let gl;
// 以下全局变量用于控制动画的状态和速度 | Animation Control and Speed
let angleY = 0.0;       // 绕y轴旋转的角度 | Angle of rotation around the y-axis
let angleX = 0.0;       // 绕x轴旋转的角度 | Angle of rotation around the x-axis
let angleStep = 3.0;    // 角度变化步长(3度) | Angle change step (3 degrees)

let program;            // shader程序对象 | Shader program object
let matProj;            // 投影矩阵 | Projection matrix

// 光源参数 | Light parameters
const light = {
    light_position: vec4(0.0, 0.0, 2.0, 1.0),   // 近距离光源 | Close light source
    light_ambient: vec3(0.2, 0.2, 0.2),         // 环境光 | Ambient light
    light_diffuse: vec3(1.0, 1.0, 1.0),         // 漫反射光 | Diffuse light
    light_specular: vec3(1.0, 1.0, 1.0)         // 镜面反射光 | Specular light
}
// 木板材质参数 | Wooden material parameters
const mtlOak = {        // 橡木(浅棕色) | Oak tree (light brown)
    material_ambient: vec3(0.35, 0.25, 0.18),
    material_diffuse: vec3(0.65, 0.50, 0.35),
    material_specular: vec3(0.25, 0.20, 0.15),
    material_shininess: 15.0
}
const mtlCherry = {     // 樱桃木(红棕色) | Cherry tree (red brown)
    material_ambient: vec3(0.40, 0.20, 0.15),
    material_diffuse: vec3(0.75, 0.40, 0.30),
    material_specular: vec3(0.30, 0.15, 0.10),
    material_shininess: 20.0
}
const mtlWalnut = {     // 胡桃木(深棕色) | Walnut (deep brown)
    material_ambient: vec3(0.25, 0.15, 0.10),
    material_diffuse: vec3(0.45, 0.30, 0.20),
    material_specular: vec3(0.15, 0.10, 0.05),
    material_shininess: 12.0
}
const mtlMaple = {      // 枫木(浅黄色) | Maple (light yellow)
    material_ambient: vec3(0.45, 0.40, 0.30),
    material_diffuse: vec3(0.85, 0.75, 0.60),
    material_specular: vec3(0.30, 0.25, 0.20),
    material_shininess: 25.0
}
const mtlMahogany = {   // 桃花心木(红褐色) | Mahogany (red brown)
    material_ambient: vec3(0.50, 0.25, 0.20),
    material_diffuse: vec3(0.80, 0.45, 0.35),
    material_specular: vec3(0.35, 0.20, 0.15),
    material_shininess: 18.0
}
// 定义Cube对象 | Cube object
class Cube {
    constructor() {
        this.numVertices = 36;      // 绘制立方体使用顶点数(6个面*2个三角形*3个顶点)  | Number of vertices to draw a cube
        this.vertices = [
            vec3(-0.5, -0.5, 0.5),  // 左下前 | Lower left front
            vec3(-0.5, 0.5, 0.5),   // 左上前 | Upper left front
            vec3(0.5, 0.5, 0.5),    // 右上前 | Upper right front
            vec3(0.5, -0.5, 0.5),   // 右下前 | Lower right front
            vec3(-0.5, -0.5, -0.5), // 左下后 | Lower left back
            vec3(-0.5, 0.5, -0.5),  // 左上后 | Upper left back
            vec3(0.5, 0.5, -0.5),   // 右上后 | Upper right back
            vec3(0.5, -0.5, -0.5)   // 右下后 | Lower right back
        ];
        this.points = new Array(0);     // 存放顶点坐标的数组，初始为空 | Array for storing vertex coordinates, initially empty
        this.normals = new Array(0);    // 存放法向的数组，初始为空 | Array for storing normals, initially empty
        this.texcoords = new Array(0);  // 存放纹理坐标的数组，初始为空 | Array for storing texture coordinates, initially empty
        this.pointBuffer = null;        // 顶点坐标缓冲对象 | Vertex coordinate buffer object
        this.normalBuffer = null;       // 法向缓冲对象 | Normal buffer object
        this.texBuffer = null;          // 纹理坐标缓冲对象 | Texture coordinate buffer object
        this.setMaterial(mtlOak);       // 设置材质参数 | Set material parameters
        this.complete = false;          // 纹理对象是否初始化完成 | Whether texture object is initialized
    }
    // 生成立方体一个面的顶点坐标和法向数据, abcd对应的顶点须为逆时针绕向
    // Generate the vertex coordinate and normal data of a face of a cube, with abcd corresponding to the vertices in counterclockwise order
    quad(a, b, c, d) {
        // 计算四边形的两个不平行的边向量 | Calculate two parallel sides of the quad
        let u = subtract(this.vertices[b], this.vertices[a]);
        let v = subtract(this.vertices[c], this.vertices[b]);
        // 通过叉乘计算法向 | Calculate the normal through cross multiplication
        let normal = normalize(cross(u, v));

        this.normals.push(normal);
        this.texcoords.push(vec2(0.0, 0.0));
        this.points.push(this.vertices[a]);

        this.normals.push(normal);
        this.texcoords.push(vec2(1.0, 0.0));
        this.points.push(this.vertices[b]);

        this.normals.push(normal);
        this.texcoords.push(vec2(1.0, 1.0));
        this.points.push(this.vertices[c]);

        this.normals.push(normal);
        this.texcoords.push(vec2(0.0, 0.0));
        this.points.push(this.vertices[a]);

        this.normals.push(normal);
        this.texcoords.push(vec2(1.0, 1.0));
        this.points.push(this.vertices[c]);

        this.normals.push(normal);
        this.texcoords.push(vec2(0.0, 1.0));
        this.points.push(this.vertices[d]);
    }
    // 生成立方体的顶点坐标和法向数据 | Generate the vertex coordinate and normal data of a cube
    genVertices() {
        this.quad(1, 0, 3, 2);    // 前 | front
        this.quad(2, 3, 7, 6);    // 右 | right
        this.quad(3, 0, 4, 7);    // 下 | bottom
        this.quad(6, 5, 1, 2);    // 上 | top
        this.quad(4, 5, 6, 7);    // 后 | back
        this.quad(5, 4, 0, 1);    // 左 | left
    }
    // 初始化顶点缓冲对象 | Initialize the vertex coordinate buffer object
    init() {
        this.genVertices(); // 生成立方体的顶点坐标和法向数据 | Generate the vertex coordinate and normal data of a cube
        // 创建并初始化顶点坐标缓冲区对象(Buffer Object) | Create and initialize the vertex coordinate buffer object
        // 创建缓冲区对象 | Create and initialize the vertex coordinate buffer object
        this.pointBuffer = gl.createBuffer();
        // 将pointBuffer绑定为当前Array Buffer对象 | Bind the pointBuffer to the current Array Buffer object
        gl.bindBuffer(gl.ARRAY_BUFFER, this.pointBuffer);
        // 为Buffer对象在GPU端申请空间，并提供数据 | Provide data for the Buffer object in the GPU
        gl.bufferData(gl.ARRAY_BUFFER,  // Buffer类型 | Buffer type
            flatten(this.points),       // 数据来源 | Data Source
            gl.STATIC_DRAW              // 表明是一次提供数据，多遍绘制 | Indicates that the data is provided once and drawn multiple times
        );
        // 顶点数据已传至GPU端，可释放内存 | Release memory after the vertex data has been passed to the GPU
        this.points.length = 0;
        this.vertices.length = 0;

        // 创建并初始化顶点法向缓冲区对象(Buffer Object) | Create and initialize the vertex normal buffer object
        // 创建缓冲区对象 | Create and initialize the vertex normal buffer object
        this.normalBuffer = gl.createBuffer();
        // 将normalBuffer绑定为当前Array Buffer对象 | Bind the normalBuffer to the current Array Buffer object
        gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
        // 为Buffer对象在GPU端申请空间，并提供数据 | Provide data for the Buffer object in the GPU
        gl.bufferData(gl.ARRAY_BUFFER,  // Buffer类型 | Buffer type
            flatten(this.normals),      // 数据来源 | Data Source
            gl.STATIC_DRAW              // 表明是一次提供数据，多遍绘制 | Indicates that the data is provided once and drawn multiple times
        );
        this.normals.length = 0; // 顶点数据已传至GPU端，可释放内存 | Release memory after the vertex data has been passed to the GPU

        // 创建并初始化顶点纹理坐标缓冲区对象(Buffer Object) | Create and initialize the vertex texture coordinate buffer object
        // 创建缓冲区对象 | Create and initialize the vertex texture coordinate buffer object
        this.texBuffer = gl.createBuffer();
        // 将texBuffer绑定为当前Array Buffer对象 | Bind the texBuffer to the current Array Buffer object
        gl.bindBuffer(gl.ARRAY_BUFFER, this.texBuffer);
        // 为Buffer对象在GPU端申请空间，并提供数据 | Provide data for the Buffer object in the GPU
        gl.bufferData(gl.ARRAY_BUFFER,  // Buffer类型 | Buffer type
            flatten(this.texcoords),    // 数据来源 | Data Source
            gl.STATIC_DRAW              // 表明是一次提供数据，多遍绘制 | Indicates that the data is provided once and drawn multiple times
        );
        this.texcoords.length = 0; // 顶点数据已传至GPU端，可释放内存 | Release memory after the vertex data has been passed to the GPU

        const img = new Image();    //创建一个Image对象 | Create an Image object
        // 注册图像加载完成事件的响应函数 | Register the response function for image loading completion event
        img.onload = () => {
            cube.initTexture(img);    //初始化纹理对象 | Initialize the texture object
            render();
        }
        // 浏览器异步加载图像 | Asynchronously load the image in the browser
        img.src = "wood.jpg";
    }
    initTexture(img) {
        this.texObj = gl.createTexture();    // 创建纹理对象 | Create a texture object
        // 绑定当前二维纹理对象 | Bind the current 2D texture object
        gl.bindTexture(gl.TEXTURE_2D, this.texObj);
        // 设置加载纹理图时沿Y轴翻转 | Flip the texture map along the Y axis
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
        // 加载纹理图到显存 | Load the texture map to the GPU memory
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
        // 设置对纹理图缩放时采用的插值方式 | Set the interpolation method when scaling the texture map
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        this.complete = true;    // 纹理对象初始化完成 | Texture object initialization completed
    }
    // 设置材质 | Set material
    setMaterial(mtl) {
        this.material_ambient = mtl.material_ambient;       // 环境光反射系数 | Ambient light reflection coefficient
        this.material_diffuse = mtl.material_diffuse;       // 漫反射系数 | Diffuse reflection coefficient
        this.material_specular = mtl.material_specular;     // 镜面反射系数 | Specular reflection coefficient
        this.material_shininess = mtl.material_shininess;   // 高光系数 | High light coefficient
        // 如果program非空，将材质属性传给shader | Set the material properties to the shader if program is not null
        if (program) {
            const ambient_product = mult(light.light_ambient, this.material_ambient);
            const diffuse_product = mult(light.light_diffuse, this.material_diffuse);
            const specular_product = mult(light.light_specular, this.material_specular);

            gl.uniform3fv(program.u_AmbientProductLoc, flatten(ambient_product));
            gl.uniform3fv(program.u_DiffuseProductLoc, flatten(diffuse_product));
            gl.uniform3fv(program.u_SpecularProductLoc, flatten(specular_product));
            gl.uniform1f(program.u_ShininessLoc, this.material_shininess);
        }
    }
    // 选用shader program，为属性变量和光照相关uniform变量提供数据
    // Select the shader program and provide data for the attribute variables and uniform variables related to lighting
    useProgram(program) {
        gl.useProgram(program);
        // 将顶点坐标buffer绑定为当前buffer | Bind the pointBuffer to the current buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.pointBuffer);
        // 为顶点属性数组提供数据(数据存放在pointBuffer对象中)
        // Provide data for the vertex attribute array (the data is stored in the pointBuffer object)
        gl.vertexAttribPointer(
            program.a_PositionLoc,  // 属性变量索引
            3,          // 每个顶点属性的分量个数 | The number of components per vertex attribute
            gl.FLOAT,   // 数组数据类型 | Array data type
            false,      // 是否进行归一化处理 | Whether to perform normalization
            0,          // 在数组中相邻属性成员起始位置间的间隔(以字节为单位) | The interval between the starting positions of adjacent attribute members in the array (in bytes)
            0           // 第一个属性值在buffer中的偏移量 | The offset of the first attribute value in the buffer
        );
        // 为a_Position启用顶点数组 | Enable the vertex array for a_Position
        gl.enableVertexAttribArray(program.a_PositionLoc);

        // 将顶点纹理坐标buffer绑定为当前buffer | Bind the texBuffer to the current buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.texBuffer);
        // 为顶点属性数组提供数据(数据存放在normalBuffer对象中)
        // Provide data for the vertex attribute array (the data is stored in the normalBuffer object)
        gl.vertexAttribPointer(
            program.a_TexcoordLoc,  // 属性变量索引 | Attribute variable index
            2,          // 每个顶点属性的分量个数 | The number of components per vertex attribute
            gl.FLOAT,   // 数组数据类型 | Array data type
            false,      // 是否进行归一化处理 | Whether to perform normalization
            0,          // 在数组中相邻属性成员起始位置间的间隔(以字节为单位) | The interval between the starting positions of adjacent attribute members in the array (in bytes)
            0           // 第一个属性值在buffer中的偏移量 | The offset of the first attribute value in the buffer
        );
        // 为a_Texcoord启用顶点数组 | Enable the vertex array for a_Texcoord
        gl.enableVertexAttribArray(program.a_TexcoordLoc);

        // 将顶点法向buffer绑定为当前buffer | Bind the normalBuffer to the current buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
        // 为顶点属性数组提供数据(数据存放在normalBuffer对象中) | Provide data for the vertex attribute array (the data is stored in the normalBuffer object)
        gl.vertexAttribPointer(
            program.a_NormalLoc,    // 属性变量索引 | Attribute variable index
            3,          // 每个顶点属性的分量个数 | The number of components per vertex attribute
            gl.FLOAT,   // 数组数据类型 | Array data type
            false,      // 是否进行归一化处理 | Whether to perform normalization
            0,          // 在数组中相邻属性成员起始位置间的间隔(以字节为单位) | The interval between the starting positions of adjacent attribute members in the array (in bytes)
            0           // 第一个属性值在buffer中的偏移量 | The offset of the first attribute value in the buffer
        );
        // 为a_Normal启用顶点数组 | Enable the vertex array for a_Normal
        gl.enableVertexAttribArray(program.a_NormalLoc);

        const ambient_product = mult(light.light_ambient, this.material_ambient);
        const diffuse_product = mult(light.light_diffuse, this.material_diffuse);
        const specular_product = mult(light.light_specular, this.material_specular);

        gl.uniform4fv(program.u_LightPositionLoc, flatten(light.light_position));
        gl.uniform3fv(program.u_AmbientProductLoc, flatten(ambient_product));
        gl.uniform3fv(program.u_DiffuseProductLoc, flatten(diffuse_product));
        gl.uniform3fv(program.u_SpecularProductLoc, flatten(specular_product));
        gl.uniform1f(program.u_ShininessLoc, this.material_shininess);

        gl.uniform1i(program.u_SamplerLoc, 0);
    }
    // 绘制函数 | Draw function
    draw() {
        if (this.complete) gl.drawArrays(gl.TRIANGLES, 0, this.numVertices);
    }
}

let cube = new Cube();    // 创建一个Cube对象实例 | Create a Cube object instance

window.onload = () => {
    /**@type{HTMLCanvasElement} */
    const canvas = document.getElementById("gl-canvas");
    if (!canvas) { alert("Canvas element not obtained"); return; }
    gl = canvas.getContext("webgl2")
    if (!gl) { alert("Failed to get webgl2 context"); return; }
    // 初始化顶点缓冲对象 | Initialize vertex buffer object
    cube.init();

    /*设置WebGL相关属性 | Set WebGL related properties */
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

    /*加载片元光照shader程序并为shader中属性变量提供数据 | Load fragment lighting shader program and provide data for shader attributes*/
    // 加载id分别为"vertex-fShading"和"fragment-fShading"的shader程序，
    // Load the shader programs with id "vertex-fShading" and "fragment-fShading",
    // 并进行编译和链接，返回shader程序对象program
    // Compile and link, and return the shader program object program
    const fProgram = initShaders(gl, "vertex-fShading", "fragment-fShading");

    // 获取fProgram中各属性变量索引 | Get the attribute variable index for fProgram
    // 注意getAttribLocation失败则返回-1 | Note that getAttribLocation fails and returns -1 if it fails
    fProgram.a_PositionLoc = gl.getAttribLocation(fProgram, "a_Position");
    if (fProgram.a_PositionLoc < 0) console.log("Failed to get the index of attribute variable a_Position!");
    fProgram.a_NormalLoc = gl.getAttribLocation(fProgram, "a_Normal");
    if (fProgram.a_NormalLoc < 0) console.log("Failed to get the index of attribute variable a_Normal!");

    // 获取fProgram中各uniform变量索引 | Get the uniform variable index for fProgram
    // 注意getUniformLocation失败则返回null | Note that getUniformLocation fails and returns null if it fails
    const uniforms = ['u_matModel', 'u_matView', 'u_Projection',
        'u_NormalMat', 'u_LightPosition', 'u_AmbientProduct',
        'u_DiffuseProduct', 'u_SpecularProduct', 'u_Shininess',
        'u_Sampler'];

    uniforms.forEach(name => {
        const loc = gl.getUniformLocation(fProgram, name);
        if (!loc) {
            console.log(`Failed to get the index of uniform variable ${name}`);
        }
        fProgram[name + 'Loc'] = loc;
    })

    program = fProgram;
    // 选用shader program，为属性变量和光照相关uniform变量提供数据
    // Choose the shader program, provide data for attribute variables and lighting-related uniform variables
    cube.useProgram(program);

    // 材质菜单响应 | Material menu response
    const mtlMenu = document.getElementById("material");
    mtlMenu.onchange = () => {
        switch (mtlMenu.selectedIndex) {
            case 0:     // 橡木材质 | Oak wood material
                cube.setMaterial(mtlOak);
                break;
            case 1:     // 樱桃木材质 | Cherry wood material
                cube.setMaterial(mtlCherry);
                break;
            case 2:     // 胡桃木材质 | Walnut wood material
                cube.setMaterial(mtlWalnut);
                break;
            case 3:     // 枫木材质 | Maple wood material
                cube.setMaterial(mtlMaple);
                break;
            case 4:     // 桃花心木材质 | Mahogany wood material
                cube.setMaterial(mtlMahogany);
                break;
        }
        mtlMenu.blur(); // 让菜单控件失去焦点 | Make the menu control lose focus
        requestAnimationFrame(render); // 请求重绘 | Request redraw
    }
    render();
};

function render() {
    // 清颜色缓存和深度缓存 | Clear the color buffer and depth buffer
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    // 创建变换矩阵 | Create transformation matrix
    let matView = translate(0.0, 0.0, -3.0);    // 观察矩阵 | View matrix
    // 模型变换矩阵 | Model transformation matrix
    let matModel = mult(rotateY(angleY),    // 绕y轴旋转 | Rotate around the y-axis
        rotateX(angleX));                   // 绕x轴旋转 | Rotate around the x-axis
    // 计算法向矩阵 | Calculate the normal matrix
    let matNormal = normalMatrix(mult(matView, matModel));

    // 传值给shader | Pass values to shader
    gl.uniformMatrix4fv(program.u_ProjectionLoc, false, flatten(matProj));
    gl.uniformMatrix4fv(program.u_matViewLoc, false, flatten(matView));
    gl.uniformMatrix4fv(program.u_matModelLoc, false, flatten(matModel));
    gl.uniformMatrix3fv(program.u_NormalMatLoc, false, flatten(matNormal));

    cube.draw(); // 绘制立方体 | Draw the cube
}

// 按键响应 | Keyboard response
// 用于控制视角旋转 | Used to control the view
window.onkeydown = (event) => {
    switch (event.keyCode) {
        case 37:    // 方向键Left | Arrow keyLeft
            angleY -= angleStep;
            if (angleY < -180.0) angleY += 360.0;
            break;
        case 38:    // 方向键Up | Arrow keyUp
            angleX -= angleStep;
            if (angleX < -80.0) angleX = -80.0;
            break;
        case 39:    // 方向键Right | Arrow keyRight
            angleY += angleStep;
            if (angleY > 180.0) angleY -= 360.0;
            break;
        case 40:    // 方向键Down | Arrow keyDown
            angleX += angleStep;
            if (angleX > 80.0) angleX = 80.0;
            break;
        default: return;
    }
    requestAnimationFrame(render); // 请求重绘 | Request redraw
}
