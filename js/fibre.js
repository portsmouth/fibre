
/**
* Fibre is the global object providing access to all functionality in the system.
* @constructor
*/
var Fibre = function()
{
	this.initialized = false;
	this.terminated = false;
	this.rendering = false;
	fibre = this;

	let container = document.getElementById("container");
	this.container = container;

	var render_canvas = document.getElementById('render-canvas');
	this.render_canvas = render_canvas;
	this.width = render_canvas.width;
	this.height = render_canvas.height;
	render_canvas.style.width = render_canvas.width;
	render_canvas.style.height = render_canvas.height;

	var text_canvas = document.getElementById('text-canvas');
	this.text_canvas = text_canvas;
	this.textCtx = text_canvas.getContext("2d");
	this.onFibreLink = false;
	this.onUserLink = false;

	window.addEventListener( 'resize', this, false );

	// Setup THREE.js orbit camera
	var VIEW_ANGLE = 45;
	var ASPECT = this.width / this.height;
	var NEAR = 0.05;
	var FAR = 1000;
	this.camera = new THREE.PerspectiveCamera(VIEW_ANGLE, ASPECT, NEAR, FAR);
	this.camera.lookAt(new THREE.Vector3(0.0, 0.0, 0.0));
	this.camera.position.set(1.0, 1.0, 1.0);

	this.camControls = new THREE.OrbitControls(this.camera, this.container);
	this.camControls.zoomSpeed = 2.0;
	this.camControls.flySpeed = 0.01;
	this.camControls.addEventListener('change', camChanged);
	this.camControls.keyPanSpeed = 100.0;

	this.gui = null;
	this.guiVisible = true;

	// Instantiate raytracer
	this.raytracer = new Raytracer();
	this.auto_resize = true;

    // Initialize field
    this.initField()
        
    // Do initial resize:
    this.resize();

    // Create dat gui
    this.gui = new GUI(this.guiVisible);

    // Setup keypress and mouse events
    window.addEventListener( 'mousemove', this, false );
    window.addEventListener( 'mousedown', this, false );
    window.addEventListener( 'mouseup',   this, false );
    window.addEventListener( 'contextmenu',   this, false );
    window.addEventListener( 'click', this, false );
    window.addEventListener( 'keydown', this, false );

    this.initialized = true;
}

/**
* Returns the current version number of the Fibre system, in the format [1, 2, 3] (i.e. major, minor, patch version)
*  @returns {Array}
*/
Fibre.prototype.getVersion = function()
{
	return [1, 0, 0];
}

Fibre.prototype.handleEvent = function(event)
{
	switch (event.type)
	{
		case 'resize':      this.resize();  break;
		case 'mousemove':   this.onDocumentMouseMove(event);  break;
		case 'mousedown':   this.onDocumentMouseDown(event);  break;
		case 'mouseup':     this.onDocumentMouseUp(event);    break;
		case 'contextmenu': this.onDocumentRightClick(event); break;
		case 'click':       this.onClick(event);  break;
		case 'keydown':     this.onkeydown(event);  break;
	}
}

/**
* Access to the Renderer object
*  @returns {Renderer}
*/
Fibre.prototype.getRaytracer = function()
{
	return this.raytracer;
}


Fibre.prototype.getPotential = function()
{
	return this.potentialObj;
}


/**
* Access to the GUI object
*  @returns {GUI}
*/
Fibre.prototype.getGUI = function()
{
	return this.gui;
}

/**
* Access to the camera object
* @returns {THREE.PerspectiveCamera}.
*/
Fibre.prototype.getCamera = function()
{
	return this.camera;
}

/**
* Access to the camera controller object
* @returns {THREE.OrbitControls}
*/
Fibre.prototype.getControls = function()
{
	return this.camControls;
}

/**
 * @returns {WebGLRenderingContext} The webGL context
 */
Fibre.prototype.getGLContext = function()
{
	return GLU.gl;
}


/**
* Programmatically show or hide the dat.GUI UI
* @param {Boolean} show - toggle
*/
Fibre.prototype.showGUI = function(show)
{
	this.guiVisible = show;
}


Fibre.prototype.getBounds = function()
{
    return this.bounds;
}

Fibre.prototype.getGlsl= function()
{
    return this.glsl;
}


