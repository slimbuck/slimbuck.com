
#ifndef INCLUDED_IMAGE
#define INCLUDED_IMAGE

#include <math/vec.h>
#include <cstddef>

template <typename T>
class Image
{
public:
    Image() = default;
    Image(const mega::math::Vec2i &dimensions,
          T *data,
          size_t stride=0);

    Image<T> &operator = (const Image<T> &rhs) = default;

    const mega::math::Vec2i &dimensions() const;
    const T &at(int x, int y) const;
    T &at(int x, int y);
    size_t stride() const;

private:
    mega::math::Vec2i dimensions_ = mega::math::Vec2i(0);
    T *data_ = nullptr;
    size_t stride_ = 0;
};

template <typename T>
Image<T>::Image(const mega::math::Vec2i &dimensions,
                T *data,
                size_t stride)
    :   dimensions_(dimensions)
        , data_(data)
        , stride_(stride == 0 ? dimensions[0] : stride)
{

}

template <typename T>
const mega::math::Vec2i &Image<T>::dimensions() const
{
    return dimensions_;
}

template <typename T>
const T &Image<T>::at(int x, int y) const
{
    return data_[y * stride_ + x];
}

template <typename T>
T &Image<T>::at(int x, int y)
{
    return data_[y * stride_ + x];
}

template <typename T>
size_t Image<T>::stride() const
{
    return stride_;
}

#endif      // INCLUDED_IMAGE

