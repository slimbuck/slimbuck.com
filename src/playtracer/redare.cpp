
#include <redare.h>
#include <image.h>
#include <film.h>
#include <camera.h>
#include <scene.h>
#include <material.h>
#include <primitive.h>

#include <base/helperfuncs.h>
#include <math/rand.h>

using namespace mega::math;

static const uint32_t maxTileSize = 128;

// image data

Vec3 s_imageData[maxTileSize * maxTileSize];
Vec4c s_exposedData[maxTileSize * maxTileSize];

// scene data

const unsigned int s_totalMaterials = 1024;
const unsigned int s_totalPrimitives = 1024 * 128;
const unsigned int s_totalFloatData = 1024 * 1024;
Material s_materials[s_totalMaterials];
Primitive s_primitives[s_totalPrimitives];
float s_floatData[s_totalFloatData];

// exports

extern "C"
{
    void setScene(uint32_t width,
                  uint32_t height,
                  uint32_t samples,
                  uint32_t cameraSettingsPtr,
                  uint32_t numMaterials,
                  uint32_t numPrimitives,
                  uint32_t numFloatData);
    int redare(int tileX, int tileY, int tileWidth, int tileHeight);
    unsigned int totalMaterials();
    unsigned int totalPrimitives();
    unsigned int totalFloatData();
    void *materials();
    void *primitives();
    void *floatData();
    void *output();

    // imports
    void mylog(const char *string);
}

// log

void log(const char *fmt, ...)
{
    static char buf[1024];
    va_list arg;
    va_start(arg, fmt);
    vsnprintf(buf, sizeof(buf), fmt, arg);
    va_end(arg);
    mylog(buf);
}

// generate background colour
void background(Vec3 &result
              , const Ray3 &ray)
{
    result = mega::lerp(Vec3(0.5f, 0.7f, 1.0f),
                        Vec3(1, 1, 1),
                        0.5f + Normalize(ray.direction)[1] * 0.5f);
}

// reflect a vector given the normal and dotproduct
Vec3 reflect(const Vec3 &v, const Vec3 &n, float vDotN)
{
    return v - n * (2.0f * vDotN);
}

// reflect the vector given a normal
Vec3 reflect(const Vec3 &v, const Vec3 &n)
{
    return reflect(v, n, DotProduct(v, n));
}

// refract a ray given the normal and fraction of the two material
// indexes of refraction
bool refract(Vec3 &result,
             const Vec3 &v,
             const Vec3 &n,
             float niOverNt)
{
    const Vec3 nv = Normalize(v);
    const float dv = DotProduct(nv, n);
    const float discriminant = 1.0 - niOverNt * niOverNt * (1.0 - dv * dv);
    if (discriminant <= 0)
        return false;
    result = (nv - n * dv) * niOverNt - n * sqrt(discriminant);
    return true;
}

// calculate approximation to reflectivity given cosine angle and index of refraction
float schlick(float cosine, float indexOfRefraction)
{
    float r0 = (1.0 - indexOfRefraction) / (1.0 + indexOfRefraction);
    r0 *= r0;
    return r0 + (1.0 - r0) * pow(1.0 - cosine, 5.0);
}

bool scatter(Ray3 &scattered,
             Vec3 &attenuation,
             const HitRecord &hitRecord,
             const Ray3 &ray,
             const Scene &scene)
{
    auto &primitive = scene.primitive(hitRecord.primitive);
    auto &material = scene.material(primitive.material);
    Vec3 tmp;

    switch (material.type)
    {
        case MaterialType::Diffuse:
        {
            Rand::pointInSphere(tmp);
            scattered.direction = hitRecord.n + tmp;
            scattered.origin = hitRecord.p;
            attenuation = *(Vec3 *)(scene.floatData() + material.data);
            return true;
        }

        case MaterialType::Metal:
        {
            const Vec3 &matAttenuation = (Vec3 &)scene.floatData()[material.data];
            const float &matFuzziness = scene.floatData()[material.data + 3];
            Rand::pointInSphere(tmp);
            scattered.direction = reflect(Normalize(ray.direction), hitRecord.n) +
                                    tmp * matFuzziness;
            scattered.origin = hitRecord.p;
            attenuation = matAttenuation;
            return DotProduct(scattered.direction, hitRecord.n) > 0;
        }

        case MaterialType::Dialectric:
        {
            const float &matIOR = scene.floatData()[material.data + 3]; // index of refraction

            const float dp = DotProduct(ray.direction, hitRecord.n);
            const bool pdp = dp > 0;
            const float niOverNt = pdp ? matIOR : 1.0 / matIOR;
            const float cosine = (pdp ? matIOR : -1.0) * dp / Length(ray.direction);
            const Vec3 outwardNormal = pdp ? -hitRecord.n : hitRecord.n;

            Vec3 refracted;
            const bool refractRes = refract(refracted, ray.direction, outwardNormal, niOverNt);
            const float reflectProb = refractRes ? schlick(cosine, matIOR) : 1.0;
            const bool doReflect = Rand::gen() < reflectProb;

            scattered.direction = doReflect ? reflect(ray.direction, hitRecord.n, dp) : refracted;
            scattered.origin = hitRecord.p;
            attenuation = Vec3(1.0);
            return true;
        }

        default:
        {
            return false;
        }
    }
}

