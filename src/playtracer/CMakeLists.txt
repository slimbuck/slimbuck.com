cmake_minimum_required(VERSION 3.0)

project(playtracer_js)

if (EMSCRIPTEN)
    set(CMAKE_CXX_STANDARD 11)

    add_executable(
        playtracer.wasm
        redare.cpp
        image.cpp
        film.cpp
        camera.cpp
        scene.cpp
        hitrecord.cpp
        types.cpp)

# target_compile_definitions(playtracer.wasm PRIVATE NDEBUG)
# target_compile_options(playtracer.wasm PRIVATE -O3)
    target_include_directories(playtracer.wasm PRIVATE . mega/src)

    set(flags "-Os \
-s TOTAL_MEMORY=12582912 \
-s ERROR_ON_UNDEFINED_SYMBOLS=0 \
-s EXPORTED_FUNCTIONS=\
'[\"_setScene\",\
\"_redare\",\
\"_totalMaterials\",\
\"_totalPrimitives\",\
\"_totalFloatData\",\
\"_materials\",\
\"_primitives\",\
\"_floatData\",\
\"_output\"]'")

    set_target_properties(playtracer.wasm PROPERTIES
        OUTPUT_NAME "playtracer"
        SUFFIX ".wasm"
        LINK_FLAGS "${flags}"
        COMPILE_FLAGS "${flags}")
endif()