Fibre.prototype.initField = function()
{
    this.glsl = {};

    // @todo: this GLSL needs to be specified in the UI, and also initialized via the URL itself
    // vec3 velocity(vec3 p) {
    //   vec3 v;
    this.glsl.velocity = `
        const float rho = 8.0;
        const float sigma = 1.0;
        const float beta = 8.0/3.0;
        v.x = sigma*(y - x);
        v.y = x*(rho - z);
        v.z = x*y - beta*z;
    `;

    // vec3 color(vec3 p) {
    this.glsl.color = `
        float s = 0.5*(1.0 + cos(2.0*t));
        c = vec3(s, s, 1.0-s);
    `;

    // bounds will be specified by text fields and in URL, and also via some in-viewport UI
    this.bounds = new THREE.Box3(new THREE.Vector3(-2, -2, -2), new THREE.Vector3(2, 2, 2));
    size = new THREE.Vector3();
    this.bounds.size(size);
    let lengthScale = size.length();

    this.minScale = 1.0e-3 * lengthScale;
    this.maxScale = 1.0e3 * lengthScale;
    this.minScale = Math.max(1.0e-6, this.minScale);
    this.maxScale = Math.min(1.0e20, this.maxScale);

    // Set initial default camera position and target based on max scale
    let po = 1.5*lengthScale; 
    this.camera.position.set(po, po, po);
    this.camControls.target.set(0.0, 0.0, 0.0);

    // cache initial camera position to allow reset on 'F'
    this.initial_camera_position = new THREE.Vector3();
    this.initial_camera_position.copy(this.camera.position);
    this.initial_camera_target = new THREE.Vector3();
    this.initial_camera_target.copy(this.camControls.target);

    this.sceneName = ''
    this.sceneURL = ''

    // Compile GLSL shaders
    this.raytracer.compileShaders();

    // Fix renderer to width & height, if they were specified
    if ((typeof this.raytracer.width!=="undefined") && (typeof this.raytracer.height!=="undefined"))
    {
        this.auto_resize = false;
        this._resize(this.raytracer.width, this.raytracer.height);
    }

    // Camera setup
    this.camera.near = this.minScale;
    this.camera.far  = this.maxScale;
    this.camControls.update();
    this.reset(false);
}


// Renderer reset on camera or other parameters update
Fibre.prototype.reset = function(no_recompile = false)
{
	if (!this.initialized || this.terminated) return;
	this.raytracer.reset(no_recompile);
}
   
// Render all
Fibre.prototype.render = function()
{
    var gl = GLU.gl;
    gl.viewport(0, 0, this.width, this.height);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.depthMask(true);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    //gl.enable(gl.DEPTH_TEST);

    if (!this.initialized || this.terminated) return;
    this.rendering = true;

    // Render lensed light via raytracing
    this.raytracer.render();

    // Update HUD text canvas
    this.textCtx.textAlign = "left";   	// This determines the alignment of text, e.g. left, center, right
    this.textCtx.textBaseline = "middle";	// This determines the baseline of the text, e.g. top, middle, bottom
    this.textCtx.font = '12px monospace';	// This determines the size of the text and the font family used
    this.textCtx.clearRect(0, 0, this.textCtx.canvas.width, this.textCtx.canvas.height);
    this.textCtx.globalAlpha = 0.95;
    this.textCtx.strokeStyle = 'black';
    this.textCtx.lineWidth  = 2;
    if (this.guiVisible)
    {
        if (this.onFibreLink) this.textCtx.fillStyle = "#ff5500";
        else                  this.textCtx.fillStyle = "#ffff00";
        let ver = this.getVersion();
        this.textCtx.strokeText('Fibre v'+ver[0]+'.'+ver[1]+'.'+ver[2], 14, 20);
        this.textCtx.fillText('Fibre v'+ver[0]+'.'+ver[1]+'.'+ver[2], 14, 20);
        
        if (this.sceneName != '')
        {
            this.textCtx.fillStyle = "#ffaa22";
            this.textCtx.strokeText(this.sceneName, 14, this.textCtx.canvas.height-25);
            this.textCtx.fillText(this.sceneName, 14, this.textCtx.canvas.height-25);
        }
        if (this.sceneURL != '')
        {
            if (this.onUserLink) this.textCtx.fillStyle = "#aaccff";
            else                 this.textCtx.fillStyle = "#55aaff";
            this.textCtx.strokeText(this.sceneURL, 14, this.textCtx.canvas.height-40);
            this.textCtx.fillText(this.sceneURL, 14, this.textCtx.canvas.height-40);
        }
    }

    gl.finish();
    this.rendering = false;
}

Fibre.prototype._resize = function(width, height)
{
	this.width = width;
	this.height = height;

	let render_canvas = this.render_canvas;
	render_canvas.width  = width;
	render_canvas.height = height;
	render_canvas.style.width = width;
	render_canvas.style.height = height;

	var text_canvas = this.text_canvas;
	text_canvas.width  = width;
	text_canvas.height = height

	this.camera.aspect = width / height;
	this.camera.updateProjectionMatrix();
	this.camControls.update();

	this.raytracer.resize(width, height);
}

Fibre.prototype.resize = function()
{
	if (this.terminated) return;
	if (this.auto_resize)
	{
		// If no explicit renderer size was set by user, resizing the browser window
		// resizes the render itself to match.
		let width = window.innerWidth;
		let height = window.innerHeight;
		this._resize(width, height);
		if (this.initialized)
			this.render();
	}
	else
	{
		// Otherwise if the user set a fixed renderer resolution, we scale the resultant render
		// to fit into the current window with preserved aspect ratio:
		let render_canvas = this.render_canvas;
		let window_width = window.innerWidth;
		let window_height = window.innerHeight;
		let render_aspect = render_canvas.width / render_canvas.height;
		let window_aspect = window_width / window_height;
		if (render_aspect > window_aspect)
		{
			render_canvas.style.width = window_width;
			render_canvas.style.height = window_width / render_aspect;
		}
		else
		{
			render_canvas.style.width = window_height * render_aspect;
			render_canvas.style.height = window_height;
		}
		var text_canvas = this.text_canvas;
		text_canvas.width = window_width;
		text_canvas.height = window_height;
	}
}


