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
    var VIEW_ANGLE = 40;
    var ASPECT = this.width / this.height;
    var NEAR = 0.05;
    var FAR = 1000;
    this.camera = new THREE.PerspectiveCamera(VIEW_ANGLE, ASPECT, NEAR, FAR);
    this.camera.lookAt(new THREE.Vector3(0.0, 0.0, 0.0));
    this.camera.position.set(1.0, 1.0, 1.0);

    this.camControls = new THREE.OrbitControls(this.camera, this.container);
    this.camControls.zoomSpeed = 2.0;
    this.camControls.flySpeed = 0.01;
    this.disable_reset = false;
    this.camControls.addEventListener('change', function() {
                                                            if (fibre.disable_reset) return;
                                                            var no_recompile = true;
                                                            fibre.reset(no_recompile);
                                                        });

    this.camControls.keyPanSpeed = 100.0;

    this.camControls.saveState = function () {

        this.target0.copy( this.target );
        this.position0.copy( this.object.position );
        this.zoom0 = this.object.zoom;
    };

    this.gui = null;

    // Instantiate renderer
    this.renderer = new Renderer();
    this.auto_resize = true;

    // Field presets
    this.presets = new Presets();
    this.preset_selection = 'None';

    // Create dat gui
    this.gui = new GUI(true);

    // Setup codemirror events:
    let renderer = this.renderer;
    this.editor.on("change", function(cm, n) {
        fibre.code = cm.getValue();
        fibre.reset();
    });
    this.editing = false;

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

    // GIF recording init
    this.GIF = null;
    this.gif_rendering = false;

    // Attempt to load from current URL
    if (!this.load_url(window.location.href))
    {
        this.presets.load_preset('Arneodo attractor');
    }
    
    // Do initial resize:
    this.resize();

    this.initialized = true;
    this.manip_enabled = true;
    this.render_dirty = true;
}

