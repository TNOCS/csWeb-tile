import http    = require('http');
import path    = require('path');
import fs      = require('fs');
import express = require('express');
import request = require('request');
import mkdirp  = require('mkdirp');
import rmdir   = require('rimraf');
import async   = require('async');

var md5      = require('md5'),
    tilelive = require('tilelive');

//require('tilelive-bridge').registerProtocols(tilelive);

// Iterate over all sub-folders in sources.
// Each sub-folder's name needs to match the tilelive module name,
// e.g. all mbtiles need to be in the mbtiles sub folder, as that 
// is the name of the corresponding node package.
// Register each sub-folder name that is not empty
// In that folder, open all files.

/** Interface to describe a tile source */
export interface ITileSource {
    /** Protocol to use for loading the tile source */
    protocol: string;
    /** Absolute or relative path to the file. If not absolute, the current folder is used. */
    path:     string;
    /** Fallback URI, e.g. when no tile can be found, you can redirect it to this URL. */
    fallbackUri: string;
}

/** Options */
export class TileSourceOptions {
    /** If true, set headers to enable CORRS. */
    corrs: boolean = true;
    /** source folder. If not set, uses ./sources */
    sources: string = path.join(__dirname, 'tilesources');
    /** Specify a source manually by setting its path. If set, ignores 'sources' folder. */
    tileSources: ITileSource[];
    /** Path to the cache folder, if any. */
    cache: string = path.join(__dirname, 'cache');
};

export class TileSource {
    cacheFolder: string;

    constructor(private app: express.Express, options?: TileSourceOptions) {
        var defaultOptions = new TileSourceOptions();
        if (!options) options = defaultOptions;

        // enable corrs
        if ((options && typeof options.corrs !== 'undefined' && options.corrs) || defaultOptions.corrs) {
            app.use(function(req, res, next) {
                res.header('Access-Control-Allow-Origin', '*');
                res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
                next();
            });
        }

        if (options.cache) {
            this.cacheFolder = options.cache;
            if (!fs.existsSync(this.cacheFolder)) {
               mkdirp(this.cacheFolder, err => {
                   if (err) console.error('Error creating cache folder: ' + err);
               });
            }
        }

        if (options.tileSources) {
            // Source files are explicitly stated
            options.tileSources.forEach(source => {
                this.load(source.protocol, source.path, source.fallbackUri, this.pathIsAbsolute(source.path) ? '' : __dirname, () => {});
            });
        } else {
            // Folder that contains the source map files.
            var tileFolder = options.sources || defaultOptions.sources;
            fs.readdir(tileFolder, (err, protocols) => {
                if (err) {
                    console.log(`Error reading ${tileFolder}: ` + err);
                    return;
                }
                if (!protocols || protocols.length === 0) {
                    console.log(`No sources found in folder ${tileFolder}.`);
                    return;
                }

                protocols.forEach(protocol => {
                    let sourceFolder = path.join(tileFolder, protocol);
                    fs.readdir(sourceFolder, (err, files) => {
                        if (err) {
                            console.log(`Error reading folder ${protocol}: ${err}`);
                            return;
                        }
                        var tasks: AsyncFunction<void>[] = [];
                        files.forEach(file => {
                            tasks.push((cb: Function) => {
                                this.load(protocol, file, '', sourceFolder, cb);
                            });
                        });
                        async.series<void>(tasks);
                    });
                });
            });
        }
    }

    private protocols: string[] = [];
    /** Register the protocol. */
    private registerProtocol(protocol: string) {
        if (this.protocols.indexOf(protocol) >= 0) return;
        this.protocols.push(protocol);
        switch (protocol) {
            case 'mapnik':
                require('tilelive-mapnik').registerProtocols(tilelive);
                break;
            case 'tm2':
                require('tilelive-vector'  ).registerProtocols(tilelive);
                require('tilelive-bridge'  ).registerProtocols(tilelive);
                require('tilelive-utfgrid' )(tilelive).registerProtocols(tilelive);
                require('tilelive-tmsource')(tilelive).registerProtocols(tilelive);
                require('tilelive-tmstyle' )(tilelive).registerProtocols(tilelive);
                break;
            default:
                require(protocol).registerProtocols(tilelive);
                break;
        }
        console.log(`Registering protocol ${protocol}.`);
    }

