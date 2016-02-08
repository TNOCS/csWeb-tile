var path = require('path');
var fs = require('fs');
var request = require('request');
var mkdirp = require('mkdirp');
var rmdir = require('rimraf');
var md5 = require('md5');
var tilelive = require('tilelive');
/** Options */
var TileSourceOptions = (function () {
    function TileSourceOptions() {
        /** If true, set headers to enable CORRS. */
        this.corrs = true;
        /** source folder. If not set, uses ./sources */
        this.sources = path.join(__dirname, 'tilesources');
        /** Path to the cache folder, if any. */
        this.cache = path.join(__dirname, 'cache');
    }
    return TileSourceOptions;
})();
exports.TileSourceOptions = TileSourceOptions;
;
var TileSource = (function () {
    function TileSource(app, options) {
        var _this = this;
        this.app = app;
        this.protocols = [];
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
        if (options.cache) {
            this.cacheFolder = options.cache;
            if (!fs.existsSync(this.cacheFolder)) {
                mkdirp(this.cacheFolder, function (err) {
                    if (err)
                        console.error('Error creating cache folder: ' + err);
                });
            }
        }
        if (options.tileSources) {
            // Source files are explicitly stated
            options.tileSources.forEach(function (source) {
                _this.load(source.protocol, source.path, source.fallbackUri, _this.pathIsAbsolute(source.path) ? '' : __dirname);
            });
        }
        else {
            // Folder that contains the source map files.
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
                    var sourceFolder = path.join(tileFolder, protocol);
                    fs.readdir(sourceFolder, function (err, files) {
                        if (err) {
                            console.log("Error reading folder " + protocol + ": " + err);
                            return;
                        }
                        files.forEach(function (file) { return _this.load(protocol, file, '', sourceFolder); });
                    });
                });
            });
        }
    }
    /** Register the protocol. */
    TileSource.prototype.registerProtocol = function (protocol) {
        if (this.protocols.indexOf(protocol) >= 0)
            return;
        this.protocols.push(protocol);
        switch (protocol) {
            case 'mapnik':
                require('tilelive-mapnik').registerProtocols(tilelive);
                break;
            default:
                require(protocol).registerProtocols(tilelive);
                break;
        }
        console.log("Registering protocol " + protocol + ".");
    };
    /**
     * Returns true if your path is absolute.
     * See http://stackoverflow.com/questions/21698906/how-to-check-if-a-path-is-absolute-or-relative
     */
    TileSource.prototype.pathIsAbsolute = function (yourPath) {
        return path.resolve(yourPath) === path.normalize(yourPath).replace(RegExp(path.sep + '$'), '');
    };
    /**
     * Load a file using the proper protocol.
     * NOTE: Only tested for mbtiles.
     *
     * @param  {string} protocol
     * @param  {string} file
     * @param  {string} fallbackUri If specified, used to redirect clients when a lookup fails
     * @param  {string} sourceFolder? Optional source folder. If not specified, the file is absolute.
     */
    TileSource.prototype.load = function (protocol, file, fallbackUri, sourceFolder) {
        var _this = this;
        this.registerProtocol(protocol);
        // var re = new RegExp('/[a-zA-Z\d]*\/(?<z>\d+)\/(?<x>\d+)\/(?<y>\d+)\./');
        var sourceFile = sourceFolder ? path.join(sourceFolder, file) : file;
        tilelive.load((protocol + "://") + sourceFile, function (err, source) {
            console.log("Loading " + protocol + ": " + sourceFile);
            if (err) {
                throw err;
            }
            var name;
            switch (protocol) {
                case 'mapnik':
                    name = path.basename(file, '.xml');
                    break;
                case 'mbtiles':
                    name = path.basename(file, '.mbtiles');
                    break;
            }
            if (_this.cacheFolder) {
                var cachedTileFolder = path.join(_this.cacheFolder, name);
                _this.checkCache(cachedTileFolder, sourceFile);
            }
            _this.app.get('/' + name + '/:z/:x/:y.*', function (req, res) {
                var z = +req.params.z, x = +req.params.x, y = +req.params.y;
                var dir, filename;
                if (_this.cacheFolder) {
                    dir = cachedTileFolder + "/" + z + "/" + x;
                    filename = dir + "/" + y + ".png";
                    fs.exists(filename, function (exists) {
                        if (exists) {
                            res.sendFile(filename);
                        }
                        else {
                            _this.getTile(source, req, res, fallbackUri, dir, filename, x, y, z);
                        }
                    });
                }
                else {
                    _this.getTile(source, req, res, fallbackUri, dir, filename, x, y, z);
                }
            });
        });
    };
    /** Get a tile from mapnik */
    TileSource.prototype.getTile = function (source, req, res, fallbackUri, dir, filename, x, y, z) {
        var _this = this;
        source.getTile(z, x, y, function (err, tile, headers) {
            if (err) {
                if (fallbackUri) {
                    var ext = path.extname(req.url);
                    var newUrl = fallbackUri + "/" + z + "/" + x + "/" + y + ext;
                    request(newUrl).pipe(res);
                }
                else {
                    res.status(404);
                    res.send(err.message);
                    // console.log('Error getting %s: tile %d, %d, %d', sourceFile, z, x, y);
                    console.log(err.message);
                }
            }
            else {
                if (_this.cacheFolder) {
                    mkdirp(dir, function (err) {
                        if (err) {
                            console.error("Error creating cache folder (" + dir + "): " + err);
                        }
                        else {
                            fs.writeFile(filename, tile, function (err) {
                                if (err)
                                    throw err;
                                //console.log('Saved map image to ' + filename);
                            });
                        }
                    });
                }
                res.set(headers);
                res.send(tile);
            }
        });
    };
    /**
     * Check whether the cache is still valid, otherwise, delete it.
     *
     * We compute the hash of the style file and if it doesn't exist, we clear the cache and write it to file as [hash].md5.
     * If the file exists, it means that we are dealing with the same source file, and we don't need to do anything.
    */
    TileSource.prototype.checkCache = function (cacheFolder, sourceFile) {
        fs.readFile(sourceFile, function (err, buf) {
            var hash = md5(buf);
            console.log('MD5 hash: ' + hash);
            var md5file = path.join(cacheFolder, hash + '.md5');
            fs.exists(md5file, function (exists) {
                if (exists)
                    return;
                rmdir(cacheFolder, function (err) {
                    if (err)
                        console.error('Error deleting cache: ' + err.message);
                    mkdirp(cacheFolder, function (err) {
                        if (err) {
                            console.error("Error creating cache folder (" + cacheFolder + "): " + err.message);
                        }
                        else {
                            fs.writeFile(md5file, '', function (err) {
                                if (err)
                                    console.error('Error writing hash: ' + err.message);
                            });
                        }
                    });
                });
            });
        });
    };
    return TileSource;
})();
exports.TileSource = TileSource;
//# sourceMappingURL=index.js.map