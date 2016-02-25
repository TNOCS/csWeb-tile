#!/usr/bin/env node

var path       = require('path');
var http       = require('http');
var express    = require('express');
var TileSource = require('../index');

var app = express();
var port = 8888;
app.set('port', port);
app.use(express.static(__dirname + '/public'));

var tileSouce = new TileSource.TileSource(app, {
    sources: path.join(process.cwd(), 'tilesources')
});
http.createServer(app).listen(port, function () {
    console.log('Express server listening on port ' + port);
});
