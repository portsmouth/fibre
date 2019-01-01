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

USER_CODE


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
            X.xyz += l*dir;
        }
        else
        {
            X.xyz += dX;
        }
        dX /= max(dx, FLT_EPSILON);
    }
    
    vec3 c = color(X.xyz, X.w);

    gbuf_pos = X;
    gbuf_rgb = vec4(c, 1.0);
    gbuf_rnd = rnd;
    gbuf_edg = vec4(dX, 1.0);
}
