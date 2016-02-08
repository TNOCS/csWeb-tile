import http    = require('http');
import path    = require('path');
import fs      = require('fs');
import express = require('express');
import request = require('request');

var tilelive = require('tilelive');

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
    tileSources: ITileSource[]
};

export class TileSource {
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

        if (options.tileSources) {
            // Source files are explicitly stated
            options.tileSources.forEach(source => {
                this.load(source.protocol, source.path, source.fallbackUri, this.pathIsAbsolute(source.path) ? '' : __dirname);
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
                        files.forEach(file => this.load(protocol, file, '', sourceFolder));
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
        require(protocol).registerProtocols(tilelive);
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
     * @param  {string} sourceFolder? Optional source folder. If not specified, the file is absolute.
     */
    private load(protocol: string, file: string, fallbackUri: string, sourceFolder?: string) {
        this.registerProtocol(protocol);
        // var re = new RegExp('/[a-zA-Z\d]*\/(?<z>\d+)\/(?<x>\d+)\/(?<y>\d+)\./');
        let sourceFile = sourceFolder ? path.join(sourceFolder, file) : file;
        tilelive.load(`${protocol}://` + sourceFile, (err, source) => {
            console.log(`Loading ${protocol}: ${sourceFile}`);
            if (err) {
                throw err;
            }
            let name = path.basename(file, '.' + protocol);
            this.app.get('/' + name + '/:z/:x/:y.*', function(req, res) {
                var z = +req.params.z;
                var x = +req.params.x;
                var y = +req.params.y;
                //console.log('%s: get tile %d, %d, %d', mbSource, z, x, y);

                source.getTile(z, x, y, function(err, tile, headers) {
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
                            console.log('Error getting %s: tile %d, %d, %d', sourceFile, z, x, y);
                            console.log(err.message);
                        }
                    } else {
                        res.set(headers);
                        res.send(tile);
                    }
                });
            });
        });
    }

}
