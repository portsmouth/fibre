precision highp float;

uniform sampler2D Fluence;
uniform float invNpasses;
uniform float time;
uniform bool dashes;
uniform float dash_spacing;
uniform float dash_size;
uniform float dash_speed;
uniform vec3 bg_color;
uniform bool subtractive_color;

uniform float exposure;
uniform float invGamma;
uniform float contrast;
uniform float saturation;

in vec2 vTexCoord;
out vec4 outputColor;

float toneMap(float L)
{
  return L / (1.0 + L);
}

void main() 
{
    // Read normalized fluence and time
    vec4 image = float(invNpasses) * texture(Fluence, vTexCoord);
    vec3 RGB = image.rgb;

    // Apply gamma
    RGB = pow(RGB, vec3(invGamma));

    float gain = pow(2.0, exposure);
    float r = gain*RGB.x; 
    float g = gain*RGB.y; 
    float b = gain*RGB.z;

    // apply tonemapping
    RGB *= pow(2.0, exposure);
    float R = RGB.r;
    float G = RGB.g;
    float B = RGB.b;
    R = toneMap(R);
    G = toneMap(G);
    B = toneMap(B);

    // apply saturation
    float mean = (R + G + B)/3.0;
    float dR = R - mean;
    float dG = G - mean;
    float dB = B - mean;
    R = mean + sign(dR)*pow(abs(dR), 1.0/saturation);
    G = mean + sign(dG)*pow(abs(dG), 1.0/saturation);
    B = mean + sign(dB)*pow(abs(dB), 1.0/saturation);

    // apply contrast
    dR = R - 0.5;
    dG = G - 0.5;
    dB = B - 0.5;
    R = 0.5 + sign(dR)*pow(abs(dR), 1.0/contrast);
    G = 0.5 + sign(dG)*pow(abs(dG), 1.0/contrast);
    B = 0.5 + sign(dB)*pow(abs(dB), 1.0/contrast);

    vec3 C = vec3(R,G,B);

    // Optionally render moving dashes
    float modulation = 1.0;
    if (dashes)
    {
        float t = image.w;
        modulation = smoothstep(1.0 - 2.0*dash_size, 1.0, cos(t/dash_spacing - dash_speed*time));
        C *= modulation;
    }

    // Generate final pixel color
    if (!subtractive_color)
    {
        outputColor = vec4(bg_color + C, 1.0);
    }
    else
    {
        vec3 T = exp(-C);
        outputColor = vec4(bg_color * T, 1.0);
    }
}
