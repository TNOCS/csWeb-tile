var path = require('path');
var fs = require('fs');
var tilelive = require('tilelive');
// Iterate over all sub-folders in sources.
// Each sub-folder's name needs to match the tilelive module name,
// e.g. all mbtiles need to be in the mbtiles sub folder, as that 
// is the name of the corresponding node package.
// Register each sub-folder name that is not empty
// In that folder, open all files.
/** Options */
var TileSourceOptions = (function () {
    function TileSourceOptions() {
        /** If true, set headers to enable CORRS. */
        this.corrs = true;
        /** source folder. If not set, uses ./sources */
        this.sources = path.join(__dirname, 'tilesources');
    }
    return TileSourceOptions;
})();
exports.TileSourceOptions = TileSourceOptions;
;
var TileSource = (function () {
    function TileSource(app, options) {
        var defaultOptions = new TileSourceOptions();
        if (!options)
            options = defaultOptions;
        // enable corrs
        if ((options && typeof options.corrs !== 'undefined' && options.corrs) || defaultOptions.corrs) {
            app.use(function (req, res, next) {
                res.header('Access-Control-Allow-Origin', '*');
                res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
                next();
            });
        }
        /** Folder that contains the source map files. */
        var tileFolder = options.sources || defaultOptions.sources;
        fs.readdir(tileFolder, function (err, protocols) {
            if (err) {
                console.log(("Error reading " + tileFolder + ": ") + err);
                return;
            }
            if (!protocols || protocols.length === 0) {
                console.log("No sources found in folder " + tileFolder + ".");
                return;
            }
            protocols.forEach(function (protocol) {
                require(protocol).registerProtocols(tilelive);
                console.log("Registering protocol " + protocol + ".");
                var sourceFolder = path.join(tileFolder, protocol);
                fs.readdir(sourceFolder, function (err, files) {
                    if (err) {
                        console.log('Error reading folder ' + protocol + ': ' + err);
                        return;
                    }
                    files.forEach(function (file) {
                        var sourceFile = path.join(sourceFolder, file);
                        tilelive.load('mbtiles://' + sourceFile, function (err, source) {
                            if (err) {
                                throw err;
                            }
                            console.log("Loading " + protocol + ": " + sourceFile);
                            var name = path.basename(file, '.' + protocol);
                            app.get('/' + name + '/:z/:x/:y.*', function (req, res) {
                                var z = +req.params.z;
                                var x = +req.params.x;
                                var y = +req.params.y;
                                //console.log('%s: get tile %d, %d, %d', mbSource, z, x, y);
                                source.getTile(z, x, y, function (err, tile, headers) {
                                    if (err) {
                                        res.status(404);
                                        res.send(err.message);
                                        console.log('Error getting %s: tile %d, %d, %d', sourceFile, z, x, y);
                                        console.log(err.message);
                                    }
                                    else {
                                        res.set(headers);
                                        res.send(tile);
                                    }
                                });
                            });
                        });
                    });
                });
            });
        });
    }
    return TileSource;
})();
exports.TileSource = TileSource;
//# sourceMappingURL=index.js.map