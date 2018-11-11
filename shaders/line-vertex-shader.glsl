precision highp float;

uniform sampler2D PosDataA;
uniform sampler2D PosDataB;
uniform sampler2D RgbDataA;
uniform sampler2D RgbDataB;
uniform sampler2D EdgDataA;
uniform sampler2D EdgDataB;
uniform sampler2D OffData;
uniform mat4 u_projectionMatrix;
uniform mat4 u_modelViewMatrix;
uniform bool tubeSpread;

in vec3 TexCoord;

out vec3 vColor;  // user color
out vec3 T;       // tangent
out vec3 D;       // local offset (from axis to surface)
out float t;      // integration parameter 

void main()
{
    // Textures A and B contain line segment start and end points respectively
    // (i.e. the geometry defined by this vertex shader is stored in textures)
    vec4 posA   = texture(PosDataA, TexCoord.xy);
    vec4 posB   = texture(PosDataB, TexCoord.xy);
    vec3 colorA = texture(RgbDataA, TexCoord.xy).xyz;
    vec3 colorB = texture(RgbDataB, TexCoord.xy).xyz;
    vec3 edgA   = texture(EdgDataA, TexCoord.xy).xyz;
    vec3 edgB   = texture(EdgDataB, TexCoord.xy).xyz;
    vec3 offset = texture(OffData,  TexCoord.xy).xyz;

    // Line segment vertex position (either posA or posB)
    vec3 pos = mix(posA.xyz, posB.xyz, TexCoord.z);
    if (!tubeSpread)
    {
        pos += offset;
    }

    gl_Position = u_projectionMatrix * u_modelViewMatrix * vec4(pos, 1.0);
    vColor = mix(colorA, colorB, TexCoord.z);
    t = mix(posA.w, posB.w, TexCoord.z);
    T = mix(edgA, edgB, TexCoord.z);
    D = offset;


}