/**
* Returns the current version number of the Fibre system, in the format [1, 2, 3] (i.e. major, minor, patch version)
*  @returns {Array}
*/
Fibre.prototype.getVersion = function()
{
	return [1, 1, 0];
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
Fibre.prototype.getRenderer = function()
{
	return this.renderer;
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
    if ( ( show && !this.getGUI().visible) || 
         (!show &&  this.getGUI().visible) )
        this.getGUI().toggleHide();
}


Fibre.prototype.getBounds = function()
{
    return this.bounds;
}

Fibre.prototype.set_xmin = function(val) { if (val == this.bounds.min.getComponent(0)) return; this.bounds.min.setComponent(0, val); this.renderer.resetBounds(); this.reset(); }
Fibre.prototype.set_ymin = function(val) { if (val == this.bounds.min.getComponent(1)) return; this.bounds.min.setComponent(1, val); this.renderer.resetBounds(); this.reset(); }
Fibre.prototype.set_zmin = function(val) { if (val == this.bounds.min.getComponent(2)) return; this.bounds.min.setComponent(2, val); this.renderer.resetBounds(); this.reset(); }
Fibre.prototype.set_xmax = function(val) { if (val == this.bounds.max.getComponent(0)) return; this.bounds.max.setComponent(0, val); this.renderer.resetBounds(); this.reset(); }
Fibre.prototype.set_ymax = function(val) { if (val == this.bounds.max.getComponent(1)) return; this.bounds.max.setComponent(1, val); this.renderer.resetBounds(); this.reset(); }
Fibre.prototype.set_zmax = function(val) { if (val == this.bounds.max.getComponent(2)) return; this.bounds.max.setComponent(2, val); this.renderer.resetBounds(); this.reset(); }

Fibre.prototype.get_xmin = function() { return this.bounds.min.getComponent(0); }
Fibre.prototype.get_ymin = function() { return this.bounds.min.getComponent(1); }
Fibre.prototype.get_zmin = function() { return this.bounds.min.getComponent(2); }
Fibre.prototype.get_xmax = function() { return this.bounds.max.getComponent(0); }
Fibre.prototype.get_ymax = function() { return this.bounds.max.getComponent(1); }
Fibre.prototype.get_zmax = function() { return this.bounds.max.getComponent(2); }

Fibre.prototype.getGlsl = function()
{
    return this.code;
}

Fibre.prototype.getQueryParam = function(url, key) {
  var queryStartPos = url.indexOf('?');
  if (queryStartPos === -1) {
    return null;
  }
  var params = url.substring(queryStartPos + 1).split('&');
  for (var i = 0; i < params.length; i++) {
    var pairs = params[i].split('=');
    if (decodeURIComponent(pairs.shift()) == key) {
      return decodeURIComponent(pairs.join('='));
    }
  }
}

Fibre.prototype.get_escaped_stringified_state = function(state)
{
    let json_str = JSON.stringify(state);
    var json_str_escaped = json_str.replace(/[\\]/g, '\\\\')
                                    .replace(/[\b]/g, '\\b')
                                    .replace(/[\f]/g, '\\f')
                                    .replace(/[\n]/g, '\\n')
                                    .replace(/[\r]/g, '\\r')
                                    .replace(/[\t]/g, '\\t');
    return json_str_escaped;
}

Fibre.prototype.get_stringified_state = function(state)
{
    let json_str = JSON.stringify(state);
    return json_str;
}

Fibre.prototype.get_url = function()
{
    let state = this.get_state();
    let objJsonStr = this.get_stringified_state(state);
    let objJsonB64 = btoa(objJsonStr);

    let URL = window.location.href;
    var separator_index = URL.indexOf('?');
    if (separator_index > -1)
    {
        URL = URL.substring(0, separator_index);
    }
    URL += '?settings=' + encodeURIComponent(objJsonB64);
    history.pushState(null, '', URL);
    return URL;
}

Fibre.prototype.get_state = function()
{
    let camPos = this.camera.position;
    let camTar = this.camControls.target;
    let camera_settings = { pos: [camPos.x, camPos.y, camPos.z],
                            tar: [camTar.x, camTar.y, camTar.z],
                            near: this.camera.near,
                            far:  this.camera.far
    };
    let editor_settings = { code: this.code } ;
    let gui_settings = { visible: this.getGUI().visible };
    let state = { R: this.renderer.settings,
                  C: camera_settings,
                  E: editor_settings,
                  G: gui_settings };

    return state;
}

Fibre.prototype.load_url = function(url)
{
    let URL = url;
    let objJsonB64 = this.getQueryParam(URL, 'settings');
    if (!objJsonB64) return false;

    let setting_str = atob(objJsonB64);
    if (!setting_str) return false;
    let state = JSON.parse(setting_str);

    this.load_state(state);
    return true;
}

Fibre.prototype.load_state = function(state)
{
    let xmin = state.R.xmin;
    let ymin = state.R.ymin;
    let zmin = state.R.zmin;
    let xmax = state.R.xmax;
    let ymax = state.R.ymax;
    let zmax = state.R.zmax;

    this.bounds = new THREE.Box3(new THREE.Vector3(xmin, ymin, zmin), new THREE.Vector3(xmax, ymax, zmax));

    let camera_settings = state.C;
    let P = camera_settings.pos;
    let T = camera_settings.tar;
    let near = camera_settings.near;
    let far = camera_settings.far;
    this.camera.position.copy(new THREE.Vector3(P[0], P[1], P[2]));
    this.camera.near = near;
    this.camera.far = far;
    this.camControls.target.copy(new THREE.Vector3(T[0], T[1], T[2]));
    this.camControls.saveState();

    let gui_settings = state.G;
    if (gui_settings)
    {
        this.showGUI(gui_settings.visible);
    }

    this.initial_camera_position = this.camera.position.clone();
    this.initial_camera_target = this.camControls.target.clone();
    
    this.editor.setValue(state.E.code);

    this.renderer.settings = Object.assign(this.renderer.settings, state.R);
    
    this.camControls.update();
    this.gui.refresh();
    this.reset();
    this.renderer.initStates();
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
	this.renderer.reset(no_recompile);
}


// Render all
Fibre.prototype.render = function()
{
    if (!this.initialized || this.terminated) return;
    this.rendering = true;

    if (this.render_dirty || this.renderer.settings.dashes)
    {
        gl.viewport(0, 0, this.width, this.height);
        gl.depthMask(true);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        this.renderer.render();
    }

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
        if (this.getGUI().visible)
        {
            if (this.onFibreLink) this.textCtx.fillStyle = "#ff5500";
            else                  this.textCtx.fillStyle = "#ffff00";
            let ver = this.getVersion();
            let linkWidth = this.textCtx.measureText('Fibre vX.X.X').width;
            this.textCtx.strokeText('Fibre v'+ver[0]+'.'+ver[1]+'.'+ver[2], this.textCtx.canvas.width - linkWidth - 14, this.textCtx.canvas.height-20);
            this.textCtx.fillText('Fibre v'+ver[0]+'.'+ver[1]+'.'+ver[2], this.textCtx.canvas.width - linkWidth - 14, this.textCtx.canvas.height-20);
            {
                this.textCtx.fillStyle = "#ffaa22";
                if (this.gif_rendering)
                {
                    this.textCtx.strokeText('rendering GIF ...', 14, this.textCtx.canvas.height-25);
                    this.textCtx.fillText('rendering GIF ...', 14, this.textCtx.canvas.height-25);
                }
                else if (this.animation_rendering)
                {   
                    this.textCtx.strokeText(this.renderer.wavesTraced + ' iterations (animation frame ' + this._anim_frame_counter + '/' + this.renderer.settings.anim_frames + ')', 14, this.textCtx.canvas.height-25);
                    this.textCtx.fillText(this.renderer.wavesTraced + ' iterations (animation frame ' + this._anim_frame_counter + '/' + this.renderer.settings.anim_frames + ')', 14, this.textCtx.canvas.height-25);
                }
                else
                {
                    this.textCtx.strokeText(this.renderer.wavesTraced + ' iterations', 14, this.textCtx.canvas.height-25);
                    this.textCtx.fillText(this.renderer.wavesTraced + ' iterations', 14, this.textCtx.canvas.height-25);
                }  
            }
        }
    }

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

    this.renderer.resize(width, height);
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
    L = cB.clone().sub(cA)
    L2 = L.dot(L)
    if (l<-R || l*l>L2+R) return {hit:false, t:null};
    let axisd = axis.dot(d)
    if (axisd > 1.0-1.0e-10) return {hit:false, t:null};
    let tclosest = -ocAp.dot(d) / (1.0 - axisd*axisd);
    ocAp.addScaledVector(dperp, tclosest);
    let dclosest = ocAp.length();
    return {hit:true, t:dclosest};
}

