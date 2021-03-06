import express = require('express');
/** Interface to describe a tile source */
export interface ITileSource {
    /** Protocol to use for loading the tile source */
    protocol: string;
    /** Absolute or relative path to the file. If not absolute, the current folder is used. */
    path: string;
    /** Fallback URI, e.g. when no tile can be found, you can redirect it to this URL. */
    fallbackUri: string;
}
/** Options */
export interface ITileSourceOptions {
    /** If true, set headers to enable CORRS. */
    corrs?: boolean;
    /** source folder. If not set, uses ./sources */
    sources?: string;
    /** Specify a source manually by setting its path. If set, ignores 'sources' folder. */
    tileSources?: ITileSource[];
    /** Path to the cache folder, if any. */
    cache?: string;
}
export declare class TileSource {
    private app;
    cacheFolder: string;
    constructor(app: express.Express, options?: ITileSourceOptions);
    private protocols;
    /** Register the protocol. */
    private registerProtocol(protocol);
    /**
     * Returns true if your path is absolute.
     * See http://stackoverflow.com/questions/21698906/how-to-check-if-a-path-is-absolute-or-relative
     */
    private pathIsAbsolute(yourPath);
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
    private load(protocol, file, fallbackUri, sourceFolder, callback);
    /** Get a tile from mapnik */
    private getTile(source, req, res, fallbackUri, dir, filename, x, y, z);
    /**
     * Check whether the cache is still valid, otherwise, delete it.
     *
     * We compute the hash of the style file and if it doesn't exist, we clear the cache and write it to file as [hash].md5.
     * If the file exists, it means that we are dealing with the same source file, and we don't need to do anything.
    */
    private checkCache(cacheFolder, sourceFile);
}
