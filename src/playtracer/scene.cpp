
#include <scene.h>
#include <redare.h>
#include <math/intersection.h>

using namespace mega::math;

Scene::Scene(const SceneData &sceneData)
    :   sceneData_(sceneData)
{
    /*
    int i;
    const float *data = sceneData.floatData;

    // print out scene data
    for (i=0; i<sceneData.numMaterials; ++i)
    {
        auto &m = sceneData.materials[i];
        log("material=%d data=%d type=%d clr=[%f,%f,%f]",
                i, m.data, m.type, data[m.data], data[m.data+1], data[m.data+2]);
    }

    for (i=0; i<sceneData.numPrimitives; ++i)
    {
        auto &p = sceneData.primitives[i];
        log("primitive=%d data=%d material=%d type=%d pos=[%f,%f,%f] radius=%f",
                i, p.data, p.material, p.type,
                data[p.data], data[p.data+1], data[p.data+2], data[p.data+3]);
    }
    //*/
}

bool Scene::hit(HitRecord &result,
                const Ray3 &ray) const
{
    const Inter3::RayInter rayInter(ray);
    const float tmin = 1e-03;
    float tmax = 1e+06;
    int found = -1;

    for (int i=0; i<sceneData_.numPrimitives; ++i)
    {
        auto &prim = primitive(i);
        auto &s = sphere3(prim.data);

        if (Inter3::test(s, rayInter, tmin, tmax))
        {
            found = i;
        }
    }

    if (found < 0)
    {
        return false;
    }

    auto &prim = primitive(found);
    auto &s = sphere3(prim.data);

    // calculate surface
    Inter3::Surface surface;
    Inter3::calcSurface(s, rayInter, tmax, surface);

    result.t = tmax;
    result.p = surface.position;
    result.n = surface.normal;
    result.primitive = found;

    return true;
}