Fibre.prototype.boxIntersect = function(ray, boundsMin, boundsMax)
{
    let o = ray.origin;
    let d = ray.direction;
    let dL = new THREE.Vector3(1.0/d.x, 1.0/d.y, 1.0/d.z);
    let lo = boundsMin.clone(); lo.sub(o); lo.multiply(dL);
    let hi = boundsMax.clone(); hi.sub(o); hi.multiply(dL);
    let tmp = lo.clone();
    tmp = tmp.min(hi);
    hi = hi.add(lo); hi.sub(tmp);
    lo = tmp;
    let hit = !( lo.x>hi.y || lo.y>hi.x || lo.x>hi.z || lo.z>hi.x || lo.y>hi.z || lo.z>hi.y );
    if (!hit)
    {
        return {hit:false, t:null};
    }
    let t = Math.max(lo.x, lo.y, lo.z);
    if (t<0.0) return {hit:false, t:null};
    return {hit:true, t:t, type: 'center'};
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
    let tmin = 1.0e12;

    // raycast corner cylinder manipulators
    let outerR = 0.2 * size;
    let innerR = 0.333;
    for (i = 0; i<corners.length; i++)
    {
        let c = corners[i];
        let C = new THREE.Vector3(c[0], c[1], c[2]);
        for (axis = 0; axis<3; ++axis)
        {
            let L  = e[axis] * innerR;
            let Lo = e[axis] * innerR;
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
            let cAB = cB.clone();
            cAB.sub(cA);
            let cornerR = 0.0333 * size;
            let isect_corn = this.capsuleIntersect(ray, cA, cB, cornerR)
            if ( isect_corn.hit && isect_corn.t < tmin )
            {
                isect_min = {hit: true, type: 'corner', index: i, axis: axis};
                tmin = isect_corn.t;
            }
        }
    }

    // Check for box overlap ("center dragging") if no corner manipulator is selected
    if (!isect_min.hit)
    {
        let isect_box = this.boxIntersect(ray, boundsMin, boundsMax);
        if (isect_box.hit) { isect_min = isect_box; };
    }

    return isect_min;
}


