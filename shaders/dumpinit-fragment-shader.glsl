precision highp float;

uniform sampler2D RngData;

uniform vec3 boundsMin;
uniform vec3 boundsMax;
uniform float animFraction;
uniform int fbRes;
uniform int nx;
uniform int ny;
uniform int nz;
uniform float grid_x;
uniform float grid_y;
uniform float grid_z;

layout(location = 0) out vec4 gbuf_pos;
layout(location = 1) out vec4 gbuf_rgb;
layout(location = 2) out vec4 gbuf_rnd;
layout(location = 3) out vec4 gbuf_off;

in vec2 vTexCoord;

//////////////////////////////////////////////////////////////
// Dynamically injected code
//////////////////////////////////////////////////////////////

_USER_CODE_

void main()
{
    vec4 seed = texture(RngData, vTexCoord);
    vec4 pixel = gl_FragCoord;

    highp int i = int(pixel.x);
    highp int j = int(pixel.y);
    highp int pi = j + fbRes*i;

    int iz = pi % nz;
    int iy = (pi / nz) % ny;
    int ix = pi / (ny * nz);
    vec3 X = boundsMin + vec3(grid_x*(0.5+float(ix)), 
                              grid_y*(0.5+float(iy)), 
                              grid_z*(0.5+float(iz)));

    gbuf_pos = vec4(X, 0.0);
    gbuf_rgb = vec4(color(X, 0.0), 1.0);
    gbuf_rnd = seed;
    gbuf_off = vec4(0.0, 0.0, 0.0, 0.0);
}
