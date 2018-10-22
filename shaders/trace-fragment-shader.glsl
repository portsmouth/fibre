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


#define sort2(a,b) { vec3 tmp=min(a,b); b=a+b-tmp; a=tmp; }

bool boxHit( in vec3 rayPos, in vec3 rayDir, in vec3 bbMin, in vec3 bbMax,
             inout float t0, inout float t1 )
{
    vec3 dL = vec3(1.0f/rayDir.x, 1.0f/rayDir.y, 1.0f/rayDir.z);
    vec3 lo = (bbMin - rayPos) * dL;
    vec3 hi = (bbMax - rayPos) * dL;
    sort2(lo, hi);
    bool hit = !( lo.x>hi.y || lo.y>hi.x || lo.x>hi.z || lo.z>hi.x || lo.y>hi.z || lo.z>hi.y );
    t0 = max(max(lo.x, lo.y), lo.z);
    t1 = min(min(hi.x, hi.y), hi.z);
    return hit;
}

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

        vec3 dX = (k1 + 2.0*k2 + 2.0*k3 + k4)/6.0;
        X.w  += timestep;

        if (clipToBounds)
        {
            // Clip ray to land on box, if it leaves
            float dx = length(dX);
            if (dx > 0.0)
            {
                vec3 dir = dX/dx;
                float t0, t1;
                boxHit(X.xyz, dir, boundsMin, boundsMax, t0, t1);
                float l = min(t1, dx);
                X.xyz += l*dir;
            }
        }
        else
        {
            X.xyz += dX;
        }
    }
    
    vec3 c = color(X.xyz, X.w);

    gbuf_pos = X;
    gbuf_rgb = vec4(c, 1.0);
    gbuf_rnd = rnd;
}
