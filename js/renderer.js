
var RayState = function(size)
{
    var posData   = new Float32Array(size*size*4); // ray position
    var rgbData   = new Float32Array(size*size*4); // ray color
    var edgData   = new Float32Array(size*size*4); // Ray edges
    this.posTex   = new GLU.Texture(size, size, 4, true, false, true, posData);
    this.rgbTex   = new GLU.Texture(size, size, 4, true, false, true, rgbData);
    this.edgTex   = new GLU.Texture(size, size, 4, true, false, true, edgData);

    // Random number seeds
    var rngData = new Float32Array(size*size*4); 
    for (var i = 0; i<size*size; ++i)
    {
        for (var t = 0; t<4; ++t)
        {
            rgbData[i*4 + t] = Math.random();
            rngData[i*4 + t] = Math.random()*4194167.0;
        }
    }
    this.rngTex = new GLU.Texture(size, size, 4, true, false, true, rngData);
}

RayState.prototype.bind = function(shader)
{
    this.posTex.bind(0);
    this.rngTex.bind(1);
    shader.uniformTexture("PosData", this.posTex);
    shader.uniformTexture("RngData", this.rngTex);
}

RayState.prototype.attach = function(fbo)
{
    var gl = GLU.gl;
    fbo.attachTexture(this.posTex, 0);
    fbo.attachTexture(this.rgbTex, 1);
    fbo.attachTexture(this.rngTex, 2);
    fbo.attachTexture(this.edgTex, 3);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) != gl.FRAMEBUFFER_COMPLETE)
    {
        GLU.fail("Invalid framebuffer");
    }
}

RayState.prototype.detach = function(fbo)
{
    fbo.detachTexture(0);
    fbo.detachTexture(1);
    fbo.detachTexture(2);
    fbo.detachTexture(3);
}

var Renderer = function()
{
    this.gl = GLU.gl;
    var gl = GLU.gl;

    this.settings = {}

    // Initialize textures containing ray states
    this.settings.rayBatch = 128;
    this.enabled = true;
    this.time_ms = 0.0;
    this.waveBuffer = null;
    this.offsetTex = null;
    this.depthBuffer = null;
    this.fluenceBuffer = null;

    // integrator settings
    this.settings.maxTimeSteps = 128;
    this.settings.maxIterations = 100;
    this.settings.integrationTime = 1.0;
    this.settings.integrateForward = true;
    this.settings.gridSpace = 0.1;
    this.settings.tubeWidth = 0.001;
    this.settings.tubeSpread = false;
    this.settings.record_realtime = true;
    this.settings.xmin = 0.0001;
    this.settings.xmax = 0.0001;
    this.settings.ymin = 0.0001;
    this.settings.ymax = 0.0001;
    this.settings.zmin = 0.0001;
    this.settings.zmax = 0.0001;

    // rendering settings
    this.settings.clipToBounds = true;
    this.settings.showBounds = true;
    this.settings.enableBounds = true;
    this.settings.exposure = -1.0;
    this.settings.gamma = 2.2;
    this.settings.contrast = 1.0;
    this.settings.saturation = 1.0;
    this.settings.subtractiveColor = false;
    this.settings.bgColor = [0.0, 0.0, 0.0];
    this.settings.hairShader = true;
    this.settings.specShine = 50.0;
    this.settings.specColor = [0.5, 0.5, 0.5];

    this.settings.light1_color = [1.0, 0.9, 0.8];
    this.settings.light2_color = [0.8, 0.9, 1.0];
    let oosr3 = 1.0 / Math.pow(3.0, 0.5);
    this.settings.light1_dir = [ oosr3,  oosr3,  oosr3];
    this.settings.light2_dir = [-oosr3, -oosr3, -oosr3];

    this.settings.depthTest = true;
    this.settings.dash_spacing = 0.05;
    this.settings.dash_speed = 10.0;
    this.settings.dash_size = 0.5;
    this.settings.dashes = false;

    this.settings.anim_frames = 240;
    this.settings.anim_enable_turntable = true;
    this.settings.anim_turntable_degrees = 360.0;
    
    // Create a quad VBO for rendering textures
    this.quadVbo = this.createQuadVbo();
    this.boxVbo     = null;
    this.cornerVbos = null;

    // Initialize raytracing shaders
    this.shaderSources = GLU.resolveShaderSource(["init", "trace", "line", "box", "comp", "pass"]);

    // Initialize GL
    this.ray_fbo = new GLU.RenderTarget();
    this.img_fbo = new GLU.RenderTarget();
    this.tmp_fbo = new GLU.RenderTarget();

    this.initStates();
}

