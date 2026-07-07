
#ifndef INCLUDED_SCENE
#define INCLUDED_SCENE

#include <types.h>
#include <material.h>
#include <primitive.h>
#include <hitrecord.h>

struct SceneData
{
    uint32_t numMaterials;
    uint32_t numPrimitives;
    uint32_t numFloatData;
    Material *materials;
    Primitive *primitives;
    float *floatData;
};

class Scene
{
public:
    Scene() = default;
    Scene(const SceneData &sceneData);
    Scene &operator = (const Scene &rhs) = default;

    bool hit(HitRecord &hitRecord,
             const Ray3 &ray) const;

    const Material &material(int index) const { return sceneData_.materials[index]; }
    const Primitive &primitive(int index) const { return sceneData_.primitives[index]; }
    const float *floatData() const { return sceneData_.floatData; }

    const Sphere3 &sphere3(int index) const { return *(const Sphere3 *) (floatData() + index); }
    const Vec3 &vec3(int index) const { return *(const Vec3 *) (floatData() + index); }

    const Vec3 &materialClr(int index) const { return vec3(material(index).data); }

private:
    SceneData sceneData_;
};

#endif      // INCLUDED_SCENE

