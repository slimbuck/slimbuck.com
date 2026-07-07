
var PlaytracerClient = function () {
    this.worker = null;
    this.scene = null;
    this.id = 0;
    this.handlers = { };
};

PlaytracerClient.prototype = {

    _onmessage: function (e) {
        const handler = this.handlers[e.data.id];
        delete this.handlers[e.data.id];
        handler.resolve(e.data.payload);
    },

    _post: function (type, payload, resolve, reject, transfer) {
        this.handlers[this.id] = {
            resolve: resolve,
            reject: reject
        };
        this.worker.postMessage( {
            type: type,
            id: this.id++,
            payload: payload
        }, transfer);
    },

    // initialize worker
    init: function (workerUrl, moduleUrl) {
        return new Promise((resolve, reject) => {
            this.worker = new Worker(workerUrl);
            this.worker.onmessage = PlaytracerClient.prototype._onmessage.bind(this);
            this._post('init', moduleUrl, resolve, reject );
        });
    },

    // terminate worker
    terminate: function () {
        return new Promise((resolve, reject) => {
            this.worker.terminate();
            resolve();
        });
    },

    // set the scene
    setScene: function (scene) {
        return new Promise((resolve, reject) => {
            this.scene = scene;
            this._post('setScene', this.scene, resolve, reject);
        });
    },

    redare: function (tileX, tileY, tileWidth, tileHeight, buffer) {
        return new Promise((resolve, reject) => {
            this._post( 'redare',
                        {
                            tileX: tileX,
                            tileY: tileY,
                            tileWidth: tileWidth,
                            tileHeight: tileHeight,
                            buffer: buffer
                        },
                        resolve,
                        reject,
                        [ buffer ]);
        });
    },
};

// convenience for a set of tracer workers
const PlaytracerClients = function (numClients) {
    this.clients = [];
    for (var i=0; i<numClients; ++i) {
        this.clients.push(new PlaytracerClient());
    }

    this.buffers = [];
    this.jobs = [];
}

PlaytracerClients.prototype = {
    init: async function(workerUrl, moduleUrl) {
        await Promise.all(this.clients.map(client =>
            client.init(workerUrl, moduleUrl)));
    },

    terminate: async function() {
        await Promise.all(this.clients.map(client =>
            client.terminate()));
    },

    setScene: async function (scene) {
        await Promise.all(this.clients.map(client =>
            client.setScene(scene)));
    },

    redare: async function (context, tileWidth, tileHeight, jobs) {

        const self = this;

        const doJob = async function (client) {
            while (self.jobs.length > 0) {
                const job = self.jobs.splice(0, 1)[0];
                const buffer = self._allocBuffer(tileWidth, tileHeight);
                const result = await client.redare(job.tileX,
                                                   job.tileY,
                                                   tileWidth,
                                                   tileHeight,
                                                   buffer);
                const bufferIn = new Uint8ClampedArray(result.buffer,
                                                       0,
                                                       tileWidth * tileHeight * 4);
                const imageData = new ImageData(bufferIn, tileWidth, tileHeight);
                context.putImageData(imageData, result.tileX, result.tileY);
                self._freeBuffer(result.buffer);
            }
        };

        this.jobs = jobs;

        await Promise.all(this.clients.map(client =>
            doJob(client)));
    },

    _allocBuffer: function (tileWidth, tileHeight) {
        if (this.buffers.length === 0) {
            return new ArrayBuffer(tileWidth * tileHeight * 4);
        } else {
            return this.buffers.splice(0, 1)[0];
        }
    },

    _freeBuffer: function (buffer) {
        this.buffers.push(buffer);
    }
};