Fibre.prototype.move_corner = function(u, v)
{
    // get dragged corner current position
    let corner_index = this.cornerDragging.corner_index;
    let axis = this.cornerDragging.axis_index;
    let c = this.cornerDragging.c;

    // get camera ray at orig mouse location
    let dir_orig = new THREE.Vector3();
    dir_orig.set( this.cornerDragging.u*2 - 1,
                 -this.cornerDragging.v*2 + 1,
                0.5 );
    dir_orig.unproject(this.camera);
    dir_orig.sub(this.camera.position).normalize();
    let ray_orig = {origin:this.camera.position, direction: dir_orig};

    // get camera ray at current mouse location
    let dir = new THREE.Vector3();
    dir.set( u*2 - 1,
            -v*2 + 1,
                0.5 );
    dir.unproject(this.camera);
    dir.sub(this.camera.position).normalize();
    let ray = {origin:this.camera.position, direction: dir};

    // intersect orig ray with a plane passing through the current corner, orthog. to ray
    let oc = ray_orig.origin.clone();
    oc.sub(c);
    let t_orig = -oc.dot(ray_orig.direction);
    let porig = ray.origin.clone();
    porig.addScaledVector(ray_orig.direction, t_orig);

    // intersect ray with a plane passing through the current corner, orthog. to ray
    // to compute the new corner position
    oc = ray.origin.clone();
    oc.sub(c);
    let t = -oc.dot(ray.direction);
    let pnew = ray.origin.clone();
    pnew.addScaledVector(ray.direction, t);
    
    // Add corner shift to the original corner
    pnew.sub(porig);
    let cnew = c.clone();
    cnew.add(pnew);

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

    this.renderer.resetBounds();
    this.reset(true);
}

Fibre.prototype.move_center = function(u, v)
{
    let c = this.centerDragging.c;

    // get camera ray at orig mouse location
    let dir_orig = new THREE.Vector3();
    dir_orig.set( this.centerDragging.u*2 - 1,
                 -this.centerDragging.v*2 + 1,
                0.5 );
    dir_orig.unproject(this.camera);
    dir_orig.sub(this.camera.position).normalize();
    let ray_orig = {origin:this.camera.position, direction: dir_orig};

    // get camera ray at current mouse location
    let dir = new THREE.Vector3();
    dir.set( u*2 - 1,
            -v*2 + 1,
                0.5 );
    dir.unproject(this.camera);
    dir.sub(this.camera.position).normalize();
    let ray = {origin:this.camera.position, direction: dir};

    // intersect orig ray with a plane passing through the current center, orthog. to ray
    let oc = ray_orig.origin.clone();
    oc.sub(c);
    let t_orig = -oc.dot(ray_orig.direction);
    let porig = ray.origin.clone();
    porig.addScaledVector(ray_orig.direction, t_orig);

    // intersect ray with a plane passing through the current center, orthog. to ray
    // to compute the new corner position
    oc = ray.origin.clone();
    oc.sub(c);
    let t = -oc.dot(ray.direction);
    let pnew = ray.origin.clone();
    pnew.addScaledVector(ray.direction, t);

    // Add center shift to the original center
    pnew.sub(porig);

    let bounds_orig = this.centerDragging.bounds;
    this.bounds.min = bounds_orig.min.clone();
    this.bounds.min.add(pnew);
    this.bounds.max = bounds_orig.max.clone();
    this.bounds.max.add(pnew);

    this.renderer.resetBounds();
    this.reset(true);
}