Fibre.prototype.onClick = function(event)
{
	if (this.onFibreLink)
	{
    	window.location = "https://github.com/portsmouth/fibre";
    }
    if (this.onUserLink)
	{
    	window.location = this.sceneURL;
    }
	event.preventDefault();
}

Fibre.prototype.onDocumentMouseMove = function(event)
{
	// Check whether user is trying to click the Fibre home link, or user link
	var textCtx = this.textCtx;
	var x = event.pageX;
    var y = event.pageY;
	let linkWidth = this.textCtx.measureText('Fibre vX.X.X').width;
	if (x>14 && x<14+linkWidth && y>15 && y<25) this.onFibreLink = true;
	else this.onFibreLink = false;
	if (this.sceneURL != '')
	{
		linkWidth = this.textCtx.measureText(this.sceneURL).width;
		if (x>14 && x<14+linkWidth && y>this.height-45 && y<this.height-35) this.onUserLink = true;
		else this.onUserLink = false;
	}

	this.camControls.update();
}

Fibre.prototype.onDocumentMouseDown = function(event)
{
	this.camControls.update();
}

Fibre.prototype.onDocumentMouseUp = function(event)
{
	this.camControls.update();
}

Fibre.prototype.onDocumentRightClick = function(event)
{

}

Fibre.prototype.onkeydown = function(event)
{
	var charCode = (event.which) ? event.which : event.keyCode;
	switch (charCode)
	{
		case 122: // F11 key: go fullscreen
			var element	= document.body;
			if      ( 'webkitCancelFullScreen' in document ) element.webkitRequestFullScreen();
			else if ( 'mozCancelFullScreen'    in document ) element.mozRequestFullScreen();
			else console.assert(false);
			break;

		case 70: // F key: reset cam  (@todo)
			this.camera.position.copy(this.initial_camera_position);
			this.camControls.target.copy(this.initial_camera_target);
			this.reset(true);
			break;

		case 82: // R key: reset scene
			break;

		case 72: // H key: toggle hide/show dat gui
			this.guiVisible = !this.guiVisible;
			fibre.getGUI().toggleHide();
			break;
		
		case 79: // O key: output scene settings code to console
			let code = this.dumpScene();
			console.log(code);
			break;

		case 80: // P key: save current image to disk
		{
   			var w = window.open('about:blank', 'Fibre screenshot');
   			let dataURL = this.render_canvas.toDataURL("image/png");
   			w.document.write("<img src='"+dataURL+"' alt='from canvas'/>");
			break;
		}

		case 87: // W key: cam forward
		{
			let toTarget = new THREE.Vector3();
			toTarget.copy(this.camControls.target);
			toTarget.sub(this.camera.position);
			let distToTarget = toTarget.length();
			toTarget.normalize();
			var move = new THREE.Vector3();
			move.copy(toTarget);
			move.multiplyScalar(this.camControls.flySpeed*distToTarget);
			this.camera.position.add(move);
			this.camControls.target.add(move);
			this.reset(true);
			break;
		}
		
		case 65: // A key: cam left
		{
			let toTarget = new THREE.Vector3();
			toTarget.copy(this.camControls.target);
			toTarget.sub(this.camera.position);
			let distToTarget = toTarget.length();
			var localX = new THREE.Vector3(1.0, 0.0, 0.0);
			var worldX = localX.transformDirection( this.camera.matrix );
			var move = new THREE.Vector3();
			move.copy(worldX);
			move.multiplyScalar(-this.camControls.flySpeed*distToTarget);
			this.camera.position.add(move);
			this.camControls.target.add(move);
			this.reset(true);
			break;
		}
		
		case 83: // S key: cam back
		{
			let toTarget = new THREE.Vector3();
			toTarget.copy(this.camControls.target);
			toTarget.sub(this.camera.position);
			let distToTarget = toTarget.length();
			toTarget.normalize();
			var move = new THREE.Vector3();
			move.copy(toTarget);
			move.multiplyScalar(-this.camControls.flySpeed*distToTarget);
			this.camera.position.add(move);
			this.camControls.target.add(move);
			this.reset(true);
			break;
		}
		
		case 68: // D key: cam right
		{
			let toTarget = new THREE.Vector3();
			toTarget.copy(this.camControls.target);
			toTarget.sub(this.camera.position);
			let distToTarget = toTarget.length();
			var localX = new THREE.Vector3(1.0, 0.0, 0.0);
			var worldX = localX.transformDirection( this.camera.matrix );
			var move = new THREE.Vector3();
			move.copy(worldX);
			move.multiplyScalar(this.camControls.flySpeed*distToTarget);
			this.camera.position.add(move);
			this.camControls.target.add(move);
			this.reset(true);
			break;
		}
	}
}

function camChanged()
{
	if (!fibre.rendering)
	{
		var no_recompile = true;
		fibre.reset(no_recompile);
	}
}
