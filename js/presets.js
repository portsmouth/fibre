

var _presets_table = {

    'none': ``,

    'lorenz': `{"R":{"rayBatch":128,"maxTimeSteps":128,"maxIterations":100,"integrationTime":1,"gridSpace":0.15440285248241178,"record_realtime":true,"xmin":-29.703284119569204,"xmax":36.41007732067149,"ymin":-30.761883867431244,"ymax":34.8976678036754,"zmin":-7.099020364369787,"zmax":58.552581487655026,"clipToBounds":true,"showBounds":true,"exposure":-5.367914425527647,"gamma":2.2,"subtractive_color":false,"bgColor":[0,0,0],"tubeWidth":0.001,"tubeSpread":false,"hairShader":true,"hairShine":10,"hairSpecColor":[1,1,1],"depthTest":false,"dash_spacing":0.05,"dash_speed":10,"dash_size":0.5,"dashes":false},"C":{"pos":[-131.60092964225197,56.140558643067735,-47.49358251457521],"tar":[3.616476685246679,-9.15130126660645,24.575792393973554],"near":0.03464101615137755,"far":34641.016151377546},"E":{"code":"\\n///////////////////////////////////////////\\n// Lorenz attractor\\n///////////////////////////////////////////\\n\\nconst float rho   = float(28.0);     \\nconst float sigma = float(10.0);\\nconst float beta  = float(8.0)/float(3.0);\\n\\n#define rgb vec3\\n\\nconst vec3 colLo = rgb(255,20,55) / 255.0;\\nconst vec3 colHi = rgb(0,40,219) / 255.0;\\nconst float magScale = float(195);\\n\\n vec3 velocity(vec3 p, float t)\\n {\\n     vec3 v;\\n     float x = p.x;\\n     float y = p.y;\\n     float z = p.z;\\n     v.x = sigma*(y - x);\\n     v.y = x*(rho - z);\\n     v.z = x*y - beta*z;\\n     return v;\\n }    \\n \\nvec3 color(vec3 p, float t)\\n{\\n    vec3 E = velocity(p, t);\\n  \\tfloat mag2 = dot(E,E) / (magScale*magScale);\\n    float lerp = mag2/(1.0+mag2);\\n    return (1.0-lerp)*colLo + lerp*colHi;\\n}  \\n"}}`,

    'dipole': `{"R":{"rayBatch":128,"maxTimeSteps":128,"maxIterations":100,"integrationTime":1,"gridSpace":0.15440285248241178,"record_realtime":true,"xmin":-1.119480098684246,"xmax":2.0239261865708347,"ymin":-1.1620623238708434,"ymax":1.6560926719532618,"zmin":-1.0781343554308198,"zmax":1.704289578658806,"clipToBounds":true,"showBounds":true,"exposure":-5.367914425527647,"gamma":2.2,"subtractive_color":false,"bgColor":[0,0,0],"tubeWidth":0.001,"tubeSpread":false,"hairShader":true,"hairShine":10,"hairSpecColor":[1,1,1],"depthTest":false,"dash_spacing":0.05,"dash_speed":10,"dash_size":0.5,"dashes":false},"C":{"pos":[5.134848068634042,5.003128623401568,10.550343904892483],"tar":[0.1258936193468468,-0.3979648085630042,0.06327582042850523],"near":0.03464101615137755,"far":34641.016151377546},"E":{"code":"///////////////////////////////////////////\\n// Dipole field\\n///////////////////////////////////////////\\n\\n#define rgb vec3\\n\\nconst vec3 colLo = rgb(255,20,55) / 255.0;\\nconst vec3 colHi = rgb(0,40,219) / 255.0;\\nconst float magScale = 2.4;\\n\\nvec3 E(float q, in vec3 p, vec3 c)\\n{\\n    vec3 pc = p - c;\\n    float r2 = dot(pc, pc);\\n    vec3 E = q * (p-c) / (pow(r2, 1.5) + 1.0e-2);\\n    return E;\\n}\\n\\nvec3 velocity(vec3 p, float t)\\n{\\n    vec3 x0 = vec3(0,  0.5, 0);\\n    vec3 x1 = vec3(0, -0.5, 0);\\n    return E(1.0, p, x0) + E(-1.0, p, x1);\\n}    \\n\\nvec3 color(vec3 p, float t)\\n{\\n    vec3 E = velocity(p, t);\\n  \\tfloat mag2 = dot(E,E) / (magScale*magScale);\\n    float lerp = mag2/(1.0+mag2);\\n    return (1.0-lerp)*colLo + lerp*colHi;\\n}  \\n"}}`,

    'quadrupole': `{"R":{"rayBatch":128,"maxTimeSteps":319,"maxIterations":100,"integrationTime":10,"gridSpace":0,"record_realtime":true,"xmin":-0.9669137035558169,"xmax":1.0330862964441834,"ymin":-0.8397981313184116,"ymax":1.0983277029588778,"zmin":-0.8517073324695545,"zmax":0.8906642808163128,"clipToBounds":false,"showBounds":true,"exposure":-4.265036907796134,"gamma":2.2,"subtractive_color":false,"bgColor":[0,0,0],"tubeWidth":0,"tubeSpread":false,"hairShader":false,"hairShine":10,"hairSpecColor":[1,1,1],"depthTest":false,"dash_spacing":0.3308632553194538,"dash_speed":11.028775177315127,"dash_size":0.7720142624120588,"dashes":false},"C":{"pos":[3.5044845511772165,0.8172274498976062,-6.700395192068965],"tar":[-0.07949848674249538,-0.03437843530486278,0.030694790099949094],"near":0.03464101615137755,"far":34641.016151377546},"E":{"code":"///////////////////////////////////////////\\n// Quadrupole field\\n///////////////////////////////////////////\\n\\n#define rgb vec3\\n\\nconst vec3 colLo = rgb(0,20,209) / 255.0;\\nconst vec3 colHi = rgb(255,20,51) / 255.0;\\nconst float magScale = float(4.7731968);\\n\\nconst float q1 = 1.0;\\nconst float q2 = 1.0;\\nconst float q3 = -1.0;\\nconst float q4 = -1.0;\\n\\nvec3 E(float q, in vec3 p, vec3 c)\\n{\\n    vec3 pc = p - c;\\n    float r2 = dot(pc, pc);\\n    vec3 E = q * (p-c) / (pow(r2, 1.5) + 1.0e-2);\\n    return E;\\n}\\n\\nvec3 velocity(vec3 p, float t)\\n{\\n    vec3 x1 = vec3(0,  0.5, 0);\\n    vec3 x2 = vec3(0, -0.5, 0);\\n  \\tvec3 x3 = vec3(0.5,  0, 0);\\n    vec3 x4 = vec3(-0.5, 0, 0);\\n    return  E(q1, p, x1) + E(q2, p, x2)\\n          + E(q3, p, x3) + E(q4, p, x4);\\n}    \\n\\nvec3 color(vec3 p, float t)\\n{\\n    vec3 E = velocity(p, t);\\n  \\tfloat mag2 = dot(E,E) / (magScale*magScale);\\n    float lerp = mag2/(1.0+mag2);\\n    return (1.0-lerp)*colLo + lerp*colHi;\\n}  \\n"}}`

};


var Presets = function()
{
    this.preset_names = [];
    for (var preset_name in _presets_table) {
        if (_presets_table.hasOwnProperty(preset_name)) {
            this.preset_names.push(preset_name);
        }
    }
}

Presets.prototype.get_preset_names = function()
{
    return this.preset_names;
}


Presets.prototype.get_preset = function(preset_name)
{
    return this.preset_names[preset_name];
}

Presets.prototype.load_preset = function(preset_name)
{
    if (preset_name in _presets_table)
    {
        let preset = _presets_table[preset_name];
        let state = JSON.parse(preset);
        fibre.preset_selection = preset_name;
        fibre.load_state(state);
    }
    
}