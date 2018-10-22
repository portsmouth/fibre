var Shaders = {

'box-fragment-shader': `#version 300 es
precision highp float;

out vec4 outputColor;
uniform vec4 color;

void main() 
{
	outputColor = color;
}
`,

'box-vertex-shader': `#version 300 es
precision highp float;

uniform mat4 u_projectionMatrix;
uniform mat4 u_modelViewMatrix;

in vec3 Position;

void main()
{
	gl_Position = u_projectionMatrix * u_modelViewMatrix * vec4(Position, 1.0);
}
`,

'comp-fragment-shader': `#version 300 es
precision highp float;

uniform sampler2D Fluence;
uniform float invNumRays;
uniform float exposure;
uniform float invGamma;

in vec2 vTexCoord;
out vec4 outputColor;


void main() 
{
	// Read normalized fluence and time delay (integrated along primary rays)
	vec4 image = float(invNumRays) * texture(Fluence, vTexCoord);
	vec3 fluence = image.rgb;
	vec3 emission = fluence ;

	// Apply exposure 
	float gain = pow(2.0, exposure);
	float r = gain*emission.x; 
	float g = gain*emission.y; 
	float b = gain*emission.z;
	
	// Reinhard tonemap
	vec3 C = vec3(r/(1.0+r), g/(1.0+g), b/(1.0+b));

	// Apply gamma
	C = pow(C, vec3(invGamma));

	outputColor = vec4(C, 1.0);
}
`,

'comp-vertex-shader': `#version 300 es
precision highp float;

in vec3 Position;
in vec2 TexCoord;
out vec2 vTexCoord;

void main(void)
{
	gl_Position = vec4(Position, 1.0);
	vTexCoord = TexCoord;
}
`,

'init-fragment-shader': `#version 300 es
precision highp float;

uniform sampler2D RngData;

uniform float gridSpace;
uniform float tubeWidth;
uniform bool tubeSpread;
uniform vec3 boundsMin;
uniform vec3 boundsMax;

layout(location = 0) out vec4 gbuf_pos;
layout(location = 1) out vec4 gbuf_rgb;
layout(location = 2) out vec4 gbuf_rnd;
layout(location = 3) out vec4 gbuf_off;

in vec2 vTexCoord;

#define M_PI 3.1415926535897932384626433832795
#define FLT_EPSILON 1.19209290E-07F


//////////////////////////////////////////////////////////////
// Dynamically injected code
//////////////////////////////////////////////////////////////

USER_CODE


/// GLSL floating point pseudorandom number generator, from
/// "Implementing a Photorealistic Rendering System using GLSL", Toshiya Hachisuka
/// http://arxiv.org/pdf/1505.06022.pdf
float rand(inout vec4 rnd)
{
    const vec4 q = vec4(   1225.0,    1585.0,    2457.0,    2098.0);
    const vec4 r = vec4(   1112.0,     367.0,      92.0,     265.0);
    const vec4 a = vec4(   3423.0,    2646.0,    1707.0,    1999.0);
    const vec4 m = vec4(4194287.0, 4194277.0, 4194191.0, 4194167.0);
    vec4 beta = floor(rnd/q);
    vec4 p = a*(rnd - beta*q) - beta*r;
    beta = (1.0 - sign(p))*0.5*m;
    rnd = p + beta;
    return fract(dot(rnd/m, vec4(1.0, -1.0, 1.0, -1.0)));
}


void main()
{
    vec4 seed = texture(RngData, vTexCoord);
    vec3 boundsExtent = boundsMax - boundsMin;
    vec3 X = boundsMin;
    vec3 offset = vec3(0.0);

    if (gridSpace < FLT_EPSILON)
    {
        X += vec3(rand(seed), rand(seed), rand(seed))*boundsExtent;
    }
    else
    {
        // @todo: make start points align with grid cell centers
        X += vec3(rand(seed), rand(seed), rand(seed))*boundsExtent;
        X = vec3(gridSpace*floor(X.x/gridSpace),
                 gridSpace*floor(X.y/gridSpace),
                 gridSpace*floor(X.z/gridSpace));

        X = min(X, boundsMax);
        X = max(X, boundsMin);
        /*
        vec3 g = gridSpace / boundsExtent;
        X += vec3(g.x*floor(rand(seed)/g.x), 
                  g.y*floor(rand(seed)/g.y), 
                  g.z*floor(rand(seed)/g.z)) * boundsExtent;
        */
        float Ct    = 2.0*rand(seed)-1.0;
        float theta = acos(Ct);
        float St    = sin(theta);
        float phi   = rand(seed)*2.0*M_PI;
        float Sp = sin(phi);
        float Cp = cos(phi);
        
        vec3 dX = tubeWidth * gridSpace * vec3(St*Cp, St*Sp, Ct);
        if (tubeSpread)
        {
            X += dX;
        }
        else
        {
            offset = dX;
        }
    }

    gbuf_pos = vec4(X, 0.0);
    gbuf_rgb = vec4(color(X, 0.0), 1.0);
    gbuf_rnd = seed;
    gbuf_off = vec4(offset, 0.0);
}
`,

'init-vertex-shader': `#version 300 es
precision highp float;

in vec3 Position;
in vec2 TexCoord;
out vec2 vTexCoord;

void main() 
{
	gl_Position = vec4(Position, 1.0);
	vTexCoord = TexCoord;
}
`,

'line-fragment-shader': `#version 300 es
precision highp float;

in vec4 vColor;
in vec3 T;
uniform vec3 V;
uniform bool hairShader;
uniform float hairShine;
uniform vec3 hairSpecColor;

out vec4 outputColor;

#define oos3 0.57735026919
const vec3 L = vec3(oos3, oos3, oos3);

void main()
{
    if (hairShader)
    {
        float dotTL = max(0.0, dot(T, L));
        float sinTL = sqrt(max(0.0, 1.0 - dotTL*dotTL));
        float dotTE = max(0.0, dot(T, -V));
        float sinTE = sqrt(max(0.0, 1.0 - dotTE*dotTE));
        vec4 diffuse = vColor * abs(sinTL);
        vec4 specular = vec4(hairSpecColor, 1) * pow(dotTL*dotTE + sinTL*sinTE, hairShine);
        outputColor = diffuse + specular;
    }
    else
    {
        outputColor = vColor;
    }
}
`,

'line-vertex-shader': `#version 300 es
precision highp float;

uniform sampler2D PosDataA;
uniform sampler2D PosDataB;
uniform sampler2D RgbDataA;
uniform sampler2D RgbDataB;
uniform sampler2D OffsetData;
uniform mat4 u_projectionMatrix;
uniform mat4 u_modelViewMatrix;

uniform bool tubeSpread;

in vec3 TexCoord;
out vec4 vColor;
out vec3 T;

void main()
{
    // Textures A and B contain line segment start and end points respectively
    // (i.e. the geometry defined by this vertex shader is stored in textures)
    vec4 posA   = texture(PosDataA, TexCoord.xy);
    vec4 posB   = texture(PosDataB, TexCoord.xy);
    vec4 colorA = texture(RgbDataA, TexCoord.xy);
    vec4 colorB = texture(RgbDataB, TexCoord.xy);

    // Line segment vertex position (either posA or posB)
    vec4 pos = mix(posA, posB, TexCoord.z);
    if (!tubeSpread)
    {
        vec4 offset = texture(OffsetData, TexCoord.xy);
        pos.xyz += offset.xyz;
    }

    gl_Position = u_projectionMatrix * u_modelViewMatrix * vec4(pos.xyz, 1.0);
    vColor = mix(colorA, colorB, TexCoord.z);
    T = normalize(posB.xyz - posA.xyz);
}
`,

'pass-fragment-shader': `#version 300 es
precision highp float;

uniform sampler2D WaveBuffer;

in vec2 vTexCoord;
out vec4 outputColor;

void main() 
{
	outputColor = vec4(texture(WaveBuffer, vTexCoord).rgba);
}
`,

'pass-vertex-shader': `#version 300 es
precision highp float;

in vec3 Position;
in vec2 TexCoord;
out vec2 vTexCoord;

void main(void)
{
	gl_Position = vec4(Position, 1.0);
	vTexCoord = TexCoord;
}
`,

'tonemapper-fragment-shader': `#version 300 es
precision highp float;

uniform sampler2D Radiance;
uniform float exposure;
uniform float invGamma;

varying vec2 vTexCoord;

out vec4 outputColor;

void main()
{
	vec3 L = exposure * texture(Radiance, vTexCoord).rgb;
	float r = L.x; 
	float g = L.y; 
	float b = L.z;
	vec3 Lp = vec3(r/(1.0+r), g/(1.0+g), b/(1.0+b));
	vec3 S = pow(Lp, vec3(invGamma));
	
	outputColor = vec4(S, 1.0);
}
`,

'tonemapper-vertex-shader': `#version 300 es
precision highp float;

in vec3 Position;
in vec2 TexCoord;
out vec2 vTexCoord;

void main() 
{
	gl_Position = vec4(Position, 1.0);
	vTexCoord = TexCoord;
}
`,

'trace-fragment-shader': `#version 300 es
precision highp float;

uniform sampler2D PosData;
uniform sampler2D RgbData;
uniform sampler2D RngData;

uniform bool clipToBounds;
uniform vec3 boundsMin;
uniform vec3 boundsMax;
uniform float timestep;

layout(location = 0) out vec4 gbuf_pos;
layout(location = 1) out vec4 gbuf_rgb;
layout(location = 2) out vec4 gbuf_rnd;

in vec2 vTexCoord;


//////////////////////////////////////////////////////////////
// Dynamically injected code
//////////////////////////////////////////////////////////////

USER_CODE


//////////////////////////////////////////////////////////////
// Integrate vector field
//////////////////////////////////////////////////////////////

void main()
{
    vec4 X        = texture(PosData, vTexCoord);
    vec4 rgbw     = texture(RgbData, vTexCoord);
    vec4 rnd      = texture(RngData, vTexCoord);
    
    float t = X.w;
    if (!clipToBounds || t>=0.0)
    {
        vec3 x = X.xyz;
        
        // Integrate ODE with 4th order Runge-Kutta method
        vec3 k1 = timestep * velocity(x,        t             );
        vec3 k2 = timestep * velocity(x+0.5*k1, t+0.5*timestep);
        vec3 k3 = timestep * velocity(x+0.5*k2, t+0.5*timestep);
        vec3 k4 = timestep * velocity(x+    k3, t+    timestep);

        X.xyz += (k1 + 2.0*k2 + 2.0*k3 + k4)/6.0;
        X.w   += timestep;
        if (clipToBounds)
        {
            X.xyz = min(boundsMax, X.xyz);
            X.xyz = max(boundsMin, X.xyz);
            if (X.xyz.x >= boundsMax.x) { X.xyz.x = boundsMax.x; X.w = -1.0; }
            if (X.xyz.y >= boundsMax.y) { X.xyz.y = boundsMax.y; X.w = -1.0; }
            if (X.xyz.z >= boundsMax.z) { X.xyz.z = boundsMax.z; X.w = -1.0; }
            if (X.xyz.x <= boundsMin.x) { X.xyz.x = boundsMin.x; X.w = -1.0; }
            if (X.xyz.y <= boundsMin.y) { X.xyz.y = boundsMin.y; X.w = -1.0; }
            if (X.xyz.z <= boundsMin.z) { X.xyz.z = boundsMin.z; X.w = -1.0; }
        }
    }
    
    vec3 c = color(X.xyz, X.w);

    gbuf_pos = X;
    gbuf_rgb = vec4(c, 1.0);
    gbuf_rnd = rnd;
}
`,

'trace-vertex-shader': `#version 300 es
precision highp float;

in vec3 Position;
in vec2 TexCoord;

out vec2 vTexCoord;

void main() 
{
	gl_Position = vec4(Position, 1.0);
	vTexCoord = TexCoord;
}
`,

}