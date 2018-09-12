precision highp float;

uniform sampler2D RngData;

uniform float gridSpace;
uniform float pointSpread;
uniform vec3 boundsMin;
uniform vec3 boundsMax;

layout(location = 0) out vec4 gbuf_pos;
layout(location = 1) out vec4 gbuf_rgb;
layout(location = 2) out vec4 gbuf_rnd;

in vec2 vTexCoord;

#define M_PI 3.1415926535897932384626433832795
#define FLT_EPSILON 1.19209290E-07F

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

void main()
{
    vec4 seed = texture(RngData, vTexCoord);
    vec3 boundsExtent = boundsMax - boundsMin;
    vec3 X = boundsMin;

    if (gridSpace < FLT_EPSILON)
    {
        X += vec3(rand(seed), rand(seed), rand(seed))*boundsExtent;
    }
    else
    {
        // @todo: make start points align with grid cell centers
        
        vec3 g = gridSpace / boundsExtent;
        X += vec3(g.x*floor(rand(seed)/g.x), 
                  g.y*floor(rand(seed)/g.y), 
                  g.z*floor(rand(seed)/g.z)) * boundsExtent;
        float Ct    = 2.0*rand(seed)-1.0;
        float theta = acos(Ct);
        float St    = sin(theta);
        float phi   = rand(seed)*2.0*M_PI;
        float Sp = sin(phi);
        float Cp = cos(phi);
        vec3 dX = pointSpread * gridSpace * vec3(St*Cp, St*Sp, Ct);
        X += dX;
    }

    gbuf_pos = vec4(X, 0.0);
    gbuf_rgb = vec4(color(X, 0.0), 1.0);
    gbuf_rnd = seed;
}