Fibre.prototype.onDocumentMouseMove = function(event)
{
    this.render_dirty = true;

    let u = event.clientX/window.innerWidth;
    let v = event.clientY/window.innerHeight;

    // check not within editor region
    var cmEl = document.querySelector('.CodeMirror');
    var edRect = cmEl.getBoundingClientRect();
    if (event.clientX >= edRect.left && event.clientX <= edRect.right &&
        event.clientY >= edRect.top  && event.clientY <= edRect.bottom) 
    {
        if      (this.cornerDragging != null) this.move_corner(u, v);
        else if (this.centerDragging != null) this.move_center(u, v);

        this.cornerDragging = null;
        this.centerDragging = null;
        this.disable_reset = true;
        this.camControls.reset();
        this.camControls.update();
        this.disable_reset = false;
        this.camControls.enabled = false;
        return;
    }

    if (this.manip_enabled && this.renderer.settings.enableBounds)
    {
        if (!this.cornerDragging && !this.centerDragging)
            this.camControls.enabled = true;

        if      (this.cornerDragging != null) this.move_corner(u, v);
        else if (this.centerDragging != null) this.move_center(u, v);

        // Check for bounds interaction
        else
        {
            this.boundsHit = this.boundsRaycast(u, v);
        }
    }
    else
        this.boundsHit = false;

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
    this.camControls.saveState();
}

