// CloudFront Function (viewer-request) for a static site served from an S3
// REST origin, which does not resolve directory URLs or index documents.
//
// - "/blog/"      -> "/blog/index.html"
// - "/some/path"  -> "/some/path/index.html"   (extension-less paths)
// - "/style.css"  -> unchanged                 (has a file extension)
function handler(event) {
    var request = event.request;
    var uri = request.uri;
    if (uri === '/apps/chirky' || uri.indexOf('/apps/chirky/') === 0) {
        var suffix = uri === '/apps/chirky' ? '' : uri.substring('/apps/chirky/'.length);
        var query = [];
        Object.keys(request.querystring || {}).forEach(function (key) {
            var entry = request.querystring[key];
            (entry.multiValue || [entry]).forEach(function (item) {
                query.push(key + '=' + item.value);
            });
        });
        return { statusCode: 301, statusDescription: 'Moved Permanently', headers: {
            location: { value: 'https://chirky.org/' + suffix + (query.length ? '?' + query.join('&') : '') }
        }};
    }

    if (uri.endsWith('/')) {
        request.uri = uri + 'index.html';
    } else {
        var lastSegment = uri.substring(uri.lastIndexOf('/') + 1);
        if (lastSegment.indexOf('.') === -1) {
            request.uri = uri + '/index.html';
        }
    }

    return request;
}
