precision highp float;

uniform sampler2D PosData;
uniform sampler2D VelData;
uniform sampler2D RngData;
uniform sampler2D RgbData;

uniform float stepDistance;

uniform float shrink;

layout(location = 0) out vec4 gbuf_pos;
layout(location = 1) out vec4 gbuf_vel;
layout(location = 2) out vec4 gbuf_rnd;
layout(location = 3) out vec4 gbuf_rgb;

in vec2 vTexCoord;


//////////////////////////////////////////////////////////////
// Dynamically injected code
//////////////////////////////////////////////////////////////

vec3 velocity(vec3 p)
{
    vec3 v;
    float x = p.x;
    float y = p.y;
    float z = p.z;
    VELOCITY_FIELD
    return v;
}    

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
    vec4 V        = texture(VelData, vTexCoord);
    vec4 rnd      = texture(RngData, vTexCoord);
    vec4 rgbw     = texture(RgbData, vTexCoord);

    // @todo:  RK4 integrator

    vec3 v = velocity(X.xyz);
    X.xyz += stepDistance*v;
    X.w   += stepDistance;

    vec3 c = color(X.xyz, X.w);

    gbuf_pos = X;
    gbuf_vel = vec4(v, 1.0);
    gbuf_rnd = rnd;
    gbuf_rgb = vec4(c, 1.0);
}
