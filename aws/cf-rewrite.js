// CloudFront Function (viewer-request) for a static site served from an S3
// REST origin, which does not resolve directory URLs or index documents.
//
// - "/blog/"      -> "/blog/index.html"
// - "/some/path"  -> "/some/path/index.html"   (extension-less paths)
// - "/style.css"  -> unchanged                 (has a file extension)
function handler(event) {
    var request = event.request;
    var uri = request.uri;

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
