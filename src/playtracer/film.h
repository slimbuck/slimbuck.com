
#ifndef INCLUDED_FILM
#define INCLUDED_FILM

#include <image.h>

// Digital film
class Film
{
public:
    Film() = default;

    // target image
    Film(const mega::math::Vec2i &dimensions);

    Film &operator = (const Film &rhs) = default;

    const mega::math::Vec2i &dimensions() const { return dimensions_; }
    float aspect() const { return aspect_; }

private:
    mega::math::Vec2i dimensions_ = mega::math::Vec2i(0);
    float aspect_ = 0;
};

inline
Film::Film(const mega::math::Vec2i &dimensions)
    :   dimensions_(dimensions)
        , aspect_((float)dimensions[0] / dimensions[1])
{
}

#endif      // INCLUDED_FILM

