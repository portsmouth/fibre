
/** @constructor 
* Interface to the dat.GUI UI.
*/
var GUI = function(visible = true) 
{
	// Create dat gui
	this.gui = new dat.GUI({autoPlace: true});
	this.gui.domElement.id = 'gui';
	var gui = this.gui;
	this.visible = visible;
	
	this.createguiSettings();
	if (!visible)
		this.gui.__proto__.constructor.toggleHide();
}

function updateDisplay(gui) 
{
    for (var i in gui.__controllers) {
        gui.__controllers[i].updateDisplay();
    }
    for (var f in gui.__folders) {
        updateDisplay(gui.__folders[f]);
    }
}

/**
* Call to explicitly force the GUI to synchronize with the
* current parameter values, if they have been changed programmatically.
*/
GUI.prototype.sync = function()
{
	updateDisplay(this.gui);
}


dat.GUI.prototype.removeFolder = function(name) {
  var folder = this.__folders[name];
  if (!folder) {
    return;
  }
  folder.close();
  this.__ul.removeChild(folder.domElement.parentNode);
  delete this.__folders[name];
  this.onResize();
}

GUI.prototype.refresh = function()
{
    if (this.presetsFolder    != undefined) this.gui.removeFolder(this.presetsFolder.name);
    if (this.integratorFolder != undefined) this.gui.removeFolder(this.integratorFolder.name);
    if (this.rendererFolder   != undefined) this.gui.removeFolder(this.rendererFolder.name);
    if (this.advancedFolder   != undefined) this.gui.removeFolder(this.advancedFolder.name);

    this.createguiSettings();
}

GUI.prototype.toggleHide = function()
{
	this.visible = !this.visible;
}