Renderer.prototype.createQuadVbo = function()
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

Renderer.prototype.deleteBoxVbo = function()
{
    if (this.boxVbo)
    {
        this.boxVbo.delete();
        this.boxVbo = null;
    }
}

Renderer.prototype.createBoxVbo = function(origin, extents)
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

Renderer.prototype.deleteBoxCornerVbos = function()
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

Renderer.prototype.createBoxCornerVbos = function()
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
    let innerR = 0.333;
    let s = 1.0 - innerR;
    let outerR = 0.2 * Math.max(e[0], e[1], e[2]);

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

Renderer.prototype.resetBounds = function()
{
    this.deleteBoxVbo();
    this.deleteBoxCornerVbos();
    let bounds = fibre.getBounds();
    boundsMin = bounds.min;
    boundsMax = bounds.max;
    this.settings.xmin = boundsMin.x;
    this.settings.ymin = boundsMin.y;
    this.settings.zmin = boundsMin.z;
    this.settings.xmax = boundsMax.x;
    this.settings.ymax = boundsMax.y;
    this.settings.zmax = boundsMax.z;
}

Renderer.prototype.reset = function(no_recompile)
{
    this.wavesTraced = 0;
    this.raysTraced = 0;
    this.time_ms = 0.0;
    this.currentState = 0;

    this.reset_time = performance.now();

    if (!no_recompile)
        this.compileShaders();
    this.resetBounds();

    // Clear fluence buffers
    let gl = GLU.gl;
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    this.tmp_fbo.bind();
    this.tmp_fbo.drawBuffers(1);
    this.tmp_fbo.attachTexture(this.fluenceBuffer, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    this.tmp_fbo.unbind();

    gl.clearColor(0.0, 0.0, 0.0, 1.0);

    fibre.render_dirty = true;
}

Renderer.prototype.compileShaders = function()
{
    // internal shaders
    this.lineProgram  = new GLU.Shader('line',  this.shaderSources, null);
    this.boxProgram   = new GLU.Shader('box',   this.shaderSources, null);
    this.compProgram  = new GLU.Shader('comp',  this.shaderSources, null);
    this.passProgram  = new GLU.Shader('pass',  this.shaderSources, null);

    if (!this.lineProgram.program || 
        !this.boxProgram.program  || 
        !this.compProgram.program || 
        !this.passProgram.program)
    {   
        this.enabled = false;
        return;
    } 

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

    this.enabled = true;
    fibre.disable_errors();
}

Renderer.prototype.initStates = function()
{
    this.settings.rayBatch = Math.floor(this.settings.rayBatch);
    let size = this.settings.rayBatch;

    this.rayCount = size*size;
    this.currentState = 0;
    this.rayStates = [new RayState(size), new RayState(size)];
    
    if (this.offsetTex) this.offsetTex.delete();
    this.offsetTex = new GLU.Texture(size, size, 4, true, false, true, null);

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
            var u = ((i % this.settings.rayBatch) + 0.5) / this.settings.rayBatch;
            var v = (Math.floor(i/this.settings.rayBatch) + 0.5) / this.settings.rayBatch;
            vboData[i*6 + 0] = vboData[i*6 + 3] = u;
            vboData[i*6 + 1] = vboData[i*6 + 4] = v;
            vboData[i*6 + 2] = 0.0;
            vboData[i*6 + 5] = 1.0;
        }
        this.rayVbo.copy(vboData);
    }
}

Renderer.prototype.getStats = function()
{
    stats = {};
    stats.rayCount    = this.raysTraced;
    stats.wavesTraced = this.wavesTraced;
    stats.maxNumSteps = this.maxNumSteps;
    return stats;
}

