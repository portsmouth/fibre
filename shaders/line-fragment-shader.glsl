precision highp float;

in vec3 vColor; // user color
in vec3 T;      // tangent
in vec3 D;      // local offset (from axis to surface)
in float t;     // integration parameter 

uniform vec3 V;
uniform bool hairShader;
uniform float specShine;
uniform vec3 specColor;

out vec4 outputColor;

uniform vec3 L1;
uniform vec3 L2;
uniform vec3 C1;
uniform vec3 C2;

const float epsilon = 1.0e-7;

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