function hexToRgb(hex) 
{
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

GUI.prototype.createguiSettings = function()
{
    this.guiSettings = {};
    var renderer = fibre.getRenderer();
    let ME = this;

    // Presets folder
    this.presetsFolder = this.gui.addFolder('Presets');
    let preset_names = fibre.presets.get_preset_names();
    this.presetSettings = {};
    this.presetSettings["preset"] = fibre.preset_selection;
    var presetItem = this.presetsFolder.add(this.presetSettings, 'preset', preset_names);
    presetItem.onChange(function(preset_name) { fibre.presets.load_preset(preset_name); });

    // Integrator folder
    this.integratorFolder = this.gui.addFolder('Integrator');
    this.integratorFolder.add(renderer.settings, 'gridSpace', 0.0, 1.0).onChange( function(value) { fibre.manip_enabled = false; renderer.reset(true); } ).onFinishChange( function(value) { fibre.manip_enabled = true; } );
    this.integratorFolder.add(renderer.settings, 'tubeWidth', 0.0, 1.0).onChange( function(value) { fibre.manip_enabled = false; renderer.reset(true); } ).onFinishChange( function(value) { fibre.manip_enabled = true; } );
    this.integratorFolder.add(renderer.settings, 'integrationTime', 0.1, 1000.0).onChange( function(value) { fibre.manip_enabled = false; renderer.reset(true); } ).onFinishChange( function(value) { fibre.manip_enabled = true; } );
    this.integratorFolder.add(renderer.settings, 'maxTimeSteps', 4, 4096).onChange( function(value) { fibre.manip_enabled = false; renderer.settings.maxTimeSteps = Math.floor(value); renderer.reset(true); } ).onFinishChange( function(value) { fibre.manip_enabled = true; } );
    
    this.integratorFolder.add(renderer.settings, 'xmin').onChange( function(value) { fibre.manip_enabled = false; if (fibre.get_xmax() < value) renderer.settings.xmin = fibre.get_xmax(); else fibre.set_xmin(value); }).onFinishChange( function(value) { fibre.manip_enabled = true; } );
    this.integratorFolder.add(renderer.settings, 'xmax').onChange( function(value) { fibre.manip_enabled = false; if (fibre.get_xmin() > value) renderer.settings.xmax = fibre.get_xmin(); else fibre.set_xmax(value); }).onFinishChange( function(value) { fibre.manip_enabled = true; } );
    this.integratorFolder.add(renderer.settings, 'ymin').onChange( function(value) { fibre.manip_enabled = false; if (fibre.get_ymax() < value) renderer.settings.ymin = fibre.get_ymax(); else fibre.set_ymin(value); }).onFinishChange( function(value) { fibre.manip_enabled = true; } );
    this.integratorFolder.add(renderer.settings, 'ymax').onChange( function(value) { fibre.manip_enabled = false; if (fibre.get_ymin() > value) renderer.settings.ymax = fibre.get_ymin(); else fibre.set_ymax(value); }).onFinishChange( function(value) { fibre.manip_enabled = true; } );
    this.integratorFolder.add(renderer.settings, 'zmin').onChange( function(value) { fibre.manip_enabled = false; if (fibre.get_zmax() < value) renderer.settings.zmin = fibre.get_zmax(); else fibre.set_zmin(value); }).onFinishChange( function(value) { fibre.manip_enabled = true; } );
    this.integratorFolder.add(renderer.settings, 'zmax').onChange( function(value) { fibre.manip_enabled = false; if (fibre.get_zmin() > value) renderer.settings.zmax = fibre.get_zmin(); else fibre.set_zmax(value); }).onFinishChange( function(value) { fibre.manip_enabled = true; } );
    this.integratorFolder.add(renderer.settings, 'clipToBounds').onChange( function(value) { renderer.reset(true); } );
    this.integratorFolder.add(renderer.settings, 'integrateForward').onChange( function(value) { renderer.reset(true); } );
    this.integratorFolder.add(renderer.settings, 'enableBounds').onChange(function(value) { fibre.manip_enabled = value; });

    // Renderer folder
    this.rendererFolder = this.gui.addFolder('Renderer');

    this.rendererFolder.add(renderer.settings, 'showBounds');
    this.rendererFolder.add(renderer.settings, 'exposure', -10.0, 10.0).onChange(function(value) { fibre.render_dirty = true; fibre.manip_enabled = false; }).onFinishChange( function(value) { fibre.manip_enabled = true; } );
    this.rendererFolder.add(renderer.settings, 'gamma', 0.0, 3.0).onChange(function(value) { fibre.render_dirty = true; fibre.manip_enabled = false; }).onFinishChange( function(value) { fibre.manip_enabled = true; } );
    this.rendererFolder.add(renderer.settings, 'contrast', 0.0, 3.0).onChange(function(value) { fibre.render_dirty = true; fibre.manip_enabled = false; }).onFinishChange( function(value) { fibre.manip_enabled = true; } );
    this.rendererFolder.add(renderer.settings, 'saturation', 0.0, 3.0).onChange(function(value) { fibre.render_dirty = true; fibre.manip_enabled = false; }).onFinishChange( function(value) { fibre.manip_enabled = true; } );
       
    let camera = fibre.getCamera();
    this.rendererFolder.add(camera, 'fov', 5.0, 120.0).onChange(function(value) { camera.updateProjectionMatrix(); renderer.reset(true); fibre.render_dirty = true; fibre.manip_enabled = false; }).onFinishChange( function(value) { fibre.manip_enabled = true; } );

    this.rendererFolder.add(renderer.settings, 'hairShader').onChange( function(value) { renderer.reset(true); } );
    this.rendererFolder.add(renderer.settings, 'specShine', 0.0, 100.0).onChange( function(value) { fibre.manip_enabled = false; renderer.reset(true); } ).onFinishChange( function(value) { fibre.manip_enabled = true; } );
    this.guiSettings.specColor = [renderer.settings.specColor[0]*255.0, 
                                  renderer.settings.specColor[1]*255.0, 
                                  renderer.settings.specColor[2]*255.0];
    this.rendererFolder.addColor(this.guiSettings, 'specColor').onChange( function(value) 
        { 
            fibre.manip_enabled = false;
            if (typeof value==='string' || value instanceof String)
            {
                var color = hexToRgb(value);
                renderer.settings.specColor[0] = color.r / 255.0;
                renderer.settings.specColor[1] = color.g / 255.0;
                renderer.settings.specColor[2] = color.b / 255.0;
            }
            else
            {
                renderer.settings.specColor[0] = value[0] / 255.0;
                renderer.settings.specColor[1] = value[1] / 255.0;
                renderer.settings.specColor[2] = value[2] / 255.0;
            }
            renderer.reset(true);
        }).onFinishChange( function(value) { fibre.manip_enabled = true; } );
    this.rendererFolder.add(renderer.settings, 'depthTest').onChange( function(value) { renderer.reset(true); } );

    // Advanced folder
    this.advancedFolder = this.gui.addFolder('Advanced');
    this.advancedFolder.add(renderer.settings, 'rayBatch', 4, 1024).onChange( function(value) { fibre.manip_enabled = false; renderer.rayBatch = Math.floor(value); renderer.initStates(); renderer.reset(true); } ).onFinishChange( function(value) { fibre.manip_enabled = true; } );
    this.advancedFolder.add(renderer.settings, 'maxIterations', 10, 1000).onChange( function(value) { fibre.manip_enabled = false; renderer.reset(true); } ).onFinishChange( function(value) { fibre.manip_enabled = true; } );
    this.advancedFolder.add(renderer.settings, 'subtractiveColor').onChange( function(value) { renderer.reset(true); } );

   this.guiSettings.bgColor = [renderer.settings.bgColor[0]*255.0, 
                                renderer.settings.bgColor[1]*255.0, 
                                renderer.settings.bgColor[2]*255.0];
    this.advancedFolder.addColor(this.guiSettings, 'bgColor').onChange( function(value) 
        { 
            fibre.manip_enabled = false;
            if (typeof value==='string' || value instanceof String)
            {
                var color = hexToRgb(value);
                renderer.settings.bgColor[0] = color.r / 255.0;
                renderer.settings.bgColor[1] = color.g / 255.0;
                renderer.settings.bgColor[2] = color.b / 255.0;
            }
            else
            {
                renderer.settings.bgColor[0] = value[0] / 255.0;
                renderer.settings.bgColor[1] = value[1] / 255.0;
                renderer.settings.bgColor[2] = value[2] / 255.0;
            }
            renderer.reset(true);
        }).onFinishChange( function(value) { fibre.manip_enabled = true; } );

    this.guiSettings.light1_color = [renderer.settings.light1_color[0]*255.0, 
                                     renderer.settings.light1_color[1]*255.0, 
                                     renderer.settings.light1_color[2]*255.0];
    this.advancedFolder.addColor(this.guiSettings, 'light1_color').onChange( function(value) 
        { 
            fibre.manip_enabled = false;
            if (typeof value==='string' || value instanceof String)
            {
                var color = hexToRgb(value);
                renderer.settings.light1_color[0] = color.r / 255.0;
                renderer.settings.light1_color[1] = color.g / 255.0;
                renderer.settings.light1_color[2] = color.b / 255.0;
            }
            else
            {
                renderer.settings.light1_color[0] = value[0] / 255.0;
                renderer.settings.light1_color[1] = value[1] / 255.0;
                renderer.settings.light1_color[2] = value[2] / 255.0;
            }
            renderer.reset(true);
        }).onFinishChange( function(value) { fibre.manip_enabled = true; } );

    this.guiSettings.light2_color = [renderer.settings.light2_color[0]*255.0, 
                                     renderer.settings.light2_color[1]*255.0, 
                                     renderer.settings.light2_color[2]*255.0];
    this.advancedFolder.addColor(this.guiSettings, 'light2_color').onChange( function(value) 
        { 
            fibre.manip_enabled = false;
            if (typeof value==='string' || value instanceof String)
            {
                var color = hexToRgb(value);
                renderer.settings.light2_color[0] = color.r / 255.0;
                renderer.settings.light2_color[1] = color.g / 255.0;
                renderer.settings.light2_color[2] = color.b / 255.0;
            }
            else
            {
                renderer.settings.light2_color[0] = value[0] / 255.0;
                renderer.settings.light2_color[1] = value[1] / 255.0;
                renderer.settings.light2_color[2] = value[2] / 255.0;
            }
            renderer.reset(true);
        }).onFinishChange( function(value) { fibre.manip_enabled = true; } );

    this.guiSettings.light1_dir = [renderer.settings.light1_dir[0]*255.0, 
                                   renderer.settings.light1_dir[1]*255.0, 
                                   renderer.settings.light1_dir[2]*255.0];
    this.advancedFolder.addColor(this.guiSettings, 'light1_dir').onChange( function(value) 
        { 
            fibre.manip_enabled = false;
            if (typeof value==='string' || value instanceof String)
            {
                var color = hexToRgb(value);
                renderer.settings.light1_dir[0] = color.r / 255.0;
                renderer.settings.light1_dir[1] = color.g / 255.0;
                renderer.settings.light1_dir[2] = color.b / 255.0;
            }
            else
            {
                renderer.settings.light1_dir[0] = value[0] / 255.0;
                renderer.settings.light1_dir[1] = value[1] / 255.0;
                renderer.settings.light1_dir[2] = value[2] / 255.0;
            }
            renderer.reset(true);
        }).onFinishChange( function(value) { fibre.manip_enabled = true; } );

    this.guiSettings.light2_dir = [renderer.settings.light2_dir[0]*255.0, 
                                   renderer.settings.light2_dir[1]*255.0, 
                                   renderer.settings.light2_dir[2]*255.0];
    this.advancedFolder.addColor(this.guiSettings, 'light2_dir').onChange( function(value) 
        { 
            fibre.manip_enabled = false;
            if (typeof value==='string' || value instanceof String)
            {
                var color = hexToRgb(value);
                renderer.settings.light2_dir[0] = color.r / 255.0;
                renderer.settings.light2_dir[1] = color.g / 255.0;
                renderer.settings.light2_dir[2] = color.b / 255.0;
            }
            else
            {
                renderer.settings.light2_dir[0] = value[0] / 255.0;
                renderer.settings.light2_dir[1] = value[1] / 255.0;
                renderer.settings.light2_dir[2] = value[2] / 255.0;
            }
            renderer.reset(true);
        }).onFinishChange( function(value) { fibre.manip_enabled = true; } );

    this.advancedFolder.add(renderer.settings, 'dashes').onChange( function(value) { if (value) renderer.settings.depthTest = true; ME.sync(); renderer.reset(true); } );
    this.advancedFolder.add(renderer.settings, 'dash_spacing', 0.0, 1.0).onChange(function(value) { fibre.render_dirty = true; fibre.manip_enabled = false; }).onFinishChange( function(value) { fibre.manip_enabled = true; } );
    this.advancedFolder.add(renderer.settings, 'dash_size', 0.0, 1.0).onChange(function(value) { fibre.render_dirty = true; fibre.manip_enabled = false; }).onFinishChange( function(value) { fibre.manip_enabled = true; } );
    this.advancedFolder.add(renderer.settings, 'dash_speed', 0.0, 1000.0).onChange(function(value) { fibre.render_dirty = true; fibre.manip_enabled = false; }).onFinishChange( function(value) { fibre.manip_enabled = true; } );
    
    let button_record = { record:function(e) { 
        let button = ME._toggle_record_button;
        let command = button.innerText.trim();
        fibre.toggleRecord(command);
        if (command == 'RECORD') { button.innerText = 'STOP RECORDING'; button.style.backgroundColor = 'pink'; }
        else                     { button.innerText = 'RECORD';       ; button.style.backgroundColor = 'green'; }
    }};
    let button_record_ui = this.advancedFolder.add(button_record, 'record').name('RECORD');
    button_record_ui.__li.style.backgroundColor = 'green';
    this._toggle_record_button = button_record_ui.__li;
    
    let button_recordoneperiod = { recordoneperiod:function(e) { 
        fibre.toggleRecord('RECORD PERIOD');
    }};
    let button_recordperiod_ui =  this.advancedFolder.add(button_recordoneperiod, 'recordoneperiod');
    button_recordperiod_ui.__li.innerText = 'RECORD PERIOD'
    button_recordperiod_ui.__li.style.backgroundColor = 'green';

    this.advancedFolder.add(renderer.settings, 'record_realtime', true);

    let button_renderanim = { renderanim:function(e) { 
        fibre.renderAnim();
    }};
    let button_renderanim_ui = this.advancedFolder.add(button_renderanim, 'renderanim');
    button_renderanim_ui.__li.innerText = 'RENDER ANIM';
    button_renderanim_ui.__li.style.backgroundColor = 'green';

    let button_cancelanim = { cancelanim:function(e) { 
        fibre.GIF = null;
        fibre.animation_rendering = false;
        fibre.reset();
    }};
    let button_cancelanim_ui = this.advancedFolder.add(button_cancelanim, 'cancelanim');
    button_cancelanim_ui.__li.innerText = 'CANCEL ANIM';
    button_cancelanim_ui.__li.style.backgroundColor = 'red';

    this.advancedFolder.add(renderer.settings, 'anim_frames', 30, 4000).onChange(function(value) { fibre.render_dirty = true; fibre.manip_enabled = false; }).onFinishChange( function(value) { fibre.manip_enabled = true; } );
    this.advancedFolder.add(renderer.settings, 'anim_enable_turntable').onChange();
    this.advancedFolder.add(renderer.settings, 'anim_turntable_degrees', 10.0, 360.0*6).onChange();

    this.presetsFolder.open();
    this.integratorFolder.close();
    this.rendererFolder.close();
    this.advancedFolder.close();
}


/** 
 * Add a dat.GUI UI slider to control a float parameter.
 * The scene parameters need to be organized into an Object as
 * key-value pairs, for supply to this function.
 * @param {Object} parameters - the parameters object for the scene, with a key-value pair (where value is number) for the float parameter name
 * @param {Object} param - the slider range for this parameter, in the form `{name: 'foo', min: 0.0, max: 100.0, step: 1.0, recompile: true}` (step is optional, recompile is optional [default is false])
 * @param {Object} folder - optionally, pass the dat.GUI folder to add the parameter to (defaults to the main scene folder)
 * @returns {Object} the created dat.GUI slider item
 * @example
 *		Scene.prototype.initGui = function(gui)            
 *		{
 *			gui.addSlider(this.parameters, c);
 *			gui.addSlider(this.parameters, {name: 'foo2', min: 0.0, max: 1.0});
 *			gui.addSlider(this.parameters, {name: 'bar', min: 0.0, max: 3.0, recompile: true});
 *		}
 */
GUI.prototype.addSlider = function(parameters, param, folder=undefined)
{
    let _f = this.userFolder;
    if (typeof folder !== 'undefined') _f = folder;
    var name = param.name;
    var min  = param.min;
    var max  = param.max;
    var step = param.step;
    var recompile = param.recompile;
    var no_recompile = true;
    if (!(recompile==null || recompile==undefined)) no_recompile = !recompile;
    var item;
    if (step==null || step==undefined) { item = _f.add(parameters, name, min, max, step); }
    else                               { item = _f.add(parameters, name, min, max);       }
    item.onChange( function(value) { fibre.reset(no_recompile); fibre.manip_enabled = false; } );
    item.onFinishChange( function(value) { fibre.manip_enabled = true; } );
    return item;
}

/** 
 * Add a dat.GUI UI color picker to control a 3-element array parameter (where the RGB color channels are mapped into [0,1] float range)
 * @param {Object} parameters - the parameters object for the scene, with a key-value pair (where value is a 3-element array) for the color parameter name
 * @param {Object} name - the color parameter name
 * @param {Object} folder - optionally, pass a scale factor to apply to the RGB color components to calculate the result (defaults to 1.0)
 * @param {Object} folder - optionally, pass the dat.GUI folder to add the parameter to (defaults to the main scene folder)
 * @returns {Object} the created dat.GUI color picker item
*/
GUI.prototype.addColor = function(parameters, name, scale=1.0, folder=undefined)
{
    let _f = this.userFolder;
    if (typeof folder !== 'undefined') _f = folder;
    _f[name] = [parameters[name][0]*255.0, parameters[name][1]*255.0, parameters[name][2]*255.0];
    var item = _f.addColor(_f, name);
    item.onChange( function(color) {
                                if (typeof color==='string' || color instanceof String)
                                {
                                    var C = hexToRgb(color);
                                    parameters[name][0] = scale * C.r / 255.0;
                                    parameters[name][1] = scale * C.g / 255.0;
                                    parameters[name][2] = scale * C.b / 255.0;
                                }
                                else
                                {
                                    parameters[name][0] = scale * color[0] / 255.0;
                                    parameters[name][1] = scale * color[1] / 255.0;
                                    parameters[name][2] = scale * color[2] / 255.0;
                                }
                                fibre.reset(true);
                            } );
    return item;
}

// (deprecated)
GUI.prototype.addParameter = function(parameters, param)
{
	this.addSlider(parameters, param);
}

/**
* Access to internal dat.GUI object
* @returns {dat.GUI}
*/
GUI.prototype.getGUI = function()
{
	return this.gui;
}

/**
* Access to dat.GUI object folder object containing user UI parameters
* @returns {dat.GUI}
*/
GUI.prototype.getUserFolder = function()
{
	return this.userFolder;
}



