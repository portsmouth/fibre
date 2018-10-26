var fibre; // global instance

/**
* Fibre is the global object providing access to all functionality in the system.
* @constructor
*/
var Fibre = function(editor, error_editor)
{
    this.initialized = false;
    this.terminated = false;
    this.rendering = false;
    fibre = this;

    this.editor = editor;
    this.error_editor = error_editor;
    $(this.error_editor.getWrapperElement()).hide();

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
    this.text_canvas.style.width = render_canvas.width;
    this.text_canvas.style.height = render_canvas.height;
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

    this.camControls.saveState = function () {

        this.target0.copy( this.target );
        this.position0.copy( this.object.position );
        this.zoom0 = this.object.zoom;
    };

    this.gui = null;
    this.guiVisible = true;

    // Instantiate raytracer
    this.raytracer = new Raytracer();
    this.auto_resize = true;

    // Create dat gui
    this.gui = new GUI(this.guiVisible);

    // Initialize field
    this.initField()
        
    // Do initial resize:
    this.resize();

    // Setup codemirror events:
    let raytracer = this.raytracer;
    let ME = this;
    this.editor.on("change", function(cm, n) {
        ME.code = cm.getValue();
        ME.reset();
    });

    // Setup keypress and mouse events
    window.addEventListener( 'mousemove', this, false );
    window.addEventListener( 'mousedown', this, false );
    window.addEventListener( 'mouseup',   this, false );
    window.addEventListener( 'contextmenu',   this, false );
    window.addEventListener( 'click', this, false );
    window.addEventListener( 'keydown', this, false );

    // mouse state initialize:
    this.boundsHit = null;
    this.cornerDragging = null;
    this.centerDragging = null;

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

Fibre.prototype.set_xmin = function(val) { if (val == this.bounds.min.getComponent(0)) return; this.bounds.min.setComponent(0, val); this.raytracer.resetBounds(); }
Fibre.prototype.set_ymin = function(val) { if (val == this.bounds.min.getComponent(1)) return; this.bounds.min.setComponent(1, val); this.raytracer.resetBounds(); }
Fibre.prototype.set_zmin = function(val) { if (val == this.bounds.min.getComponent(2)) return; this.bounds.min.setComponent(2, val); this.raytracer.resetBounds(); }
Fibre.prototype.set_xmax = function(val) { if (val == this.bounds.max.getComponent(0)) return; this.bounds.max.setComponent(0, val); this.raytracer.resetBounds(); }
Fibre.prototype.set_ymax = function(val) { if (val == this.bounds.max.getComponent(1)) return; this.bounds.max.setComponent(1, val); this.raytracer.resetBounds(); }
Fibre.prototype.set_zmax = function(val) { if (val == this.bounds.max.getComponent(2)) return; this.bounds.max.setComponent(2, val); this.raytracer.resetBounds(); }

Fibre.prototype.get_xmin = function() { return this.bounds.min.getComponent(0); }
Fibre.prototype.get_ymin = function() { return this.bounds.min.getComponent(1); }
Fibre.prototype.get_zmin = function() { return this.bounds.min.getComponent(2); }
Fibre.prototype.get_xmax = function() { return this.bounds.max.getComponent(0); }
Fibre.prototype.get_ymax = function() { return this.bounds.max.getComponent(1); }
Fibre.prototype.get_zmax = function() { return this.bounds.max.getComponent(2); }

Fibre.prototype.getGlsl= function()
{
    return this.code;
}

Fibre.prototype.initField = function()
{
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

    // Initialize code (@todo: take from URL)
    this.code = this.editor.getValue();

    // Compile GLSL shaders
    this.raytracer.compileShaders();
    this.raytracer.resetBounds();
    this.gui.sync();

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

Fibre.prototype.link_error = function(program_info, error_log)
{
    console.log("Link error: ");
    console.log("\t\tprogram_info: ", program_info);
    console.log("\t\terror_log: ", error_log);
}



Fibre.prototype.disable_errors = function()
{
    $(this.error_editor.getWrapperElement()).hide();
}

Fibre.prototype.compile_error = function(shaderName, shaderTypeStr, error_log)
{
    $(this.error_editor.getWrapperElement()).show();

    this.error_editor.setValue('');
    this.error_editor.clearHistory();

    errStr = '';
    prefix = '';
    if (shaderName != 'trace')
        prefix = "[" + shaderName + " " + shaderTypeStr + " shader]";

    const errorRE = /\d+:(\d+):/;
    error_log.split('\n').forEach( function(error, ndx) {
        const m = errorRE.exec(error);
        if (m)
        {
            const traceShaderLineStart = 20;
            let lineNum = Math.max(m ? parseInt(m[1]) : 0, 0) - traceShaderLineStart;
            error = error.replace(errorRE, "");
            error = error.replace('ERROR:', "");
            error = error.trim();
            if (error)
                errStr += prefix + '\t→ Error on line ' + lineNum + ': ' + error + '\n';
        }
    });

    this.error_editor.setValue(errStr);
}


// Renderer reset on camera or other parameters update
Fibre.prototype.reset = function(no_recompile = false)
{
	if (!this.initialized || this.terminated) return;
    this.gui.sync();
	this.raytracer.reset(no_recompile);
}

Fibre.prototype.project = function(v, axis)
{
    // v - (v.axis)*axis
    let vp = v.clone();
    let a = axis.clone();
    a.multiplyScalar(v.dot(axis))
    vp.sub(a);
    return vp;
}


Fibre.prototype.sphereIntersect = function(ray, center, radius)
{
    let o = ray.origin.clone();
    o.sub(center);
    let d = ray.direction;
    let r = radius;
    let od = o.dot(d);
    let o2 = o.dot(o);
    let c = o2 - r*r;
    let b = 2.0 * od;
    let det2 = b*b - 4.0*c;
    if (det2 < 0.0) return {hit:false, t:null};
    let t = (-b - Math.sqrt(det2)) / 2.0;
    return {hit:true, t:t, type: 'center'};
}

Fibre.prototype.capsuleIntersect = function(ray, cA, cB, R)
{
    // check for cylinder hit
    let o = ray.origin;
    let d = ray.direction;
    let axis = cB.clone(); // axis = norm(cB - cA)
    axis.sub(cA);
    axis.normalize();
    let ocA = o.clone(); // ocA = o - cA
    ocA.sub(cA);
    let ocAp = this.project(ocA, axis);
    let dperp = this.project(d, axis);
    let a = dperp.dot(dperp);
    let b = 2.0 * ocAp.dot(dperp);
    let c = ocAp.dot(ocAp) - R*R;
    let det2 = b*b - 4.0*a*c;
    if (det2 < 0.0) return {hit:false, t:null};
    
    // check within axis bounds
    let t = (-b - Math.sqrt(det2)) / (2.0*a);
    let x = d.clone();
    x.multiplyScalar(t);
    x.add(o);
    x.sub(cA);
    l = x.dot(axis);
    L = cB.sub(cA)
    L2 = L.dot(L)
    if (l<0.0 || l*l>L2) return {hit:false, t:null};
    return {hit:true, t:t};
}


Fibre.prototype.boundsRaycast = function(u, v)
{
    // takes pixel uv location as input
    let dir = new THREE.Vector3();
    dir.set(u*2 - 1,
           -v*2 + 1,
            0.5 );
    dir.unproject(this.camera);
    dir.sub(this.camera.position).normalize();
    let ray = {origin:this.camera.position, direction: dir};

    bounds = this.getBounds();
    boundsMin = bounds.min;
    boundsMax = bounds.max;
    let o = [boundsMin.x, boundsMin.y, boundsMin.z];
    let e = [boundsMax.x-boundsMin.x, boundsMax.y-boundsMin.y, boundsMax.z-boundsMin.z];
    let size = Math.max(e[0], e[1], e[2]);

    var corners = [
        [o[0],        o[1],        o[2]],         // 000b = 0
        [o[0] + e[0], o[1],        o[2]],         // 001b = 1
        [o[0]       , o[1] + e[1], o[2]],         // 010b = 2
        [o[0] + e[0], o[1] + e[1], o[2]],         // 011b = 3
        [o[0],        o[1],        o[2] + e[2]],  // 100b = 4
        [o[0] + e[0], o[1],        o[2] + e[2]],  // 101b = 5
        [o[0]       , o[1] + e[1], o[2] + e[2]],  // 110b = 6
        [o[0] + e[0], o[1] + e[1], o[2] + e[2]]   // 111b = 7
	];

    let isect_min = {hit: false};
    let tmin = 1.0e10;

    // raycast center sphere manipulator
    let sphereR = 0.333 * Math.max(e[0], e[1], e[2]);
    let center = new THREE.Vector3(o[0] + 0.5*e[0], o[1] + 0.5*e[1], o[2] + 0.5*e[2]);
    let isect_sphere = this.sphereIntersect(ray, center, sphereR);
    if (isect_sphere.hit) { isect_min = isect_sphere; tmin = isect_sphere.t; };

    // raycast corner cylinder manipulators
    let cornerR = 0.05 * Math.max(e[0], e[1], e[2]);
    let outerR = 0.1 * Math.max(e[0], e[1], e[2]);
    for (i = 0; i<corners.length; i++)
    {
        let c = corners[i];
        let C = new THREE.Vector3(c[0], c[1], c[2]);
        for (axis = 0; axis<3; ++axis)
        {
            let L  = e[axis] * 0.4;
            let Lo = e[axis] * 0.4;
            let aa = [0, 0, 0];
            let ab = [0, 0, 0];

            if ((axis==0 && (i==1 || i==3 || i==5 || i==7)) ||
                (axis==1 && (i==2 || i==3 || i==6 || i==7)) ||
                (axis==2 && (i==4 || i==5 || i==6 || i==7)))
            {
                aa[axis] = -L; 
                ab[axis] = outerR;
            }
            else {
                aa[axis] = L; 
                ab[axis] = -outerR;
            }
            let axisVecB = new THREE.Vector3(ab[0], ab[1], ab[2]);
            let axisVecA = new THREE.Vector3(aa[0], aa[1], aa[2]);
    
            let cA = C.clone();
            let cB = C.clone();
            cB.add(axisVecB);
            cA.add(axisVecA);

            let isect_corn = this.capsuleIntersect(ray, cA, cB, cornerR)
            if ( isect_corn.hit && isect_corn.t < tmin )
            {
                isect_min = {hit: true, type: 'corner', index: i, axis: axis};
                tmin = isect_corn.t;
            }
        }
    }
    return isect_min;
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
    this.raytracer.render();

    // Update HUD text canvas
    if (this.textCtx)
    {    
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
            let linkWidth = this.textCtx.measureText('Fibre vX.X.X').width;
            this.textCtx.strokeText('Fibre v'+ver[0]+'.'+ver[1]+'.'+ver[2], this.textCtx.canvas.width - linkWidth - 14, this.textCtx.canvas.height-20);
            this.textCtx.fillText('Fibre v'+ver[0]+'.'+ver[1]+'.'+ver[2], this.textCtx.canvas.width - linkWidth - 14, this.textCtx.canvas.height-20);
            
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
    text_canvas.height = height;
    text_canvas.style.width = width;
    text_canvas.style.height = height;

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
        window.open("https://github.com/portsmouth/fibre");
    }
    if (this.onUserLink)
    {
        window.open(this.sceneURL);
    }
    event.preventDefault();
}

Fibre.prototype.onDocumentMouseMove = function(event)
{
    // check not within editor region
    var cmEl = document.querySelector('.CodeMirror');
    var edRect = cmEl.getBoundingClientRect();
    if (event.clientX >= edRect.left && event.clientX <= edRect.right &&
        event.clientY >= edRect.top  && event.clientY <= edRect.bottom) 
    {
        this.camControls.enabled = false;
        return;
    }

    if (!this.cornerDragging && !this.centerDragging)
        this.camControls.enabled = true;

    let u = event.clientX/window.innerWidth;
    let v = event.clientY/window.innerHeight;

    if (this.cornerDragging != null)
    {        
        // get dragged corner current position
        let corner_index = this.cornerDragging.corner_index;
        let axis = this.cornerDragging.axis_index;

        let bounds = this.getBounds();
        boundsMin = bounds.min;
        boundsMax = bounds.max;
        let o = [boundsMin.x, boundsMin.y, boundsMin.z];
        let e = [boundsMax.x-boundsMin.x, boundsMax.y-boundsMin.y, boundsMax.z-boundsMin.z];
        let x =     corner_index &1;
        let y = (corner_index>>1)&1; 
        let z = (corner_index>>2)&1;
        let c = new THREE.Vector3(o[0] + x*e[0], o[1] + y*e[1], o[2] + z*e[2]);

        // get camera ray at current mouse location
        let dir = new THREE.Vector3();
        dir.set( u*2 - 1,
                -v*2 + 1,
                 0.5 );
        dir.unproject(this.camera);
        dir.sub(this.camera.position).normalize();
        let ray = {origin:this.camera.position, direction: dir};

        // intersect ray with a plane passing through the current corner, orthog. to ray
        // to compute the new corner position
        let oc = ray.origin.clone();
        oc.sub(c);
        let t = -oc.dot(ray.direction);
        let cnew = ray.origin.clone();
        cnew.addScaledVector(ray.direction, t);

        if      (axis==0) { cnew.y = c.y; cnew.z = c.z; }
        else if (axis==1) { cnew.x = c.x; cnew.z = c.z; }
        else if (axis==2) { cnew.x = c.x; cnew.y = c.y; }

        // clip existing corners to the new corner
        for (c=0; c<8; ++c)
        { 
            if (axis==0) {
                if ((corner_index%2)>0)  boundsMax.x = Math.min(cnew.x, boundsMax.x);
                else                     boundsMin.x = Math.max(cnew.x, boundsMin.x); }
            else if (axis==1) {
                if ((corner_index%4)>=2) boundsMax.y = Math.min(cnew.y, boundsMax.y);
                else                     boundsMin.y = Math.max(cnew.y, boundsMin.y); }
            else if (axis==2) {
                if (corner_index>=4)     boundsMax.z = Math.min(cnew.z, boundsMax.z);
                else                     boundsMin.z = Math.max(cnew.z, boundsMin.z); }
        }       
        this.bounds.max = boundsMax;
        this.bounds.min = boundsMin;
      
        // Expand the bounds to accommodate the new corner
        this.bounds.expandByPoint(cnew);

        this.raytracer.resetBounds();
        this.reset(true);
    }

    else if (this.centerDragging != null)
    {
        let bounds = this.getBounds();
        boundsMin = bounds.min;
        boundsMax = bounds.max;
        let o = [boundsMin.x, boundsMin.y, boundsMin.z];
        let e = [boundsMax.x-boundsMin.x, boundsMax.y-boundsMin.y, boundsMax.z-boundsMin.z];
        let c = new THREE.Vector3(o[0] + 0.5*e[0], o[1] + 0.5*e[1], o[2] + 0.5*e[2]);

        // get camera ray at current mouse location
        let dir = new THREE.Vector3();
        dir.set( u*2 - 1,
                -v*2 + 1,
                 0.5 );
        dir.unproject(this.camera);
        dir.sub(this.camera.position).normalize();
        let ray = {origin:this.camera.position, direction: dir};

         // intersect ray with a plane passing through the current center, orthog. to ray
        // to compute the new center position
        let oc = ray.origin.clone();
        oc.sub(c);
        let t = -oc.dot(ray.direction);
        let cnew = ray.origin.clone();
        cnew.addScaledVector(ray.direction, t);
        cnew.sub(c);

        this.bounds.max.add(cnew); 
        this.bounds.min.add(cnew); 

        this.raytracer.resetBounds();
        this.reset(true);
    }

    // Check for bounds interaction
    else
    {
        this.boundsHit = this.boundsRaycast(u, v);
    }

    // Check whether user is trying to click the Fibre home link, or user link
    var textCtx = this.textCtx;
    if (textCtx)
    {    
        var x = event.pageX;
        var y = event.pageY;
        let linkWidth = this.textCtx.measureText('Fibre vX.X.X').width;

        let xmin = this.textCtx.canvas.width - linkWidth - 14;
        let xmax = xmin + linkWidth;
        let ymin = this.textCtx.canvas.height-25;
        let ymax = this.textCtx.canvas.height-10;
        if (x>=xmin && x<=xmax && y>=ymin && y<=ymax) this.onFibreLink = true;
        else this.onFibreLink = false;
        if (this.sceneURL != '')
        {
            linkWidth = this.textCtx.measureText(this.sceneURL).width;
            if (x>14 && x<14+linkWidth && y>this.height-45 && y<this.height-35) this.onUserLink = true;
            else this.onUserLink = false;
        }
    }

    this.camControls.update();
    //event.preventDefault();
}

Fibre.prototype.onDocumentMouseDown = function(event)
{
    if (!this.camControls.enabled) return;

    let boundsHit = this.boundsHit;
    if (boundsHit && boundsHit.hit)
    {
        if (boundsHit.type == 'corner')
        {
            this.camControls.enabled = false;
            let u = event.clientX/window.innerWidth;
            let v = event.clientY/window.innerHeight;

            this.cornerDragging = {u: u, v: v, corner_index:boundsHit.index, axis_index:boundsHit.axis};
            this.camControls.saveState();
        }

        if (boundsHit.type == 'center')
        {
            this.camControls.enabled = false;
            let u = event.clientX/window.innerWidth;
            let v = event.clientY/window.innerHeight;

            this.centerDragging = {u: u, v: v};
            this.camControls.saveState();
        }
    }

    this.camControls.update();
    //event.preventDefault();
}

Fibre.prototype.onDocumentMouseUp = function(event)
{
    if (this.cornerDragging != null)
    {
        this.cornerDragging = null;
        this.camControls.enabled = true;
        this.camControls.reset();
    }

    if (this.centerDragging != null)
    {
        this.centerDragging = null;
        this.camControls.enabled = true;
        this.camControls.reset();
    }

    this.camControls.update();
    event.preventDefault();
}

Fibre.prototype.onDocumentRightClick = function(event)
{

}

Fibre.prototype.onkeydown = function(event)
{
    console.log('Fibre.prototype.onkeydown');
    var charCode = (event.which) ? event.which : event.keyCode;
    switch (charCode)
    {
        case 122: // F11 key: go fullscreen
            var element	= document.body;
            if      ( 'webkitCancelFullScreen' in document ) element.webkitRequestFullScreen();
            else if ( 'mozCancelFullScreen'    in document ) element.mozRequestFullScreen();
            else console.assert(false);
            break;

        case 70: // F key: reset cam  
            if (!this.camControls.enabled) break;
            this.camera.position.copy(this.initial_camera_position);
            this.camControls.target.copy(this.initial_camera_target);
            this.reset(true);
            break;

        case 72: // H key: toggle hide/show dat gui
            if (!this.camControls.enabled) break;
            this.guiVisible = !this.guiVisible;
            fibre.getGUI().toggleHide();
            break;
    
        case 87: // W key: cam forward
        {
            if (!this.camControls.enabled) break;
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
            if (!this.camControls.enabled) break;
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
            if (!this.camControls.enabled) break;
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
            if (!this.camControls.enabled) break;
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
    //if (!fibre.rendering)
    {
        var no_recompile = true;
        fibre.reset(no_recompile);
    }
}
