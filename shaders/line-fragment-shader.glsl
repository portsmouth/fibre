precision highp float;

in vec4 vColor; // user color
in vec3 T;      // tangent
in vec3 D;      // local offset (from axis to surface)
in float t;     // integration parameter 

uniform vec3 V;
uniform float specShine;
uniform vec3 specColor;

out vec4 outputColor;

#define oos3 0.57735026919
const vec3 L = vec3(0, 1, 0); //oos3, oos3, oos3);

void main()
{
    vec3 N = normalize(D);
    float dotTL = dot(T, L);
    float sinTL = sqrt(max(0.0, 1.0 - dotTL*dotTL));
    float dotTE = dot(T, -V);
    float sinTE = sqrt(max(0.0, 1.0 - dotTE*dotTE));
    vec3 diffuse = vColor.rgb * sinTL * max(0.0, dot(L, N));                     // kajiya-kay diffuse
    vec3 specular = specColor * pow(abs(-dotTL*dotTE + sinTL*sinTE), specShine); // kajiya-kay spec
    outputColor.rgb = diffuse + specular;
    outputColor.w = t;
}
