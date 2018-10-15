

var RayState = function(size)
{
    var posData   = new Float32Array(size*size*4); // ray position
    var rgbData   = new Float32Array(size*size*4); // ray color
    var rngData   = new Float32Array(size*size*4); // Random number seed
    for (var i = 0; i<size*size; ++i)
    {
        for (var t = 0; t<4; ++t)
        {
            rgbData[i*4 + t] = Math.random();
            rngData[i*4 + t] = Math.random()*4194167.0;
        }
    }
    this.posTex   = new GLU.Texture(size, size, 4, true, false, true, posData);
    this.rgbTex   = new GLU.Texture(size, size, 4, true, false, true, rgbData);
    this.rngTex   = new GLU.Texture(size, size, 4, true, false, true, rngData);
}

RayState.prototype.bind = function(shader)
{
    this.posTex.bind(0);
    this.rgbTex.bind(1);
    this.rngTex.bind(2);
    shader.uniformTexture("PosData", this.posTex);
    shader.uniformTexture("RgbData", this.rgbTex);
    shader.uniformTexture("RngData", this.rngTex);
}

RayState.prototype.attach = function(fbo)
{
    var gl = GLU.gl;
    fbo.attachTexture(this.posTex, 0);
    fbo.attachTexture(this.rgbTex, 1);
    fbo.attachTexture(this.rngTex, 2);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) != gl.FRAMEBUFFER_COMPLETE)
    {
        GLU.fail("Invalid framebuffer");
    }
}

RayState.prototype.detach = function(fbo)
{
    var gl = GLU.gl;
    fbo.detachTexture(0);
    fbo.detachTexture(1);
    fbo.detachTexture(2);
}

/**
* Interface to the raytracer.
* @constructor
* @property {number} [maxNumSteps=256]          - maximum number of raymarching steps per path segment
* @property {number} [raySize=128]              - number of rays per wavefront is the square of this
* @property {number} [marchDistance=100.0]      - the total distance travelled by each ray
* @property {number} [exposure=3.0]             - image exposure, on a log scale
* @property {number} [gamma=2.2]                - image gamma correction
*/
var Raytracer = function()
{
    this.gl = GLU.gl;
    var gl = GLU.gl;

    // Initialize textures containing ray states
    this.raySize = 8; //128;
    this.enabled = true;
    this.pathLength = 0;
    this.initStates();

    this.maxTimeSteps = 32; //256;
    this.integrationTime = 1.0;
    this.gridSpace = 0.01;
    this.pointSpread = 0.1;
    this.exposure = 3.0;
    this.gamma = 2.2;

    this.xmin = 0.0001;
    this.xmax = 0.0001;
    this.ymin = 0.0001;
    this.ymax = 0.0001;
    this.zmin = 0.0001;
    this.zmax = 0.0001;

    // Create a quad VBO for rendering textures
    this.quadVbo = this.createQuadVbo();
    this.boxVbo     = null;
    this.cornerVbos = null;

    // Initialize raytracing shaders
    this.shaderSources = GLU.resolveShaderSource(["init", "trace", "line", "box", "comp", "pass"]);

    // Initialize GL
    this.fbo = new GLU.RenderTarget();
}



Raytracer.prototype.createQuadVbo = function()
{
    var vbo = new GLU.VertexBuffer();
    vbo.addAttribute("Position", 3, this.gl.FLOAT, false);
    vbo.addAttribute("TexCoord", 2, this.gl.FLOAT, false);
    vbo.init(4);
    vbo.copy(new Float32Array([
            1.0,  1.0, 0.0, 1.0, 1.0,
           -1.0,  1.0, 0.0, 0.0, 1.0,
           -1.0, -1.0, 0.0, 0.0, 0.0,
            1.0, -1.0, 0.0, 1.0, 0.0
    ]));
    return vbo;
}

Raytracer.prototype.deleteBoxVbo = function()
{
    if (this.boxVbo)
    {
        this.boxVbo.delete();
        this.boxVbo = null;
    }
}

