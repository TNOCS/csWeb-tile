/**
 * Simple test to open an mbtiles file and to generate TileJSON info object (available at index.json).
 */
require('sqlite3').verbose();
var http = require('http');
var path = require('path');
var express = require('express');
var MBTiles = require('mbtiles');
// Point this to an mbtiles file (you can download them from http://osm2vectortiles.org)
var sourceURI = '/dev/web/cs/csWeb-tile/tilesources/tm2/world.tm2/world.mbtiles';
// TODO Would it help if we use compression?
var app = express();
app.disable('x-powered-by');
app.set('port', 9000);
var world;
new MBTiles(sourceURI, function (err, mbtiles) {
    if (err)
        throw err;
    world = mbtiles;
});
var tilePattern = "/:z/:x/:y.pbf";
var populateHeaders = function (headers, params, extras) {
    Object.keys(extras || {}).forEach(function (k) {
        params[k] = extras[k];
    });
    // Object.keys(templates).forEach(function(name) {
    //     var val = templates[name](params);
    //     if (val) {
    //         headers[name.toLowerCase()] = val;
    //     }
    // });
    return headers;
};
app.get('/index.json', function (req, res, next) {
    var params = {
        tileJSON: true
    };
    world.getInfo(function (err, tileSourceInfo) {
        if (err)
            throw err;
        var info;
        info = {};
        Object.keys(tileSourceInfo).forEach(function (key) {
            info[key] = tileSourceInfo[key];
        });
        info.format = 'pbf';
        if (info.vector_layers) {
            info.format = 'pbf';
        }
        info.name = info.name || 'Untitled';
        info.center = info.center || [-122.4440, 37.7908, 12];
        info.bounds = info.bounds || [-180, -85.0511, 180, 85.0511];
        info.format = info.format || 'png';
        info.minzoom = Math.max(0, info.minzoom | 0);
        info.maxzoom = info.maxzoom || Infinity;
        var uri = ('http://' + req.headers['host'] + (path.dirname(req.originalUrl) + '/{z}/{x}/{y}.pbf').replace(/\/+/g, '/'));
        info.tiles = [uri];
        info.tilejson = '2.0.0';
        res.set(populateHeaders({}, params, { 200: true }));
        return res.send(info);
    });
});
app.get(tilePattern, function (req, res, next) {
    var z = +req.params.z, x = +req.params.x, y = +req.params.y;
    world.getTile(z, x, y, function (err, data, headers) {
        if (err || data == null) {
            return res.status(404).send('Not found');
        }
        else {
            res.set(headers);
            return res.status(200).send(data);
        }
    });
});
http.createServer(app).listen(app.get('port'), function () {
    console.log('Express server listening on port ' + app.get('port'));
});
//# sourceMappingURL=mbtiles_test.js.map