var tilelive = require('tilelive');
require('tilelive-mapnik').registerProtocols(tilelive);
tilelive.load('mapnik:///mainroad.xml', function (err, source) {
    if (err)
        throw err;
    // Interface is in XYZ/Google coordinates.
    // Use `y = (1 << z) - 1 - y` to flip TMS coordinates.
    source.getTile(0, 0, 0, function (err, tile, headers) {
        // `err` is an error object when generation failed, otherwise null.
        // `tile` contains the compressed image file as a Buffer
        // `headers` is a hash with HTTP headers for the image.
    });
    // The `.getGrid` is implemented accordingly.
});
//# sourceMappingURL=test_mapnik.js.map