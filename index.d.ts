import express = require('express');
/** Options */
export declare class TileSourceOptions {
    /** If true, set headers to enable CORRS. */
    corrs: boolean;
    /** source folder. If not set, uses ./sources */
    sources: string;
}
export declare class TileSource {
    constructor(app: express.Express, options?: TileSourceOptions);
}
