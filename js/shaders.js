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
uniform float invNpasses;
uniform float time;
uniform bool dashes;
uniform float dash_spacing;
uniform float dash_size;
uniform float dash_speed;
uniform vec3 bg_color;
uniform bool subtractive_color;

uniform float exposure;
uniform float invGamma;
uniform float contrast;
uniform float saturation;

in vec2 vTexCoord;
out vec4 outputColor;

float toneMap(float L)
{
  return L / (1.0 + L);
}

void main() 
{
    // Read normalized fluence and time
    vec4 image = float(invNpasses) * texture(Fluence, vTexCoord);
    vec3 RGB = image.rgb;

    // Apply gamma
    RGB = pow(RGB, vec3(invGamma));

    float gain = pow(2.0, exposure);
    float r = gain*RGB.x; 
    float g = gain*RGB.y; 
    float b = gain*RGB.z;

    // apply tonemapping
    RGB *= pow(2.0, exposure);
    float R = RGB.r;
    float G = RGB.g;
    float B = RGB.b;
    R = toneMap(R);
    G = toneMap(G);
    B = toneMap(B);

    // apply saturation
    float mean = (R + G + B)/3.0;
    float dR = R - mean;
    float dG = G - mean;
    float dB = B - mean;
    R = mean + sign(dR)*pow(abs(dR), 1.0/saturation);
    G = mean + sign(dG)*pow(abs(dG), 1.0/saturation);
    B = mean + sign(dB)*pow(abs(dB), 1.0/saturation);

    // apply contrast
    dR = R - 0.5;
    dG = G - 0.5;
    dB = B - 0.5;
    R = 0.5 + sign(dR)*pow(abs(dR), 1.0/contrast);
    G = 0.5 + sign(dG)*pow(abs(dG), 1.0/contrast);
    B = 0.5 + sign(dB)*pow(abs(dB), 1.0/contrast);

    vec3 C = vec3(R,G,B);

    // Optionally render moving dashes
    float modulation = 1.0;
    if (dashes)
    {
        float t = image.w;
        modulation = smoothstep(1.0 - 2.0*dash_size, 1.0, cos(t/dash_spacing - dash_speed*time));
        C *= modulation;
    }

    // Generate final pixel color
    if (!subtractive_color)
    {
        outputColor = vec4(bg_color + C, 1.0);
    }
    else
    {
        vec3 T = exp(-C);
        outputColor = vec4(bg_color * T, 1.0);
    }
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
uniform vec3 boundsMin;
uniform vec3 boundsMax;
uniform float animFraction;

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

_USER_CODE_


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
    float scale = max(max(boundsExtent.x, boundsExtent.y), boundsExtent.z);
    vec3 X = boundsMin;

    if (gridSpace < FLT_EPSILON)
    {
        X += vec3(rand(seed), rand(seed), rand(seed))*boundsExtent;
    }
    else
    {
        X += vec3(rand(seed), rand(seed), rand(seed))*(boundsExtent+0.5*gridSpace);
        X = vec3(gridSpace*floor(X.x/gridSpace),
                 gridSpace*floor(X.y/gridSpace),
                 gridSpace*floor(X.z/gridSpace));
        X = min(X, boundsMax);
        X = max(X, boundsMin);
    }

    float Ct    = 2.0*rand(seed)-1.0;
    float theta = acos(Ct);
    float St    = sin(theta);
    float phi   = rand(seed)*2.0*M_PI;
    float Sp = sin(phi);
    float Cp = cos(phi);
    vec3 offset = tubeWidth * vec3(St*Cp, St*Sp, Ct);

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

in vec3 vColor; // user color
in vec3 T;      // tangent
in vec3 D;      // local offset (from axis to surface)
in float t;     // integration parameter 

uniform vec3 V;
uniform bool hairShader;
uniform float specShine;
uniform vec3 specColor;
uniform vec3 L1;
uniform vec3 L2;
uniform vec3 C1;
uniform vec3 C2;

out vec4 outputColor;

void main()
{
    vec3 Tn = normalize(T);
    vec3 N = normalize(D);

    if (hairShader)
    {
        float dotTL1 = dot(Tn, L1);
        float sinTL1 = sqrt(max(0.0, 1.0 - dotTL1*dotTL1));
        float dotTL2 = dot(Tn, L2);
        float sinTL2 = sqrt(max(0.0, 1.0 - dotTL2*dotTL2));
        float dotTE = dot(Tn, -V);
        float sinTE = sqrt(max(0.0, 1.0 - dotTE*dotTE));
        vec3 diffuse1 = vColor * C1 * sinTL1 * max(0.0, dot(L1, N));  // kajiya-kay diffuse
        vec3 diffuse2 = vColor * C2 * sinTL2 * max(0.0, dot(L2, N));                    
        vec3 specular1 = specColor * pow(abs(-dotTL1*dotTE + sinTL1*sinTE), specShine); 
        vec3 specular2 = specColor * pow(abs(-dotTL2*dotTE + sinTL2*sinTE), specShine); // kajiya-kay spec
        outputColor.rgb = diffuse1 + specular1 + diffuse2 + specular2;
    }
    else
    {
        vec3 diffuse1 = vColor * C1 * max(0.0, dot(L1, N));
        vec3 diffuse2 = vColor * C2 * max(0.0, dot(L2, N));
        vec3 H1 = normalize(L1 + V);
        vec3 H2 = normalize(L2 + V);
        vec3 specular1 = specColor * pow(abs(dot(H1, N)), specShine);
        vec3 specular2 = specColor * pow(abs(dot(H2, N)), specShine);
        outputColor.rgb = diffuse1 + specular1 + diffuse2 + specular2;
    }

    outputColor.w = t;
}
`,

'line-vertex-shader': `#version 300 es
precision highp float;

uniform sampler2D PosDataA;
uniform sampler2D PosDataB;
uniform sampler2D RgbDataA;
uniform sampler2D RgbDataB;
uniform sampler2D EdgDataA;
uniform sampler2D EdgDataB;
uniform sampler2D OffData;
uniform mat4 u_projectionMatrix;
uniform mat4 u_modelViewMatrix;

in vec3 TexCoord;

out vec3 vColor;  // user color
out vec3 T;       // tangent
out vec3 D;       // local offset (from axis to surface)
out float t;      // integration parameter 

void main()
{
    // Textures A and B contain line segment start and end points respectively
    // (i.e. the geometry defined by this vertex shader is stored in textures)
    vec4 posA   = texture(PosDataA, TexCoord.xy);
    vec4 posB   = texture(PosDataB, TexCoord.xy);
    vec4 colorA = texture(RgbDataA, TexCoord.xy);
    vec4 colorB = texture(RgbDataB, TexCoord.xy);
    vec3 edgA   = texture(EdgDataA, TexCoord.xy).xyz;
    vec3 edgB   = texture(EdgDataB, TexCoord.xy).xyz;
    vec3 offset = texture(OffData,  TexCoord.xy).xyz;

    vec3 pos;
    _LINE_TELEPORT_CODE_
    {
        // Line segment vertex position (either posA or posB according to end-point)
        pos = mix(posA.xyz, posB.xyz, TexCoord.z);
    }
    pos += offset;

    gl_Position = u_projectionMatrix * u_modelViewMatrix * vec4(pos, 1.0);
    vColor = mix(colorA.xyz, colorB.xyz, TexCoord.z);
    t = mix(posA.w, posB.w, TexCoord.z);
    T = mix(edgA, edgB, TexCoord.z);
    D = offset;
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
uniform sampler2D RngData;

uniform bool clipToBounds;
uniform bool integrateForward;
uniform vec3 boundsMin;
uniform vec3 boundsMax;
uniform float timestep;
uniform float animFraction;

layout(location = 0) out vec4 gbuf_pos;
layout(location = 1) out vec4 gbuf_rgb;
layout(location = 2) out vec4 gbuf_rnd;
layout(location = 3) out vec4 gbuf_edg;

in vec2 vTexCoord;

#define FLT_EPSILON 1.19209290E-07F
#define sort2(a,b) { vec3 tmp=min(a,b); b=a+b-tmp; a=tmp; }

bool boxHit( in vec3 rayPos, in vec3 rayDir, in vec3 bbMin, in vec3 bbMax,
             inout float t0, inout float t1 )
{
    vec3 dL = 1.0/rayDir;
    vec3 lo = (bbMin - rayPos) * dL;
    vec3 hi = (bbMax - rayPos) * dL;
    sort2(lo, hi);
    bool hit = !( lo.x>hi.y || lo.y>hi.x || lo.x>hi.z || lo.z>hi.x || lo.y>hi.z || lo.z>hi.y );
    t0 = max(max(lo.x, lo.y), lo.z);
    t1 = min(min(hi.x, hi.y), hi.z);
    return hit;
}

//////////////////////////////////////////////////////////////
// Dynamically injected code
//////////////////////////////////////////////////////////////

_USER_CODE_


//////////////////////////////////////////////////////////////
// Integrate vector field
//////////////////////////////////////////////////////////////

void main()
{
    vec4 X = texture(PosData, vTexCoord);
    vec4 rnd = texture(RngData, vTexCoord);
    float t = X.w;
    vec3 dX = vec3(0.0);

    float dt = timestep;
    if (!integrateForward) dt *= -1.f;

    bool teleported = false;

    if (!clipToBounds || t>=0.0)
    {
        // Integrate ODE with 4th order Runge-Kutta method
        vec3 x = X.xyz;
        vec3 k1 = dt * velocity(x,        t       );
        vec3 k2 = dt * velocity(x+0.5*k1, t+0.5*dt);
        vec3 k3 = dt * velocity(x+0.5*k2, t+0.5*dt);
        vec3 k4 = dt * velocity(x+    k3, t+    dt);
        dX = (k1 + 2.0*k2 + 2.0*k3 + k4)/6.0;
        X.w  += dt;
        float dx = length(dX);
        if (clipToBounds && dx>0.0)
        {
            // Clip ray to land on box, if it leaves
            vec3 dir = dX/dx;
            float t0, t1;
            boxHit(X.xyz, dir, boundsMin, boundsMax, t0, t1);
            float l = min(t1, dx);
            vec3 Xnew = X.xyz + l*dir;
            vec3 Xtmp = Xnew;   
            teleported = teleport(Xtmp, X.xyz);
            if (teleported) Xnew = Xtmp;
            X.xyz = Xnew;
        }
        else
        {
            vec3 Xnew = X.xyz + dX;
            vec3 Xtmp = Xnew;
            teleported = teleport(Xtmp, X.xyz);
            if (teleported) Xnew = Xtmp;
            X.xyz = Xnew;
        }
        dX /= max(dx, FLT_EPSILON);
    }
    
    vec3 c = color(X.xyz, X.w);

    gbuf_pos = X;
    gbuf_rgb = vec4(c, teleported ? 0.0 : 1.0);
    gbuf_rnd = rnd;
    gbuf_edg = vec4(dX, 1.0);
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