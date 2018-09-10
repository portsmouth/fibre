precision highp float;

uniform sampler2D Fluence;
uniform float invNumRays;
uniform float exposure;
uniform float invGamma;

in vec2 vTexCoord;
out vec4 outputColor;


void main() 
{
	// Read normalized fluence and time delay (integrated along primary rays)
	vec4 image = float(invNumRays) * texture(Fluence, vTexCoord);
	vec3 fluence = image.rgb;
	vec3 emission = fluence ;

	// Apply exposure 
	float gain = pow(2.0, exposure);
	float r = gain*emission.x; 
	float g = gain*emission.y; 
	float b = gain*emission.z;
	
	// Reinhard tonemap
	vec3 C = vec3(r/(1.0+r), g/(1.0+g), b/(1.0+b));

	// Apply gamma
	C = pow(C, vec3(invGamma));

	outputColor = vec4(C, 1.0);
}