Raytracer.prototype.createBoxVbo = function(origin, extents)
{
    if (this.boxVbo)
    {
        this.deleteBoxVbo();
    }

	let o = origin;
	let e = extents;

	var corners = [
	  o[0],        o[1],        o[2],
	  o[0] + e[0], o[1],        o[2],
	  o[0] + e[0], o[1],        o[2],
	  o[0] + e[0], o[1] + e[1], o[2],
	  o[0] + e[0], o[1] + e[1], o[2],
	  o[0],        o[1] + e[1], o[2],
	  o[0],        o[1] + e[1], o[2],
	  o[0],        o[1],        o[2],
	  o[0],        o[1],        o[2] + e[2],
	  o[0] + e[0], o[1],        o[2] + e[2],
	  o[0] + e[0], o[1],        o[2] + e[2],
	  o[0] + e[0], o[1] + e[1], o[2] + e[2],
	  o[0] + e[0], o[1] + e[1], o[2] + e[2],
	  o[0],        o[1] + e[1], o[2] + e[2],
	  o[0],        o[1] + e[1], o[2] + e[2],
	  o[0],        o[1],        o[2] + e[2],
	  o[0],        o[1],        o[2],
	  o[0],        o[1],        o[2] + e[2],
	  o[0] + e[0], o[1],        o[2],
	  o[0] + e[0], o[1],        o[2] + e[2],
	  o[0],        o[1] + e[1], o[2],
	  o[0],        o[1] + e[1], o[2] + e[2],
	  o[0] + e[0], o[1] + e[1], o[2],
	  o[0] + e[0], o[1] + e[1], o[2] + e[2],
	];

	var vbo = new GLU.VertexBuffer();
    vbo.addAttribute("Position", 3, gl.FLOAT, false);
    vbo.init(24);
    vbo.copy(new Float32Array(corners));

    this.boxVbo = vbo;
}



Raytracer.prototype.deleteBoxCornerVbos = function()
{
    if (this.cornerVbos)
    {
        for (c=0; c<this.cornerVbos.length; ++c)
        {
            this.axisVbos = this.cornerVbos[c];
            this.axisVbos[0].delete();
            this.axisVbos[1].delete();
            this.axisVbos[2].delete();
        }   
        this.cornerVbos = null;
    }
}

Raytracer.prototype.createBoxCornerVbos = function()
{
    if (this.cornerVbos)
    {
        this.deleteBoxCornerVbos();
    }
    
    bounds = fibre.getBounds();
    boundsMin = bounds.min;
    boundsMax = bounds.max;
    let o = [boundsMin.x, boundsMin.y, boundsMin.z];
    let e = [boundsMax.x-boundsMin.x, boundsMax.y-boundsMin.y, boundsMax.z-boundsMin.z];
    let s = 0.666;

    let outerR = 0.5 * Math.max(e[0], e[1], e[2]);

    this.cornerVbos = [];
    for (c=0; c<8; ++c)
    {   
        let x =     c &1; let xp = s*x + (1.0-s)*((x+1)%2); let xn = -outerR*(xp - x)/Math.abs(xp - x); 
        let y = (c>>1)&1; let yp = s*y + (1.0-s)*((y+1)%2); let yn = -outerR*(yp - y)/Math.abs(yp - y);
        let z = (c>>2)&1; let zp = s*z + (1.0-s)*((z+1)%2); let zn = -outerR*(zp - z)/Math.abs(zp - z);

        this.axisVbos = []
        axis0 = [o[0] + x *e[0] + xn, o[1] + y *e[1],      o[2] + z *e[2],
                 o[0] + xp*e[0],      o[1] + y *e[1],      o[2] + z *e[2]];
        axis1 = [o[0] + x *e[0],      o[1] + y *e[1] + yn, o[2] + z *e[2],
                 o[0] + x *e[0],      o[1] + yp*e[1],      o[2] + z *e[2]];
        axis2 = [o[0] + x *e[0],      o[1] + y *e[1],      o[2] + z *e[2] + zn,
                 o[0] + x *e[0],      o[1] + y *e[1],      o[2] + zp*e[2]];

        this.axisVbos[0] = new GLU.VertexBuffer();
        this.axisVbos[0].addAttribute("Position", 3, gl.FLOAT, false);
        this.axisVbos[0].init(2);
        this.axisVbos[0].copy(new Float32Array(axis0));

        this.axisVbos[1] = new GLU.VertexBuffer();
        this.axisVbos[1].addAttribute("Position", 3, gl.FLOAT, false);
        this.axisVbos[1].init(2);
        this.axisVbos[1].copy(new Float32Array(axis1));

        this.axisVbos[2] = new GLU.VertexBuffer();
        this.axisVbos[2].addAttribute("Position", 3, gl.FLOAT, false);
        this.axisVbos[2].init(2);
        this.axisVbos[2].copy(new Float32Array(axis2));
      
        this.cornerVbos.push(this.axisVbos);
    }
}


