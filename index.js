var path = require('path');
var fs = require('fs');
var request = require('request');
var mkdirp = require('mkdirp');
var rmdir = require('rimraf');
var async = require('async');
var md5 = require('md5'), tilelive = require('tilelive');
;
var TileSource = (function () {
    function TileSource(app, options) {
        var _this = this;
        this.app = app;
        this.protocols = [];
        var defaultOptions = {
            corrs: true,
            sources: path.join(__dirname, 'tilesources'),
            tileSources: [],
            cache: path.join(__dirname, 'cache')
        };
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
        if (options.tileSources && options.tileSources.length > 0) {
            // Source files are explicitly stated
            options.tileSources.forEach(function (source) {
                _this.load(source.protocol, source.path, source.fallbackUri, _this.pathIsAbsolute(source.path) ? '' : __dirname, function () { });
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
                        var tasks = [];
                        files.forEach(function (file) {
                            switch (protocol) {
                                case 'tm2':
                                    // case 'mbtiles':
                                    // case 'mapnik':
                                    // case 'carto+file':
                                    tasks.push(function (cb) {
                                        _this.load('utfgrid+' + protocol, file, '', sourceFolder, cb);
                                    });
                                    break;
                            }
                            tasks.push(function (cb) {
                                _this.load(protocol, file, '', sourceFolder, cb);
                            });
                        });
                        async.series(tasks);
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
        if (/utfgrid/.test(protocol)) {
            if (this.protocols.indexOf('utfgrid') < 0) {
                this.protocols.push('utfgrid');
                this.registerProtocol('mbtiles');
                require('tilelive-vector').registerProtocols(tilelive);
                require('tilelive-bridge').registerProtocols(tilelive);
                require('tilejson').registerProtocols(tilelive);
                require('tilelive-utfgrid')(tilelive).registerProtocols(tilelive);
                require('tilelive-tmsource')(tilelive).registerProtocols(tilelive);
                require('tilelive-http')(tilelive).registerProtocols(tilelive);
            }
            console.log("Registering protocol " + protocol + ".");
            this.registerProtocol(protocol.replace('utfgrid+', ''));
            return;
        }
        switch (protocol) {
            case 'mapnik':
                require('tilelive-mapnik').registerProtocols(tilelive);
                break;
            case 'tm2':
                require('tilelive-tmstyle')(tilelive).registerProtocols(tilelive);
                break;
            case 'mbtiles':
                require('mbtiles').registerProtocols(tilelive);
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
     * @param  {string} sourceFolder Source folder. If not specified, the file is absolute.
     * @param  {Function} callback Callback function to call the function asynchronously.
     */
    TileSource.prototype.load = function (protocol, file, fallbackUri, sourceFolder, callback) {
        var _this = this;
        if (file[0] === '_')
            return;
        this.registerProtocol(protocol);
        // var re = new RegExp('/[a-zA-Z\d]*\/(?<z>\d+)\/(?<x>\d+)\/(?<y>\d+)\./');
        var sourceFile = sourceFolder ? path.join(sourceFolder, file) : file;
        var tileliveSource;
        switch (protocol) {
            case 'tm2':
                // NOTE I need to remove the drive (host) name, otherwise tmstyle cannot load the data.yml file.
                tileliveSource = "tmstyle://" + sourceFile.replace(/(.:)/i, '');
                break;
            case 'utfgrid+tm2':
                // NOTE I need to remove the drive (host) name, otherwise tmstyle cannot load the data.yml file.
                tileliveSource = "utfgrid+tmstyle://" + sourceFile.replace(/(.:)/i, '');
                break;
            default:
                tileliveSource = protocol + "://" + sourceFile;
                break;
        }
        var isUtfGrid = /^utfgrid/.test(protocol);
        tilelive.load(tileliveSource, function (err, source) {
            // console.log(`Loading ${tileliveSource}`);
            if (err) {
                throw err;
            }
            var name;
            switch (protocol) {
                case 'utfgrid+mapnik':
                case 'mapnik':
                    name = path.basename(file, '.xml');
                    break;
                case 'utfgrid+tm2':
                case 'tm2':
                    name = path.basename(file, '.tm2');
                    break;
                case 'utfgrid+mbtiles':
                case 'mbtiles':
                    name = path.basename(file, '.mbtiles');
                    break;
            }
            if (_this.cacheFolder) {
                var cachedTileFolder = path.join(_this.cacheFolder, name);
                _this.checkCache(cachedTileFolder, sourceFile);
            }
            var ext = isUtfGrid ? 'grid.json' : 'png';
            var urlPath = "/" + name + "/:z/:x/:y." + ext;
            console.log("Exposing " + tileliveSource + " service at " + urlPath + ".");
            _this.app.get(urlPath, function (req, res) {
                var z = +req.params.z, x = +req.params.x, y = +req.params.y;
                var dir, filename;
                if (_this.cacheFolder) {
                    dir = cachedTileFolder + "/" + z + "/" + x;
                    filename = dir + "/" + y + "." + ext;
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
            callback();
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
                            fs.writeFile(filename, headers['Content-Type'] === 'application/json' ? JSON.stringify(tile) : tile, function (err) {
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