Renderer.prototype.composite = function()
{
    let gl = GLU.gl;

    // Normalize and tonemap the fluence buffer to produce final pixels
    this.compProgram.bind();
    this.quadVbo.bind();

    let bounds = fibre.getBounds();
    boundsMin = bounds.min;
    boundsMax = bounds.max;
    let scale = Math.max(boundsMax.x-boundsMin.x,
                         boundsMax.y-boundsMin.y,
                         boundsMax.z-boundsMin.z);

    // Normalize the emission by dividing by the total number of paths
    // (and also apply gamma correction)
    let Npasses = Math.max(this.wavesTraced, 1);
    this.compProgram.uniformF("invNpasses", this.settings.depthTest ? 10.0/Npasses : 1.0/Npasses);

    let time_since_reset_ms = performance.now() - this.reset_time;
    this.compProgram.uniformF("time", time_since_reset_ms/1.0e3);

    this.compProgram.uniformF("exposure", this.settings.exposure);
    this.compProgram.uniformF("invGamma", 1.0/this.settings.gamma);
    this.compProgram.uniformF("contrast", this.settings.contrast);
    this.compProgram.uniformF("saturation", this.settings.saturation);
    this.compProgram.uniformI("dashes", this.settings.dashes);
    this.compProgram.uniformF("dash_spacing", scale*this.settings.gridSpace*this.settings.dash_spacing);
    this.compProgram.uniformF("dash_speed", this.settings.dash_speed);
    this.compProgram.uniformF("dash_size", this.settings.dash_size);
    this.compProgram.uniform3Fv("bg_color", this.settings.bgColor);
    this.compProgram.uniformI("subtractive_color", this.settings.subtractiveColor);
    
    gl.disable(gl.BLEND);
    this.fluenceBuffer.bind(0);
    this.compProgram.uniformTexture("Fluence", this.fluenceBuffer);
    this.quadVbo.draw(this.compProgram, this.gl.TRIANGLE_FAN);

    gl.disable(gl.BLEND);
}

Renderer.prototype.isEnabled = function()
{
	return this.enabled;
}

