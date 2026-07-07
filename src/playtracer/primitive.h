
#ifndef INCLUDED_PRIMITIVE
#define INCLUDED_PRIMITIVE

#include <types.h>

struct PrimitiveType
{
    enum Enum
    {
        Sphere,
        Triangle
    };
};

struct Primitive
{
    unsigned int data;          // sphere: x, y, z, r
    unsigned short material;
    unsigned short type;
};

#endif      // INCLUDED_PRIMITIVE