Fibre.prototype.onDocumentMouseDown = function(event)
{
    if (!this.camControls.enabled) return;

    if (this.manip_enabled && this.renderer.settings.enableBounds)
    {
        let boundsHit = this.boundsHit;
        if (boundsHit && boundsHit.hit)
        {
            if (boundsHit.type == 'corner')
            {
                this.camControls.enabled = false;
                let u = event.clientX/window.innerWidth;
                let v = event.clientY/window.innerHeight;
                let corner_index = boundsHit.index;

                let bounds = this.getBounds();
                boundsMin = bounds.min;
                boundsMax = bounds.max;
                let o = [boundsMin.x, boundsMin.y, boundsMin.z];
                let e = [boundsMax.x-boundsMin.x, boundsMax.y-boundsMin.y, boundsMax.z-boundsMin.z];
                let x =     corner_index &1;
                let y = (corner_index>>1)&1; 
                let z = (corner_index>>2)&1;
                let corner = new THREE.Vector3(o[0] + x*e[0], o[1] + y*e[1], o[2] + z*e[2]);

                this.cornerDragging = {c:corner, u: u, v: v, corner_index:boundsHit.index, axis_index:boundsHit.axis};
                this.camControls.saveState();
            }
            if (boundsHit.type == 'center')
            {
                this.camControls.enabled = false;
                let u = event.clientX/window.innerWidth;
                let v = event.clientY/window.innerHeight;

                let bounds = this.getBounds();
                boundsMin = bounds.min;
                boundsMax = bounds.max;
                let o = [boundsMin.x, boundsMin.y, boundsMin.z];
                let e = [boundsMax.x-boundsMin.x, boundsMax.y-boundsMin.y, boundsMax.z-boundsMin.z];
                let center = new THREE.Vector3(o[0] + 0.5*e[0], o[1] + 0.5*e[1], o[2] + 0.5*e[2]);
                
                this.centerDragging = {c:center, u: u, v: v, bounds: bounds.clone()};
                this.camControls.saveState();
            }
        }
    }
    else
        this.boundsHit = false;

    this.camControls.update();
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
    var charCode = (event.which) ? event.which : event.keyCode;
    switch (charCode)
    {
        case 122: // F11 key: go fullscreen
            var element	= document.body;
            if      ( 'webkitCancelFullScreen' in document ) element.webkitRequestFullScreen();
            else if ( 'mozCancelFullScreen'    in document ) element.mozRequestFullScreen();
            else console.assert(false);
            break;

        case 67: // C key: center cam on current bounds
            if (!this.camControls.enabled || fibre.editing) break;
            let bounds = this.getBounds();
            boundsMin = bounds.min;
            boundsMax = bounds.max;
            let scale = Math.max(boundsMax.x-boundsMin.x,
                                boundsMax.y-boundsMin.y,
                                boundsMax.z-boundsMin.z);
            let o = [boundsMin.x, boundsMin.y, boundsMin.z];
            let e = [boundsMax.x-boundsMin.x, boundsMax.y-boundsMin.y, boundsMax.z-boundsMin.z];
            let center = new THREE.Vector3(o[0] + 0.5*e[0], o[1] + 0.5*e[1], o[2] + 0.5*e[2]);
            let p = this.camera.position;
            let d = center.clone(); d.sub(p);
            d.normalize();
            let pnew = center.clone();
            pnew.addScaledVector(d, -3.0*scale);
            this.camera.position.copy(pnew);
            this.camControls.target.copy(center);
            this.camControls.update();
            this.reset(true);
            break;

        case 70: // F key: reset cam  
            if (!this.camControls.enabled || fibre.editing) break;
            this.camera.position.copy(this.initial_camera_position);
            this.camControls.target.copy(this.initial_camera_target);
            this.camControls.update();
            this.reset(true);
            break;

        case 72: // H key: toggle hide/show dat gui
            if (!this.camControls.enabled || fibre.editing) break;
            fibre.getGUI().toggleHide();
            break;


        case 79: // O key: dump JSON state to console
            if (!this.camControls.enabled || fibre.editing) break;
            let state = this.get_state();
            let objJsonStr = this.get_escaped_stringified_state(state);
            console.log(objJsonStr);
            break;

    
        case 87: // W key: cam forward
        {
            if (!this.camControls.enabled || fibre.editing) break;
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
            if (!this.camControls.enabled || fibre.editing) break;
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
        
        case 80: // P key: save current image to disk
        {
            if (fibre.editing) break;
            var link = document.createElement('a');
            link.download = "fibre.png";
            this.render_canvas.toBlob(function(blob){
                    link.href = URL.createObjectURL(blob);
                    var event = new MouseEvent('click');
                    link.dispatchEvent(event);
                },'image/png', 1);
            break;
        }

        case 83: // S key: cam back
        {
            if (!this.camControls.enabled || fibre.editing) break;
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
            if (!this.camControls.enabled || fibre.editing) break;
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


Fibre.prototype.toggleRecord = function(command)
{
    if (command=='RECORD' || command=='RECORD PERIOD')
    {
        var blob = new Blob([gifworker_code]);
        var blobURL = window.URL.createObjectURL(blob);
        
        this.GIF = new GIF({
            workers: 10,
            workerScript: blobURL,
            quality: 30,
            width: this.width,
            height: this.height
        });

        this.gif_rendering = true;
        let ME = this;

        this.GIF.on('finished', function(blob) {
                var link = document.createElement('a');
                link.download = "fibre.gif";
                link.href = URL.createObjectURL(blob);
                var event = new MouseEvent('click');
                link.dispatchEvent(event);
                ME.gif_rendering = false;
                this.GIF = null;
        });

        this.gif_timer_start_ms = performance.now();
        this.gif_last_frame_ms = performance.now();

        if (command=='RECORD PERIOD')
        {
            this.gif_timer_max_duration = 8.0*Math.PI * 1.0e3/Math.max(1.0e-6, this.renderer.settings.dash_speed);
        }
        else
        {
            this.gif_timer_max_duration = 60.0 * 1.0e3;
        }
    }
    else
    {
        if (this.GIF)
        {
            this.gif_rendering = false;
            this.GIF.render();
        }
    }
}


Fibre.prototype.renderAnim = function()
{
    this.animation_rendering = true;

    var blob = new Blob([gifworker_code]);
    var blobURL = window.URL.createObjectURL(blob);

    this.GIF = new GIF({
        workers: 4,
        workerScript: blobURL,
        quality: 10,
        width: this.width,
        height: this.height
    });

    this.GIF.on('finished', function(blob) {
            var link = document.createElement('a');
            link.download = "fibre.gif";
            link.href = URL.createObjectURL(blob);
            var event = new MouseEvent('click');
            link.dispatchEvent(event);
    });

    this._anim_perframe_iteration = 0;
    this._anim_frame_counter = 0;

    // Set up animation turntable rendering
    let u = this.camera.up.clone();
    let d = this.camera.getWorldDirection();
    let y = new THREE.Vector3();
    y.crossVectors(d, u);
    y.normalize();
    let x = new THREE.Vector3();
    x.crossVectors(y, u);
    x.normalize();
    this._anim_x = x;
    this._anim_y = y;

    let toTarget = new THREE.Vector3();
    toTarget.copy(this.camControls.target);
    toTarget.sub(this.camera.position);
    let r = Math.abs(toTarget.dot(x));
    this._anim_r = r;

    let h = -toTarget.dot(u);
    let o = this.camControls.target.clone();
    o.addScaledVector(u, h);
    this._anim_o = o;

    this.reset();
}


