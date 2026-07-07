
const Playtracer = {
    init: function (wasmUrl, callback) {

        const Module = function () {
            this.module = null;
            this.memory = null;
            this.outputPtr = 0;
            this.exports = null;
            
            this.materialMem = null;
            this.primitiveMem = null;
            this.floatDataMem = null;

            this.numMaterials = 0;
            this.numPrimitives = 0;
            this.numLights = 0;
            this.numFloatData = 0;

            this.width = 0;
            this.height = 0;
            this.samples = 0;

            this._imports = {
                mylog: Module.prototype.log.bind(this)
            };
        };

        Object.assign(Module, {
            materialType: {
                'diffuse': 0,
                'metal': 1,
                'dialectric': 2
            },
        });

        const materialSize = 2;
        const primitiveSize = 2;
        const floatDataSize = 1;

        Module.prototype = {

            log: function (index) {
                var memory = new Uint8Array(this.memory.buffer);
                var end = index;
                while (memory[end] !== 0) {
                    end++;
                }
                var s = Array.from(memory.slice(index, end))
                            .map(c => String.fromCharCode(c)).join('');
                console.log(s);
            },

            // reset the scene
            reset: function () {
                this.numMaterials = 0;
                this.numPrimitives = 0;
                this.numLights = 0;
                this.numFloatData = 0;
            },

            // convert scene
            setScene: function (scene) {
                this.reset();

                // convert scene
                const camera = scene.camera;
                this.addFloat3(camera.position[0], camera.position[1], camera.position[2]);
                this.addFloat3(camera.target[0], camera.target[1], camera.target[2]);
                this.addFloat3(camera.up[0], camera.up[1], camera.up[2]);
                this.addFloat(camera.fov);
                this.addFloat(camera.aperture);

                // convert materials
                for (var i=0; i<scene.materials.length; ++i) {
                    const material = scene.materials[i];
                    switch (material.type) {
                        case 'diffuse':
                            this.addMaterial(
                                material.type,
                                material.colour[0],
                                material.colour[1],
                                material.colour[2]);
                            break;
                        case 'metal':
                            this.addMaterial(
                                material.type,
                                material.colour[0],
                                material.colour[1],
                                material.colour[2],
                                material.fuzziness);
                            break;
                        case 'dialectric':
                            this.addMaterial(
                                material.type,
                                material.colour[0],
                                material.colour[1],
                                material.colour[2],
                                material.indexOfRefraction);
                            break;
                    }
                }

                // convert spheres
                for (var i=0; i<scene.spheres.length; ++i) {
                    const sphere = scene.spheres[i];
                    this.addSphere(
                        sphere.position[0],
                        sphere.position[1],
                        sphere.position[2],
                        sphere.radius,
                        sphere.material);
                }

                this.exports.setScene(
                    scene.width,
                    scene.height,
                    scene.samples,
                    0,          // assume camera settings we set at float 0
                    this.numMaterials/materialSize,
                    this.numPrimitives/primitiveSize,
                    this.numFloatData/floatDataSize);

                this.width = scene.width;
                this.height = scene.height;
                this.samples = scene.samples;
            },

            addFloat: function (x) {
                this.floatDataMem[this.numFloatData++] = x;
            },

            addFloat3: function (x, y, z) {
                this.floatDataMem[this.numFloatData++] = x;
                this.floatDataMem[this.numFloatData++] = y;
                this.floatDataMem[this.numFloatData++] = z;
            },

            addFloat4: function (x, y, z, w) {
                this.floatDataMem[this.numFloatData++] = x;
                this.floatDataMem[this.numFloatData++] = y;
                this.floatDataMem[this.numFloatData++] = z;
                this.floatDataMem[this.numFloatData++] = w;
            },

            addMaterial: function (type, r, g, b, fuzziness) {
                this.materialMem[this.numMaterials++] = this.numFloatData;
                this.materialMem[this.numMaterials++] = Module.materialType[type] || 0;      // diffuse
                this.addFloat4(r, g, b, fuzziness || 0);
            },

            addSphere: function (x, y, z, r, material) {
                this.primitiveMem[this.numPrimitives++] = this.numFloatData;
                this.primitiveMem[this.numPrimitives++] = material;
                this.addFloat4(x, y, z, r);
            },

            render: function (tileX, tileY, tileWidth, tileHeight) {
                this.exports.redare(tileX, tileY, tileWidth, tileHeight);
            },
        };

        const module = new Module();

        const onModuleLoaded = function (m) {
            //console.log(m);

            module.module = m;
            module.exports = m.instance.exports;
            module.memory = module.exports.memory;
            module.outputPtr = module.exports.output();

            var ex = module.exports;

            module.materialMem =
                new Uint32Array(module.memory.buffer,
                                ex.materials(),
                                ex.totalMaterials() * materialSize);

            module.primitiveMem =
                new Uint32Array(module.memory.buffer,
                                ex.primitives(),
                                ex.totalPrimitives() * primitiveSize);

            module.floatDataMem =
                new Float32Array(module.memory.buffer,
                                 ex.floatData(),
                                 ex.totalFloatData() * floatDataSize);

            callback(module);
        };

        if (WebAssembly.instantiateStreaming) {
            WebAssembly.instantiateStreaming(
                fetch(wasmUrl),
                { env: module._imports })
            .then(onModuleLoaded);
        } else {
            fetch(wasmUrl).then(response =>
                response.arrayBuffer()
            ).then(bytes =>
                WebAssembly.instantiate(bytes, { env: module._imports })
            ).then(onModuleLoaded);
        }
    }
};

var playtracer;

onmessage = function (e) {
    switch (e.data.type) {
        case 'init':
            Playtracer.init(e.data.payload, function (playtracerInstance) {
                playtracer = playtracerInstance;
                postMessage({ type: 'ready', id: e.data.id });
            });
            break;

        case 'setScene':
            //console.log(JSON.stringify(e.data.scene));
            playtracer.setScene(e.data.payload);
            postMessage({ type: 'setSceneDone', id: e.data.id });
            break;

        case 'redare':
            const payload = e.data.payload;
            const tx = payload.tileX;
            const ty = payload.tileY;
            const tw = payload.tileWidth;
            const th = payload.tileHeight;
            const buffer = payload.buffer;

            // render
            playtracer.render(tx, ty, tw, th);

            // copy out result
            const inb = new Uint32Array(playtracer.memory.buffer, playtracer.outputPtr, tw * th);
            const outb = new Uint32Array(buffer);
            outb.set(inb);

            // return result
            postMessage({
                type: 'redareDone',
                id: e.data.id,
                payload: {
                    tileX: tx,
                    tileY: ty,
                    tileWidth: tw,
                    tileHeight: th,
                    buffer: buffer
                }
            }, [ buffer ]);

            break;
    }
}