Raytracer.prototype.resetBounds = function()
{
    this.deleteBoxVbo();
    this.deleteBoxCornerVbos();
    let bounds = fibre.getBounds();
    boundsMin = bounds.min;
    boundsMax = bounds.max;

    this.xmin = boundsMin.x;
    this.ymin = boundsMin.y;
    this.zmin = boundsMin.z;
    this.xmax = boundsMax.x;
    this.ymax = boundsMax.y;
    this.zmax = boundsMax.z;
}


Raytracer.prototype.reset = function(no_recompile)
{
    this.wavesTraced = 0;
    this.raysTraced = 0;
    this.pathLength = 0;
    this.time_ms = 0.0;

    if (!no_recompile)
        this.compileShaders();
    this.initStates();
    this.resetBounds();

    // Clear fluence buffers
    let gl = GLU.gl;
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    this.fbo.bind();
    this.fbo.drawBuffers(1);
    this.fbo.attachTexture(this.fluenceBuffer, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    this.fbo.unbind();

    this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
}

Raytracer.prototype.compileShaders = function()
{
    // internal shaders
    this.lineProgram  = new GLU.Shader('line',  this.shaderSources, null);
    this.boxProgram   = new GLU.Shader('box',   this.shaderSources, null);
    this.compProgram  = new GLU.Shader('comp',  this.shaderSources, null);
    this.passProgram  = new GLU.Shader('pass',  this.shaderSources, null);

    let glsl = fibre.getGlsl();

    // Copy the current scene and material routines into the source code
    // of the trace fragment shader
    replacements = {};
    replacements.USER_CODE = glsl;

    // shaderSources is a dict from name (e.g. "trace")
    // to a dict {v:vertexShaderSource, f:fragmentShaderSource}
    this.traceProgram = new GLU.Shader('trace', this.shaderSources, replacements);
    if (!this.traceProgram.program)
    {
        this.traceProgram = null;
        return;
    }

    this.initProgram  = new GLU.Shader('init',  this.shaderSources, replacements);
    if (!this.initProgram.program)
    {
        this.initProgram = null;
        this.traceProgram = null;
        return;
    }

    fibre.disable_errors();
}


Raytracer.prototype.initStates = function()
{
    this.raySize = Math.floor(this.raySize);
    this.rayCount = this.raySize*this.raySize;
    this.currentState = 0;
    this.rayStates = [new RayState(this.raySize), new RayState(this.raySize)];
        
    // Create the buffer of texture coordinates, which maps each drawn line
    // to its corresponding texture lookup.
    {
        let gl = GLU.gl;
        this.rayVbo = new GLU.VertexBuffer();
        this.rayVbo.addAttribute("TexCoord", 3, gl.FLOAT, false);
        this.rayVbo.init(this.rayCount*2);
        var vboData = new Float32Array(this.rayCount*2*3);
        for (var i=0; i<this.rayCount; ++i)
        {
            var u = ((i % this.raySize) + 0.5) / this.raySize;
            var v = (Math.floor(i/this.raySize) + 0.5) / this.raySize;
            vboData[i*6 + 0] = vboData[i*6 + 3] = u;
            vboData[i*6 + 1] = vboData[i*6 + 4] = v;
            vboData[i*6 + 2] = 0.0;
            vboData[i*6 + 5] = 1.0;
        }
        this.rayVbo.copy(vboData);
    }
}


Raytracer.prototype.getStats = function()
{
    stats = {};
    stats.rayCount    = this.raysTraced;
    stats.wavesTraced = this.wavesTraced;
    stats.maxNumSteps = this.maxNumSteps;
    return stats;
}

Raytracer.prototype.composite = function()
{
    let gl = GLU.gl;

    // Normalize and tonemap the fluence buffer to produce final pixels
    this.compProgram.bind();
    this.quadVbo.bind();

    // Normalize the emission by dividing by the total number of paths
    // (and also apply gamma correction)
    this.compProgram.uniformF("invNumRays", 1.0/Math.max(this.raysTraced, 1));
    this.compProgram.uniformF("exposure", this.exposure);
    this.compProgram.uniformF("invGamma", 1.0/this.gamma);

    gl.enable(gl.BLEND);
    gl.blendEquation(gl.FUNC_ADD);
    gl.blendFunc(gl.ONE, gl.ONE);

    this.fluenceBuffer.bind(0);
    this.compProgram.uniformTexture("Fluence", this.fluenceBuffer);
    this.quadVbo.draw(this.compProgram, this.gl.TRIANGLE_FAN);

    gl.disable(gl.BLEND);
}


Raytracer.prototype.isEnabled = function()
{
	return this.enabled;
}


Raytracer.prototype.render = function()
{
    if (!this.enabled) return;
    var gl = GLU.gl;
    var timer_start = performance.now();

    // Get camera matrices
    var camera = fibre.camera;
    camera.updateMatrixWorld();
    var matrixWorldInverse = new THREE.Matrix4();
    matrixWorldInverse.getInverse( camera.matrixWorld );
    var modelViewMatrix = matrixWorldInverse.toArray();
    var projectionMatrix = camera.projectionMatrix.toArray();
    
    // Get grid bounds
    let bounds = fibre.getBounds();
    boundsMin = bounds.min;
    boundsMax = bounds.max;
    
    // Clear wavebuffer
    if (this.traceProgram)
    {
        this.fbo.bind();
        this.quadVbo.bind();
        this.fbo.drawBuffers(1);
        gl.viewport(0, 0, this.width, this.height);
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clearDepth(1.0);
        this.fbo.attachTexture(this.waveBuffer, 0); // write to wavebuffer
        gl.disable(gl.DEPTH_TEST);
        gl.clear(gl.COLOR_BUFFER_BIT);
    }

    // Initialize ray start points, colors, and random seeds
    if (this.traceProgram)
    {
        gl.disable(gl.BLEND);
        gl.viewport(0, 0, this.raySize, this.raySize);

        this.fbo.drawBuffers(3);
        let current = this.currentState;
        let next = 1 - current;
        
        this.rayStates[next].attach(this.fbo);
        this.quadVbo.bind();
        this.initProgram.bind(); // Start all rays at emission point(s)
        this.rayStates[current].rngTex.bind(0); // Read random seed from the current state
        this.initProgram.uniformTexture("RngData", this.rayStates[current].rngTex);
        this.initProgram.uniform3Fv("boundsMin", [boundsMin.x, boundsMin.y, boundsMin.z]);
        this.initProgram.uniform3Fv("boundsMax", [boundsMax.x, boundsMax.y, boundsMax.z]);
        this.initProgram.uniformF("gridSpace", this.gridSpace);
        this.initProgram.uniformF("pointSpread", this.pointSpread);

        this.quadVbo.draw(this.initProgram, gl.TRIANGLE_FAN);
        this.currentState = 1 - this.currentState;
    }

    // Prepare raytracing program
    if (this.traceProgram)
    {
        this.traceProgram.bind();
        let timestep = this.integrationTime / this.maxTimeSteps;
        this.traceProgram.uniformF("timestep", timestep);
    }

    // Prepare line drawing program
    {
        this.lineProgram.bind();

        // Setup projection matrix
        var projectionMatrixLocation = this.lineProgram.getUniformLocation("u_projectionMatrix");
        gl.uniformMatrix4fv(projectionMatrixLocation, false, projectionMatrix);

        // Setup modelview matrix (to match camera)
        var modelViewMatrixLocation = this.lineProgram.getUniformLocation("u_modelViewMatrix");
        gl.uniformMatrix4fv(modelViewMatrixLocation, false, modelViewMatrix);
    }

    gl.disable(gl.BLEND);

    if (this.traceProgram)
    {
        // Integrate progressively along the wavefront of rays
        while (this.pathLength < this.maxTimeSteps)
        {
            let current = this.currentState;
            let next = 1 - current;

            // Propagate the current set of rays through the vector field, generating new ray pos/dir data in 'next' rayStates textures
            {
                gl.viewport(0, 0, this.raySize, this.raySize);
                this.fbo.drawBuffers(3);
                this.rayStates[next].attach(this.fbo);
                this.quadVbo.bind();

                this.traceProgram.bind();
                this.rayStates[current].bind(this.traceProgram);       // Use the current state as the initial conditions
                this.quadVbo.draw(this.traceProgram, gl.TRIANGLE_FAN); // Generate the next ray state
                this.rayStates[next].detach(this.fbo)
            }

            // Read this data to draw the next 'wavefront' of rays (i.e. line segments) into the wave buffer
            {
                gl.viewport(0, 0, this.width, this.height);
                gl.disable(gl.DEPTH_TEST);
                this.fbo.drawBuffers(1);

                // The float radiance channels of all lines are simply added each pass
                gl.blendFunc(gl.ONE, gl.ONE); // accumulate line segment radiances
                gl.enable(gl.BLEND);
                this.lineProgram.bind();
                this.rayStates[current].posTex.bind(0); // read PosDataA = current.posTex
                this.rayStates[   next].posTex.bind(1); // read PosDataB = next.posTex
                this.rayStates[current].rgbTex.bind(2); // read RgbDataA = current.rgbTex
                this.rayStates[   next].rgbTex.bind(3); // read RgbDataB = next.rgbTex
                this.lineProgram.uniformTexture("PosDataA", this.rayStates[current].posTex);
                this.lineProgram.uniformTexture("PosDataB", this.rayStates[   next].posTex);
                this.lineProgram.uniformTexture("RgbDataA", this.rayStates[current].rgbTex);
                this.lineProgram.uniformTexture("RgbDataB", this.rayStates[   next].rgbTex);
                this.rayVbo.bind(); // Binds the TexCoord attribute
                this.fbo.attachTexture(this.waveBuffer, 0); // write to wavebuffer
                this.rayVbo.draw(this.lineProgram, gl.LINES, this.raySize*this.raySize*2);
                gl.disable(gl.BLEND);
            }

            // Update raytracing state
            this.pathLength += 1;
            this.currentState = next;
        }

        // Add the wavebuffer contents, a complete set of rendered path segments, into the fluence buffer
        {
            gl.enable(gl.BLEND);
            gl.blendFunc(gl.ONE, gl.ONE); // accumulate radiances of all line segments from current 'wave' of bounces
            this.quadVbo.bind();
            this.fbo.attachTexture(this.fluenceBuffer, 0); // write to fluence buffer
            this.waveBuffer.bind(0);                       // read from wave buffer
            this.passProgram.bind();
            this.passProgram.uniformTexture("WaveBuffer", this.waveBuffer);
            this.quadVbo.draw(this.passProgram, gl.TRIANGLE_FAN);
        }

        this.fbo.unbind();
        gl.disable(gl.BLEND);

        // Final composite of normalized fluence to window
        this.raysTraced += this.raySize*this.raySize;
        this.composite();
    }

    // Draw grid bounds
    {
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        this.boxProgram.bind();
        let boundsHit = fibre.boundsHit;
        if (boundsHit && boundsHit.hit && boundsHit.type == 'center')
            this.boxProgram.uniform4Fv("color", [1.0, 0.9, 0.9, 0.5]);
        else
            this.boxProgram.uniform4Fv("color", [1.0, 1.0, 1.0, 0.2]);
        
        // Setup projection matrix
        var projectionMatrixLocation = this.boxProgram.getUniformLocation("u_projectionMatrix");
        gl.uniformMatrix4fv(projectionMatrixLocation, false, projectionMatrix);

        // Setup modelview matrix (to match camera)
        var modelViewMatrixLocation = this.boxProgram.getUniformLocation("u_modelViewMatrix");
        gl.uniformMatrix4fv(modelViewMatrixLocation, false, modelViewMatrix);

        if (!this.boxVbo)
        {
            let o = [boundsMin.x, boundsMin.y, boundsMin.z];
            let e = [boundsMax.x-boundsMin.x, boundsMax.y-boundsMin.y, boundsMax.z-boundsMin.z];
            this.createBoxVbo(o, e)
        }
        this.boxVbo.bind();
        this.boxVbo.draw(this.boxProgram, gl.LINES);

        // Draw corner highlights if mouse-over is active
        if (boundsHit && boundsHit.hit)
        {
            if (boundsHit.type == 'corner')
            {
                let corner_index = boundsHit.index;
                let axis_index = boundsHit.axis;
                if (!this.cornerVbos)
                    this.createBoxCornerVbos(); 
                let boxCornerVbos = this.cornerVbos[corner_index];
                let boxCornerVbo = boxCornerVbos[axis_index];
                boxCornerVbo.bind();
                this.boxProgram.uniform4Fv("color", [1.0, 0.8, 0.1, 0.5]);
                boxCornerVbo.draw(this.boxProgram, gl.LINES);
            }
        }
    }

    this.wavesTraced += 1;
    this.pathLength = 0;
    var timer_end = performance.now();
    var frame_time_ms = (timer_end - timer_start);
    this.time_ms += frame_time_ms;
}


Raytracer.prototype.resize = function(width, height)
{
	this.width = width;
	this.height = height;
	this.waveBuffer    = new GLU.Texture(width, height, 4, true, false, true, null);
	this.fluenceBuffer = new GLU.Texture(width, height, 4, true, false, true, null);
	this.reset();
}
