import http       = require('http');
import path       = require('path');
import express    = require('express');
import TileSource = require('../index');

// TODO Would it help if we use compression?
var app = express();
app.set('port', 8888);
app.use(express.static(__dirname + '/public'));

var tileSouce = new TileSource.TileSource(app);

http.createServer(app).listen(app.get('port'), () => {
    console.log('Express server listening on port ' + app.get('port'));
});
