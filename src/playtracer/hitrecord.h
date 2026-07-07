
#ifndef INCLUDED_HITRECORD
#define INCLUDED_HITRECORD

#include <types.h>

struct HitRecord
{
    float t;
    Vec3 p;
    Vec3 n;
    int primitive;
};

#endif      // INCLUDED_HITRECORD

