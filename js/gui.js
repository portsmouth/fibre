
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
    var raytracer = fibre.getRaytracer();
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
    this.integratorFolder.add(raytracer.settings, 'maxTimeSteps', 4, 4096).onChange( function(value) { raytracer.settings.maxTimeSteps = Math.floor(value); raytracer.reset(true); } );
    this.integratorFolder.add(raytracer.settings, 'integrationTime', 0.1, 1000.0).onChange( function(value) { raytracer.reset(true); } );
    this.integratorFolder.add(raytracer.settings, 'gridSpace', 0.0, 1.0).onChange( function(value) { raytracer.reset(true); } );
    this.integratorFolder.add(raytracer.settings, 'xmin').onChange( function(value) { if (fibre.get_xmax() < value) raytracer.settings.xmin = fibre.get_xmax(); else fibre.set_xmin(value); });
    this.integratorFolder.add(raytracer.settings, 'xmax').onChange( function(value) { if (fibre.get_xmin() > value) raytracer.settings.xmax = fibre.get_xmin(); else fibre.set_xmax(value); });
    this.integratorFolder.add(raytracer.settings, 'ymin').onChange( function(value) { if (fibre.get_ymax() < value) raytracer.settings.ymin = fibre.get_ymax(); else fibre.set_ymin(value); });  
    this.integratorFolder.add(raytracer.settings, 'ymax').onChange( function(value) { if (fibre.get_ymin() > value) raytracer.settings.ymax = fibre.get_ymin(); else fibre.set_ymax(value); });
    this.integratorFolder.add(raytracer.settings, 'zmin').onChange( function(value) { if (fibre.get_zmax() < value) raytracer.settings.zmin = fibre.get_zmax(); else fibre.set_zmin(value); });
    this.integratorFolder.add(raytracer.settings, 'zmax').onChange( function(value) { if (fibre.get_zmin() > value) raytracer.settings.zmax = fibre.get_zmin(); else fibre.set_zmax(value); });
    
    // Renderer folder
    this.rendererFolder = this.gui.addFolder('Renderer');
    this.rendererFolder.add(raytracer.settings, 'clipToBounds').onChange( function(value) { raytracer.reset(true); } );
    this.rendererFolder.add(raytracer.settings, 'showBounds').onChange( function(value) { raytracer.reset(true); } );
    this.rendererFolder.add(raytracer.settings, 'exposure', -10.0, 10.0);
    this.rendererFolder.add(raytracer.settings, 'gamma', 0.0, 3.0);
    this.rendererFolder.add(raytracer.settings, 'subtractive_color').onChange( function(value) { raytracer.reset(true); } );

    this.guiSettings.bgColor = [raytracer.settings.bgColor[0]*255.0, 
                                raytracer.settings.bgColor[1]*255.0, 
                                raytracer.settings.bgColor[2]*255.0];
    this.rendererFolder.addColor(this.guiSettings, 'bgColor').onChange( function(value) 
        { 
            if (typeof value==='string' || value instanceof String)
            {
                var color = hexToRgb(value);
                raytracer.settings.bgColor[0] = color.r / 255.0;
                raytracer.settings.bgColor[1] = color.g / 255.0;
                raytracer.settings.bgColor[2] = color.b / 255.0;
            }
            else
            {
                raytracer.settings.bgColor[0] = value[0] / 255.0;
                raytracer.settings.bgColor[1] = value[1] / 255.0;
                raytracer.settings.bgColor[2] = value[2] / 255.0;
            }
            raytracer.reset(true);
        });

    this.rendererFolder.add(raytracer.settings, 'tubeWidth', 0.0, 0.01).onChange( function(value) { raytracer.reset(true); } );
    this.rendererFolder.add(raytracer.settings, 'tubeSpread').onChange( function(value) { raytracer.reset(true); } );
    this.rendererFolder.add(raytracer.settings, 'hairShader').onChange( function(value) { raytracer.reset(true); } );
    this.rendererFolder.add(raytracer.settings, 'hairShine', 0.0, 100.0).onChange( function(value) { raytracer.reset(true); } );
    this.guiSettings.hairSpecColor = [raytracer.settings.hairSpecColor[0]*255.0, 
                                      raytracer.settings.hairSpecColor[1]*255.0, 
                                      raytracer.settings.hairSpecColor[2]*255.0];
    this.rendererFolder.addColor(this.guiSettings, 'hairSpecColor').onChange( function(value) 
        { 
            if (typeof value==='string' || value instanceof String)
            {
                var color = hexToRgb(value);
                raytracer.settings.hairSpecColor[0] = color.r / 255.0;
                raytracer.settings.hairSpecColor[1] = color.g / 255.0;
                raytracer.settings.hairSpecColor[2] = color.b / 255.0;
            }
            else
            {
                raytracer.settings.hairSpecColor[0] = value[0] / 255.0;
                raytracer.settings.hairSpecColor[1] = value[1] / 255.0;
                raytracer.settings.hairSpecColor[2] = value[2] / 255.0;
            }
            raytracer.reset(true);
        });
    this.rendererFolder.add(raytracer.settings, 'depthTest').onChange( function(value) { raytracer.reset(true); } );
    this.rendererFolder.add(raytracer.settings, 'dashes').onChange( function(value) { if (value) raytracer.settings.depthTest = true; ME.sync(); raytracer.reset(true); } );
    this.rendererFolder.add(raytracer.settings, 'dash_spacing', 0.0, 1.0);
    this.rendererFolder.add(raytracer.settings, 'dash_size', 0.0, 1.0);
    this.rendererFolder.add(raytracer.settings, 'dash_speed', 0.0, 1000.0);
    
    // Advanced folder
    this.advancedFolder = this.gui.addFolder('Advanced');
    this.advancedFolder.add(raytracer.settings, 'rayBatch', 4, 1024).onChange( function(value) { raytracer.rayBatch = Math.floor(value); raytracer.initStates(); raytracer.reset(true); } );
    this.advancedFolder.add(raytracer.settings, 'maxIterations', 10, 1000).onChange( function(value) { raytracer.reset(true); } );

    let button_record = { record:function(e) { 
        let button = ME._toggle_record_button;
        let command = button.innerText.trim();
        fibre.toggleRecord(command);
        if (command == 'RECORD') { button.innerText = 'STOP RECORDING'; button.style.backgroundColor = 'pink'; }
        else                     { button.innerText = 'RECORD';       ; button.style.backgroundColor = 'black'; }
    }};
    let button_record_ui = this.advancedFolder.add(button_record, 'record').name('RECORD');
    this._toggle_record_button = button_record_ui.__li;

    let button_recordoneperiod = { recordoneperiod:function(e) { 
        fibre.toggleRecord('RECORD PERIOD');
    }};
    let button_recordoneperiod_ui = this.advancedFolder.add(button_recordoneperiod, 'recordoneperiod').name('RECORD PERIOD');
    this._toggle_recordoneperiod_button = button_recordoneperiod_ui.__li;

    this.advancedFolder.add(raytracer.settings, 'record_realtime', true);

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
    item.onChange( function(value) { fibre.reset(no_recompile); fibre.camera.enabled = false; } );
    item.onFinishChange( function(value) { fibre.camera.enabled = true; } );
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