Renderer.prototype.trace = function(integrate_forward)
{
    this.traceProgram.bind();
    this.traceProgram.uniformI("integrateForward", integrate_forward);

    // Initialize ray start points, colors, and random seeds
    {
        gl.disable(gl.BLEND);
        gl.viewport(0, 0, this.settings.rayBatch, this.settings.rayBatch);

        this.ray_fbo.bind();
        this.ray_fbo.drawBuffers(4);
        let current = this.currentState;
        let next = 1 - current;
        this.rayStates[next].attach(this.ray_fbo);
        this.ray_fbo.attachTexture(this.offsetTex, 3);

        if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) != gl.FRAMEBUFFER_COMPLETE)
        {
            GLU.fail("Invalid framebuffer");
        }

        let bounds = fibre.getBounds();
        boundsMin = bounds.min;
        boundsMax = bounds.max;
        let scale = Math.max(boundsMax.x-boundsMin.x,
                            boundsMax.y-boundsMin.y,
                            boundsMax.z-boundsMin.z);

        this.quadVbo.bind();
        this.initProgram.bind(); // Start all rays at emission point(s)
        this.rayStates[current].rngTex.bind(0); // Read random seed from the current state
        this.initProgram.uniformTexture("RngData", this.rayStates[current].rngTex);
        this.initProgram.uniform3Fv("boundsMin", [boundsMin.x, boundsMin.y, boundsMin.z]);
        this.initProgram.uniform3Fv("boundsMax", [boundsMax.x, boundsMax.y, boundsMax.z]);
        this.initProgram.uniformF("gridSpace", scale*this.settings.gridSpace);
        this.initProgram.uniformF("tubeWidth", scale*Math.max(this.settings.tubeWidth, 1.0e-6));
        this.initProgram.uniformI("tubeSpread", this.settings.tubeSpread);

        this.quadVbo.draw(this.initProgram, gl.TRIANGLE_FAN);
        this.currentState = 1 - this.currentState;
        this.ray_fbo.detachTexture(3);
        this.ray_fbo.unbind();
    }
    
    // Integrate progressively along the wavefront of rays
    let pathLength = 0;
    let maxPathLength = this.settings.maxTimeSteps;
    if (!integrate_forward) maxPathLength = Math.max(1, maxPathLength/2);

    while (pathLength < maxPathLength)
    {
        let current = this.currentState;
        let next = 1 - current;

        // Propagate the current set of rays through the vector field, generating new ray pos/dir data in 'next' rayStates textures
        {
            gl.viewport(0, 0, this.settings.rayBatch, this.settings.rayBatch);
            this.ray_fbo.bind();
            this.ray_fbo.drawBuffers(4);
            this.rayStates[next].attach(this.ray_fbo);
            this.quadVbo.bind();

            this.traceProgram.bind();
            this.rayStates[current].bind(this.traceProgram);       // Use the current state as the initial conditions
            this.quadVbo.draw(this.traceProgram, gl.TRIANGLE_FAN); // Generate the next ray state
            this.rayStates[next].detach(this.ray_fbo);
            this.ray_fbo.unbind();
        }

        // Read this data to draw the next 'wavefront' of rays (i.e. line segments) into the wave buffer
        {
            this.img_fbo.bind();
            gl.viewport(0, 0, this.width, this.height);

            if (this.settings.depthTest)
            {
                gl.enable(gl.DEPTH_TEST);
                gl.disable(gl.BLEND);
            }
            else
            {
                gl.disable(gl.DEPTH_TEST);
                // The float radiance channels of all lines are simply added each pass
                gl.blendFunc(gl.ONE, gl.ONE); // accumulate line segment radiances
                gl.enable(gl.BLEND);
            }
            
            this.lineProgram.bind();
            this.rayStates[current].posTex.bind(0); // read PosDataA = current.posTex
            this.rayStates[   next].posTex.bind(1); // read PosDataB = next.posTex
            this.rayStates[current].rgbTex.bind(2); // read RgbDataA = current.rgbTex
            this.rayStates[   next].rgbTex.bind(3); // read RgbDataB = next.rgbTex
            this.rayStates[current].edgTex.bind(4); // read RgbDataA = current.rgbTex
            this.rayStates[   next].edgTex.bind(5); // read RgbDataB = next.rgbTex
            this.offsetTex.bind(6);

            this.lineProgram.uniformTexture("PosDataA", this.rayStates[current].posTex);
            this.lineProgram.uniformTexture("PosDataB", this.rayStates[   next].posTex);
            this.lineProgram.uniformTexture("RgbDataA", this.rayStates[current].rgbTex);
            this.lineProgram.uniformTexture("RgbDataB", this.rayStates[   next].rgbTex);
            this.lineProgram.uniformTexture("EdgDataA", this.rayStates[current].edgTex);
            this.lineProgram.uniformTexture("EdgDataB", this.rayStates[   next].edgTex);
            this.lineProgram.uniformTexture("OffData", this.offsetTex);
            this.rayVbo.bind(); // Binds the TexCoord attribute
            this.rayVbo.draw(this.lineProgram, gl.LINES, this.settings.rayBatch*this.settings.rayBatch*2);
            this.img_fbo.unbind();
            gl.disable(gl.BLEND);
        }

        // Update raytracing state
        pathLength += 1;
        this.currentState = next;
    }

    // Add the wavebuffer contents, a complete set of rendered path segments, into the fluence buffer
    {
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE); // accumulate radiances of all line segments from current 'wave' of bounces
        this.quadVbo.bind();
        this.tmp_fbo.bind();
        this.tmp_fbo.attachTexture(this.fluenceBuffer, 0); // write to fluence buffer
        this.waveBuffer.bind(0);                       // read from wave buffer
        this.passProgram.bind();
        this.passProgram.uniformTexture("WaveBuffer", this.waveBuffer);
        this.quadVbo.draw(this.passProgram, gl.TRIANGLE_FAN);
        this.tmp_fbo.unbind();
    }

    gl.disable(gl.BLEND);

    // Final composite of normalized fluence to window
    this.raysTraced += this.settings.rayBatch*this.settings.rayBatch;
    this.wavesTraced += 1;

    if (fibre.animation_rendering)
    {
        fibre._anim_perframe_iteration++;
    }
}