    /** 
     * Returns true if your path is absolute.
     * See http://stackoverflow.com/questions/21698906/how-to-check-if-a-path-is-absolute-or-relative
     */
    private pathIsAbsolute(yourPath: string) {
        return path.resolve(yourPath) === path.normalize(yourPath).replace( RegExp(path.sep + '$'), '');
    }

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
    private load(protocol: string, file: string, fallbackUri: string, sourceFolder: string, callback: Function) {
        this.registerProtocol(protocol);
        // var re = new RegExp('/[a-zA-Z\d]*\/(?<z>\d+)\/(?<x>\d+)\/(?<y>\d+)\./');
        let sourceFile = sourceFolder ? path.join(sourceFolder, file) : file;

        var tileliveProtocol = protocol;
        switch (protocol) {
            case 'tm2':
                tileliveProtocol = 'utfgrid+tmstyle:///dev/web/cs/csWeb-tile/tilesources/tm2/road.tm2';
                sourceFile = '';
                break;
            default:
                tileliveProtocol += '://';
                break;
        }

        tilelive.load(`${tileliveProtocol}` + sourceFile, (err, source) => {
            console.log(__dirname);
            console.log(`Loading ${tileliveProtocol}${sourceFile}`);
            if (err) {
                throw err;
            }
            let name: string;
            switch (protocol) {
                case 'mapnik':
                    name = path.basename(file, '.xml');
                    break;
                case 'tm2':
                    name = path.basename(file, '.tm2');
                    break;
                case 'mbtiles':
                    name = path.basename(file, '.mbtiles');
                    break;
            }

            if (this.cacheFolder) {
                var cachedTileFolder = path.join(this.cacheFolder, name);
                this.checkCache(cachedTileFolder, sourceFile);
            }

            this.app.get('/' + name + '/:z/:x/:y.*', (req, res) => {
                var z = +req.params.z,
                    x = +req.params.x,
                    y = +req.params.y;

                var dir: string,
                    filename: string;

                if (this.cacheFolder) {
                    dir = `${cachedTileFolder}/${z}/${x}`;
                    filename = `${dir}/${y}.png`;
                    fs.exists(filename, exists => {
                        if (exists) {
                            res.sendFile(filename);
                        } else {
                            this.getTile(source, req, res, fallbackUri, dir, filename, x, y, z);
                        }
                    });
                } else {
                    this.getTile(source, req, res, fallbackUri, dir, filename, x, y, z);
                }
            });
            callback();
        });
    }

    /** Get a tile from mapnik */
    private getTile(source, req: express.Request, res: express.Response, fallbackUri: string, dir: string, filename: string, x: number, y: number, z: number) {
        source.getTile(z, x, y, (err, tile, headers) => {
            if (err) {
                if (fallbackUri) {
                    var ext = path.extname(req.url);
                    var newUrl = `${fallbackUri}/${z}/${x}/${y}${ext}`;
                    request(newUrl).pipe(res);
                    // A redirect in the client does not work for Cesium: CORS exception
                    // res.redirect(`${fallbackUri}/${z}/${x}/${y}${ext}`); // http://stackoverflow.com/questions/11355366/nodejs-redirect-url
                } else {
                    res.status(404);
                    res.send(err.message);
                    // console.log('Error getting %s: tile %d, %d, %d', sourceFile, z, x, y);
                    console.log(err.message);
                }
            } else {
                if (this.cacheFolder) {
                    mkdirp(dir, err => {
                        if (err) {
                            console.error(`Error creating cache folder (${dir}): ${err}`);
                        } else {
                            fs.writeFile(filename, tile, err => {
                                if (err) throw err;
                                //console.log('Saved map image to ' + filename);
                            });
                        }
                    });
                }
                res.set(headers);
                res.send(tile);
            }
        });
    }

    /** 
     * Check whether the cache is still valid, otherwise, delete it. 
     * 
     * We compute the hash of the style file and if it doesn't exist, we clear the cache and write it to file as [hash].md5. 
     * If the file exists, it means that we are dealing with the same source file, and we don't need to do anything.
    */
    private checkCache(cacheFolder: string, sourceFile: string) {
        fs.readFile(sourceFile, (err, buf) => {
            let hash = md5(buf);
            console.log('MD5 hash: ' + hash);
            var md5file = path.join(cacheFolder, hash + '.md5');
            fs.exists(md5file, exists => {
                if (exists) return;
                rmdir(cacheFolder, err => {
                    if (err) console.error('Error deleting cache: ' + err.message);
                    mkdirp(cacheFolder, err => {
                        if (err) {
                            console.error(`Error creating cache folder (${cacheFolder}): ${err.message}`);
                        } else {
                            fs.writeFile(md5file, '', err => {
                                if (err) console.error('Error writing hash: ' + err.message);
                            });
                        }
                    });
                });
            });
        });
    }

}