void colour(Vec3 &result
          , const Ray3 &ray
          , const Scene &scene
          , int depth=0)
{
    HitRecord hitRecord;
    if (scene.hit(hitRecord, ray))
    {
        Ray3 scattered;
        Vec3 attenuation;
        if (depth < 50 && scatter(scattered, attenuation, hitRecord, ray, scene))
        {
            colour(result, scattered, scene, depth+1);
            result *= attenuation;
        }
        //*/
        //result = (hitRecord.n + Vec3(1)) * 0.5f;
    }
    else
    {
        background(result, ray);
    }
}

void generatePrimaryRay(Ray3 &result
                      , const Camera &camera
                      , float u
                      , float v)
{
    // calculate ray offset for camera defocus
    Vec2 r;
    Rand::pointInCircle(r);
    Vec3 offset = camera.horizontal_ * (camera.aperture_ * r[0]) +
                  camera.vertical_ * (camera.aperture_ * r[1]);

    result.origin = camera.lookFrom_ + offset;
    result.direction = camera.lowerLeft_
                        + camera.horizontal_ * u
                        + camera.vertical_ * v
                        - offset;
}

void gather(Image<Vec3> &tile
          , const Film &film
          , const Camera &camera
          , const Scene &scene
          , const int samples
          , const int tileX
          , const int tileY)
{
    const float invWidth = 1.0f / film.dimensions()[0];
    const float invHeight = 1.0f / film.dimensions()[1];
    const int tileWidth = tile.dimensions()[0];
    const int tileHeight = tile.dimensions()[1];
    const float invSamples = 1.0f / (float) samples;
    Ray3 ray;
    Vec3 sample;
    Vec3 accumulator;

    for (int y=0; y<tileHeight; ++y)
    {
        for (int x=0; x<tileWidth; ++x)
        {
            accumulator.clear();

            for (int s=0; s<samples; ++s)
            {
                float u = (float)(tileX + x + Rand::gen()) * invWidth;
                float v = (float)(tileY + y + Rand::gen()) * invHeight;

                generatePrimaryRay(ray, camera, u, v);
                colour(sample, ray, scene);
                accumulator += sample;
            }

            tile.at(x, y) = accumulator * invSamples;
        }
    }
}

void expose(Image<Vec4c> &result , const Image<Vec3> &source)
{
    if (source.dimensions() != result.dimensions())
        return;

    const int width = result.dimensions()[0];
    const int height = result.dimensions()[1];

    for (int y=0; y<height; ++y)
    {
        for (int x=0; x<width; ++x)
        {
            const Vec3 &input = source.at(x, y);
            result.at(x, y) =
                Vec4c((unsigned char)std::min(255.0, std::max(0.0, sqrt(input[0]) * 255.0)),
                      (unsigned char)std::min(255.0, std::max(0.0, sqrt(input[1]) * 255.0)),
                      (unsigned char)std::min(255.0, std::max(0.0, sqrt(input[2]) * 255.0)),
                      255);
        }
    }
}

Vec2i dimensions;
uint32_t samples;
Film film;
Camera camera;
Scene scene;

void setScene(uint32_t width,
              uint32_t height,
              uint32_t samples,
              uint32_t cameraSettingsPtr,
              uint32_t numMaterials,
              uint32_t numPrimitives,
              uint32_t numFloatData)
{
    dimensions = Vec2i(width, height);
    ::samples = samples;

    // construct ray tracing bits
    film = Film(dimensions);

    size_t idx = cameraSettingsPtr;
    const Vec3 &cameraFrom = (const Vec3&) s_floatData[idx];
    const Vec3 &cameraAt = (const Vec3&) s_floatData[idx+3];
    const Vec3 &cameraUp = (const Vec3&) s_floatData[idx+6];
    const float &cameraFov = s_floatData[idx+9];
    const float &cameraAperture = s_floatData[idx+10];

    camera = Camera(cameraFrom,
                    cameraAt,
                    cameraUp,
                    cameraFov * Constants::DegToRad,
                    film.aspect(),
                    cameraAperture);

    SceneData sceneData =
    {
        numMaterials,
        numPrimitives,
        numFloatData,
        s_materials,
        s_primitives,
        s_floatData
    };

    scene = Scene(sceneData);
}

Image<Vec3> tile;
Image<Vec4c> exposed;

int redare(int tileX, int tileY, int tileWidth, int tileHeight)
{
    // construct image storage
    Vec2i dims(tileWidth, tileHeight);
    tile = Image<Vec3>(dims, s_imageData);
    exposed = Image<Vec4c>(dims, s_exposedData);

    gather(tile, film, camera, scene, samples, tileX, tileY);
    expose(exposed, tile);
    return 0;
}

unsigned int totalMaterials() { return s_totalMaterials; }
unsigned int totalPrimitives() { return s_totalPrimitives; }
unsigned int totalFloatData() { return s_totalFloatData; }
void *materials() { return s_materials; }
void *primitives() { return s_primitives; }
void *floatData() { return s_floatData; }
void *output() { return s_exposedData; }

