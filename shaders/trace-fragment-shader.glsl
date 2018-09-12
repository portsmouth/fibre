precision highp float;

uniform sampler2D PosData;
uniform sampler2D RgbData;
uniform sampler2D RngData;

uniform float timestep;

layout(location = 0) out vec4 gbuf_pos;
layout(location = 1) out vec4 gbuf_rgb;
layout(location = 2) out vec4 gbuf_rnd;

in vec2 vTexCoord;


//////////////////////////////////////////////////////////////
// Dynamically injected code
//////////////////////////////////////////////////////////////

vec3 velocity(vec3 p, float t)
{
    vec3 v;
    float x = p.x;
    float y = p.y;
    float z = p.z;
    VELOCITY_FIELD
    return v;
}    

// local emission color, a function of:
//  - position p
//  - arclength from start point, s
vec3 color(vec3 p, float t)
{
    vec3 c;
    float x = p.x;
    float y = p.y;
    float z = p.z;
    COLOR_FIELD
    return c;
}    


//////////////////////////////////////////////////////////////
// Integrate vector field
//////////////////////////////////////////////////////////////

void main()
{
    vec4 X        = texture(PosData, vTexCoord);
    vec4 rgbw     = texture(RgbData, vTexCoord);
    vec4 rnd      = texture(RngData, vTexCoord);
    
    vec3 x = X.xyz;
    float t = X.w;
    
    // Integrate ODE with 4th order Runge-Kutta method
    vec3 k1 = timestep * velocity(x,        t             );
    vec3 k2 = timestep * velocity(x+0.5*k1, t+0.5*timestep);
    vec3 k3 = timestep * velocity(x+0.5*k2, t+0.5*timestep);
    vec3 k4 = timestep * velocity(x+    k3, t+    timestep);

    X.xyz += (k1 + 2.0*k2 + 2.0*k3 + k4)/6.0;
    X.w   += timestep;

    vec3 c = color(X.xyz, X.w);

    gbuf_pos = X;
    gbuf_rgb = vec4(c, 1.0);
    gbuf_rnd = rnd;
}
