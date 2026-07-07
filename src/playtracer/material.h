
#ifndef INCLUDED_MATERIAL
#define INCLUDED_MATERIAL

#include <types.h>

struct MaterialType
{
    enum Enum
    {
        Diffuse,
        Metal,
        Dialectric
    };
};

struct Material
{
    unsigned int data;      // clr.rgb, fuzziness
    unsigned int type;
};

#endif      // INCLUDED_MATERIAL

