
#ifndef INCLUDED_CAMERA
#define INCLUDED_CAMERA

#include <redare.h>
#include <math/vec.h>

struct Camera
{
    typedef mega::math::Vec3 Vec3;

    Camera() = default;
    Camera(const Vec3 &lookFrom
         , const Vec3 &lookAt
         , const Vec3 &up
         , float verticalFov
         , float aspect
         , float aperture);
    Camera &operator = (const Camera &rhs) = default;

    Vec3 lookFrom_ = Vec3(0);
    Vec3 lookAt_ = Vec3(0);
    Vec3 up_ = Vec3(0);
    float verticalFov_ = 0;
    float aspect_ = 0;
    float aperture_ = 0;
    float focusDist_ = 0;

    // derived
    Vec3 horizontal_ = Vec3(0);
    Vec3 vertical_ = Vec3(0);
    Vec3 lowerLeft_ = Vec3(0);
};

inline
Camera::Camera(const Vec3 &lookFrom
             , const Vec3 &lookAt
             , const Vec3 &up
             , float verticalFov
             , float aspect
             , float aperture)
    :   lookFrom_(lookFrom)
        , lookAt_(lookAt)
        , up_(up)
        , verticalFov_(verticalFov)
        , aspect_(aspect)
        , aperture_(aperture)
{
    const Vec3 forward(Normalize(lookAt - lookFrom));
    const Vec3 right(Normalize(CrossProduct(forward, up_)));
    const Vec3 up2(CrossProduct(right, forward));
    const float focusDist = Length(lookAt - lookFrom);
    const float h = tan(0.5 * verticalFov) * focusDist;

    // calculate derived members
    horizontal_ = right * (h * 2.0f * aspect_);
    vertical_ = up2 * (h * -2.0f);
    lowerLeft_ = forward * focusDist - horizontal_ * 0.5f - vertical_ * 0.5f;

    /*
    log("forward=[%f,%f,%f] right=[%f,%f,%f] up=[%f,%f,%f]",
            forward_[0], forward_[1], forward_[2],
            right_[0], right_[1], right_[2],
            up_[0], up_[1], up_[2]);
    //*/
}

#endif      // INCLUDED_CAMERA

