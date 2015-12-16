# csWeb-tile
Wrapper around [MapBox's TileLive](https://github.com/mapbox/tilelive) application to offer a simple npm package for serving tile sources in csWeb.

## Usage

For example, if you want to share mbtiles files, do the following.

* Download the zip file from [csWeb-example](https://github.com/TNOCS/csWeb-example) and unpack it in a new folder.
* Install all regular dependencies in this new project, install csweb-tile including the mbtiles protocal package, and compile the source:
```
npm i
npm i csweb-tile mbtiles --s
cd public && bower i
cd ..
tsc -w -p .
```
* Add the mbtiles file(s) to a folder, e.g. ```tilesources/mbtiles```. Note that you can change 
the ```tilesources``` name, but the subfolder's name needs to be the same as the tilelive protocol, 
i.e. in this case ```mbtiles```. 
* Add the tile server to your server.ts file. When starting the server (```node server.js```), you should see a 
message on the console upon loading the file. 
```
cs.start(() => {
    var ts = new tilesource.TileSource(cs.server, <tilesource.TileSourceOptions>{
        sources: path.join(__dirname, 'tilesources')
    });
    console.log('started');
});
```
* Finally, add the new tile source to your ```projects.json``` file, set it to ```isDefault: true``` (making sure that you have no other maps that set it too) 
e.g.
```
    "baselayers": [{
        "title": "MYMBTILES",
        "subtitle": "",
        "url": "http://localhost:3003/MYMBTILESWITHOUTEXTENSION/{z}/{x}/{y}.png",
        "isDefault": true,
        "minZoom": 0,
        "maxZoom": 19,
        "cesium_url": "http://localhost:3003/MYMBTILESWITHOUTEXTENSION/",
        "cesium_maptype": "openstreetmap",
        "attribution": "",
        "preview": ""
    }, {
...
```
