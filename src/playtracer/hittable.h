
#ifndef INCLUDED_HITTABLE
#define INCLUDED_HITTABLE

#include <hitrecord.h>

class Hittable
{
public:
    virtual bool hit(HitRecord &hitRecord,
                     const Ray3 &ray,
                     float tMin,
                     float tMax) = 0;
};

#endif      // INCLUDED_HITTABLE