Renderer.prototype.render = function()
{
    if (!this.enabled) return;

    var gl = GLU.gl;
    var timer_start = performance.now();

    // Get camera matrices
    var camera = fibre.camera;
    camera.updateMatrixWorld();
    camera.updateProjectionMatrix();
    var matrixWorldInverse = new THREE.Matrix4();
    matrixWorldInverse.getInverse( camera.matrixWorld );
    var modelViewMatrix = matrixWorldInverse.toArray();
    var projectionMatrix = camera.projectionMatrix.toArray();
    let camDir = camera.getWorldDirection();
    
    // Get grid bounds
    let bounds = fibre.getBounds();
    boundsMin = bounds.min;
    boundsMax = bounds.max;
    
    // Clear wavebuffer
    if (this.traceProgram)
    {
        this.img_fbo.bind();
        gl.viewport(0, 0, this.width, this.height);
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clearDepth(1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        this.img_fbo.unbind();
    }

    // Prepare raytracing program
    if (this.traceProgram)
    {
        this.traceProgram.bind();

        let timestep = this.settings.integrationTime / this.settings.maxTimeSteps;
        this.traceProgram.uniformF("timestep", timestep);
        this.traceProgram.uniform3Fv("boundsMin", [boundsMin.x, boundsMin.y, boundsMin.z]);
        this.traceProgram.uniform3Fv("boundsMax", [boundsMax.x, boundsMax.y, boundsMax.z]);
        this.traceProgram.uniformI("clipToBounds", this.settings.clipToBounds);

        if (fibre.animation_rendering)
        {
            this.settings.anim_frames = Math.floor(this.settings.anim_frames);
            let anim_fraction = fibre._anim_frame_counter / this.settings.anim_frames;
            this.traceProgram.uniformF("animFraction", anim_fraction);
        }
        else
        {
            this.traceProgram.uniformF("animFraction", 0.0);
        }
    }

    // Prepare line drawing program
    {
        this.lineProgram.bind();
        this.lineProgram.uniform3Fv("V", [camDir.x, camDir.y, camDir.z]);
        this.lineProgram.uniformI("hairShader", this.settings.hairShader);
        this.lineProgram.uniformF("specShine", this.settings.specShine);
        this.lineProgram.uniform3Fv("specColor", this.settings.specColor);

        let L1 = this.settings.light1_dir;
        let L1norm = Math.max(1.0e-6, Math.pow(L1[0]*L1[0] + L1[1]*L1[1] + L1[2]*L1[2], 0.5));
        L1 = [L1[0]/L1norm, L1[1]/L1norm, L1[2]/L1norm];

        let L2 = this.settings.light2_dir;
        let L2norm = Math.max(1.0e-6, Math.pow(L2[0]*L2[0] + L2[1]*L2[1] + L2[2]*L2[2], 0.5));
        L2 = [L2[0]/L2norm, L2[1]/L2norm, L2[2]/L2norm];

        this.lineProgram.uniform3Fv("C1", this.settings.light1_color);
        this.lineProgram.uniform3Fv("C2", this.settings.light2_color);
        this.lineProgram.uniform3Fv("L1", L1);
        this.lineProgram.uniform3Fv("L2", L2);
       
        // Setup projection matrix
        var projectionMatrixLocation = this.lineProgram.getUniformLocation("u_projectionMatrix");
        gl.uniformMatrix4fv(projectionMatrixLocation, false, projectionMatrix);

        // Setup modelview matrix (to match camera)
        var modelViewMatrixLocation = this.lineProgram.getUniformLocation("u_modelViewMatrix");
        gl.uniformMatrix4fv(modelViewMatrixLocation, false, modelViewMatrix);
    }

    // Trace solution curves and render into fluence buffer
    this.settings.maxIterations = Math.floor(this.settings.maxIterations);
    if (this.traceProgram && this.wavesTraced<this.settings.maxIterations)
    {
        let integrate_forward = true;
        this.trace(integrate_forward);
        if (!this.settings.integrateForward)
        {
            this.trace(!integrate_forward);
        }
    }

    if (this.wavesTraced == this.settings.maxIterations)
    {
        fibre.render_dirty = false;
    }

    // Composite rendered curves into viewport
    gl.viewport(0, 0, this.width, this.height);
    this.composite();

    // Draw grid bounds
    {
        gl.enable(gl.BLEND);
        gl.disable(gl.DEPTH_TEST);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        this.boxProgram.bind();
        
        // Setup projection matrix
        var projectionMatrixLocation = this.boxProgram.getUniformLocation("u_projectionMatrix");
        gl.uniformMatrix4fv(projectionMatrixLocation, false, projectionMatrix);

        // Setup modelview matrix (to match camera)
        var modelViewMatrixLocation = this.boxProgram.getUniformLocation("u_modelViewMatrix");
        gl.uniformMatrix4fv(modelViewMatrixLocation, false, modelViewMatrix);

        let boundsHit = fibre.boundsHit;
        let C = this.settings.bgColor;
        if (boundsHit && boundsHit.hit && boundsHit.type == 'center')
            this.boxProgram.uniform4Fv("color", [1.0-C[0], 0.85*(1.0-C[1]), 0.25*(1.0-C[2]), 0.6]);
        else
            this.boxProgram.uniform4Fv("color", [1.0-C[0], 1.0-C[1], 1.0-C[2], 0.25]);

        if ((boundsHit && boundsHit.hit && !this.animation_rendering) || this.settings.showBounds)
        {
            if (!this.boxVbo)
            {
                let o = [boundsMin.x, boundsMin.y, boundsMin.z];
                let e = [boundsMax.x-boundsMin.x, boundsMax.y-boundsMin.y, boundsMax.z-boundsMin.z];
                this.createBoxVbo(o, e)
            }
            this.boxVbo.bind();
            this.boxVbo.draw(this.boxProgram, gl.LINES);
        }

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
                this.boxProgram.uniform4Fv("color", [1.0-this.settings.bgColor[0], 0.8*(1.0-this.settings.bgColor[1]), 0.1*(1.0-this.settings.bgColor[2]), 0.5]);
                boxCornerVbo.draw(this.boxProgram, gl.LINES);
            }
        }
    }

    // GIF rendering
    if (fibre.GIF)
    {
        if (fibre.gif_rendering)
        {
            let gif_time_ms = performance.now() - fibre.gif_timer_start_ms;
            if (gif_time_ms >= fibre.gif_timer_max_duration)
            {
                fibre.GIF.render();
                fibre.gif_rendering = false;
            }
            else
            {   
                let since_last_gif_frame_ms = performance.now() - fibre.gif_last_frame_ms;
                let gifframe_ms = this.settings.record_realtime ? Math.ceil(since_last_gif_frame_ms) : 41;
                fibre.GIF.addFrame(gl, {delay: gifframe_ms, copy: true});
                fibre.gif_last_frame_ms = performance.now();
            }
        }

        if (fibre.animation_rendering)
        {
            if (fibre._anim_frame_counter == this.settings.anim_frames)
            {
                fibre.GIF.render();
                fibre.animation_rendering = false;
            }

            if (fibre._anim_perframe_iteration >= this.settings.maxIterations)
            {
                fibre.GIF.addFrame(gl, {delay: 30, copy: true});
                if (this.settings.anim_enable_turntable)
                {
                    let anim_fraction = fibre._anim_frame_counter / this.settings.anim_frames;
                    let anim_turntable_angle = anim_fraction * this.settings.anim_turntable_degrees;
                    let rad = anim_turntable_angle * Math.PI / 180.0;
                    let px = fibre._anim_x.clone();
                    let py = fibre._anim_y.clone();
                    py.multiplyScalar(fibre._anim_r * Math.sin(rad));
                    px.multiplyScalar(fibre._anim_r * Math.cos(rad));
                    let p = px.clone();
                    p.add(py);
                    p.add(fibre._anim_o);
                    fibre.camera.position.copy(p);
                    fibre.camera.updateProjectionMatrix();
                    fibre.camControls.update();
                }

                fibre._anim_perframe_iteration = 0;
                fibre._anim_frame_counter++;
                this.reset();
                fibre.render_dirty = true;
            }
        }
    }

    var timer_end = performance.now();
    var frame_time_ms = (timer_end - timer_start);
    this.time_ms += frame_time_ms;
    gl.finish();
}

Renderer.prototype.resize = function(width, height)
{
    let gl = GLU.gl;

    this.width = width;
    this.height = height;
    if (this.waveBuffer) this.waveBuffer.delete();
    this.waveBuffer = new GLU.Texture(width, height, 4, true, false, true, null);
    
    this.img_fbo.bind();
    this.img_fbo.attachTexture(this.waveBuffer, 0);
    this.img_fbo.drawBuffers(1);
    if (this.depthBuffer) gl.deleteRenderbuffer(this.depthBuffer);
    this.depthBuffer = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, this.depthBuffer);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, width, height);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.depthBuffer);
    this.img_fbo.unbind();

    if (this.fluenceBuffer) this.fluenceBuffer.delete();
    this.fluenceBuffer = new GLU.Texture(width, height, 4, true, false, true, null);
    this.reset();
}
