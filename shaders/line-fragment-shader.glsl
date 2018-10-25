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
        float dotTL = dot(T, L);
        float sinTL = sqrt(max(0.0, 1.0 - dotTL*dotTL));
        float dotTE = dot(T, -V);
        float sinTE = sqrt(max(0.0, 1.0 - dotTE*dotTE));
        vec4 diffuse = vColor * sinTL;
        vec4 specular = vec4(hairSpecColor, 1) * pow(abs(-dotTL*dotTE + sinTL*sinTE), hairShine);
        outputColor = diffuse + specular;
    }
    else
    {
        outputColor = vColor;
    }
}
