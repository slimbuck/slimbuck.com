
const canvas = document.getElementById('glCanvas');
const log = document.getElementById('log');
const width = canvas.width;
const height = canvas.height;

const scene = {
    width: width,
    height: height,
    samples: 1,
    threads: 1,
    camera: {
        position: [16, 2, 4],
        target: [4, 1, 1.5],
        up: [0, 1, 0],
        fov: 16,
        aperture: 0.002,
    },
    materials: [
        {
            type: 'diffuse',
            colour: [0.5, 0.5, 0.5]
        }, {
            type: 'dialectric',
            colour: [0, 0, 0],
            indexOfRefraction: 1.5
        }, {
            type: 'diffuse',
            colour: [0.4, 0.2, 0.1],
        }, {
            type: 'metal',
            colour: [0.7, 0.6, 0.5],
            fuzziness: 0
        }
    ],
    spheres: [
        {
            position: [0, -1000, 0],
            radius: 1000,
            material: 0
        }, {
            position: [0, 1, 0],
            radius: 1,
            material: 1
        }, {
            position: [-4, 1, 0],
            radius: 1,
            material: 2
        }, {
            position: [4, 1, 0],
            radius: 1,
            material: 3
        }
    ]
};

// add random spheres
for (var j=-11; j<11; ++j) {
    for (var i=-11; i<11; ++i) {
        const r = Math.random;
        const mat_r = r();
        const mat =
               mat_r < 0.8 ? { type: 'diffuse', colour: [ r()*r(), r()*r(), r()*r() ] }
            : (mat_r < 0.95 ? { type: 'metal', colour: [ (1+r()) * 0.5, (1+r()) * 0.5, (1+r()) * 0.5 ], fuzziness: 0.5 * Math.random() }
            : { type: 'dialectric', colour: [ 0, 0, 0 ], indexOfRefraction: 1.5 } )

        scene.spheres.push({
            position: [
                i + 0.9 * Math.random(),
                0.2,
                j + 0.9 * Math.random()
            ],
            radius: 0.2,
            material: scene.materials.length
        });
        scene.materials.push(mat);
    }
}

const tileWidth = 50;
const tileHeight = 50;
const ctx = canvas.getContext('2d');

var render = null;

const init = async function () {

    const createClients = async function (numWorkers) {
        const start = performance.now();
        const clients = new PlaytracerClients(numWorkers);
        await clients.init('playtracer_worker.js', 'playtracer.wasm');
        console.log('startup time=' + ((performance.now() - start) * 1e-03) + 's');
        return clients;
    };

    var clients = null;

    render = async function (samples, threads) {
        // validate samples and threads
        samples = parseInt(samples);
        samples = isNaN(samples) ? 1 : Math.min(512, Math.max(1, samples));

        threads = parseInt(threads);
        threads = isNaN(threads) ? 1 : Math.min(32, Math.max(1, threads));

        // reinit clients if thread count changed
        if (clients === null || threads != clients.clients.length) {
            if (clients) {
                await clients.terminate();
            }
            clients = await createClients(threads);
        }

        // build list of render jobs, one per tile
        const renderJobs = [];
        for (var y=0; y<height/tileHeight; y++) {
            for (var x=0; x<width/tileWidth; x++) {
                renderJobs.push({
                    tileX: x * tileWidth,
                    tileY: y * tileHeight
                });
            }
        }

        // distance from center order
        var tileDist = function (tile) {
            var x = tile.tileX - width / 2;
            var y = tile.tileY - height / 2;
            return x * x + y * y;
        };
        renderJobs.sort(function (a, b) {
            var a = tileDist(a);
            var b = tileDist(b);
            return a < b ? -1 : (a > b ? 1 : 0);
        });

        // random shuffle tile order
        /*
        for (var i=0; i<renderJobs.length; ++i) {
            var swp = Math.floor(Math.random() * (renderJobs.length - i));
            var tmp = renderJobs[swp];
            renderJobs[swp] = renderJobs[i];
            renderJobs[i] = tmp;
        }
        */

        log.value = "Rendering scene with samples=" + samples + " threads=" + threads + "...\n";

        const startTime = performance.now();

        // set the scene
        scene.samples = samples;
        scene.threads = threads;
        await clients.setScene(scene);

        // clear the canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        //  render
        await clients.redare(ctx, tileWidth, tileHeight, renderJobs);

        // update log
        log.value += "Finished in time=" + (performance.now() - startTime) * 1e-03 + "s\n";
    };

    render(1, 1);
};

init();