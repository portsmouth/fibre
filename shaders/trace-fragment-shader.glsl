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
