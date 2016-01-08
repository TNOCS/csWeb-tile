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

Alternatively, you can specify the tile sources manually by setting the tileSources property directly, e.g. In this case, you can also include a fallback URI, which will be used when the primary source returns an error (i.e. you don't have the tile).
```
cs.start(() => {
    var ts = new tilesource.TileSource(cs.server, <tilesource.TileSourceOptions>{
        tileSources: [{
            protocol: 'mbtiles',
            path: path.join(__dirname, 'tilesources'),
            fallbackUri: ''}]
    });
    console.log('started');
});
```

## 3D Cesium terrain server

These tiles can also be used as base layer by the 3D view in csWeb based on Cesium. However, in order to use your own height server, you have to install another github project, the [Cesium Terrain Server](https://github.com/geo-data/cesium-terrain-server). In order to get this running, I had to jump through the following hoops:

* Install the [Go language](https://golang.org/) (as this terrain server is written in Go)
* Add the Go installation folder to my path (so I can run it), and set GOPATH to my Go sources folder, e.g. on Windows ```set GOPATH=c:\dev\Go``` (assuming that your sources should go in ```c:\dev\Go\src```, which you should create)
* Get the cesium project: ```go get github.com/geo-data/cesium-terrain-server``` (on Linux, you can probably just run the make file)
* When I subsequently tried to install it, it complained about three missing packages, which I installed too: 
```
go get github.com\bradfitz\gomemcache
go get github.com\gorilla\handlers
go get github.com\gorilla\mux
```
* Each of these GETs creates a new ```%GOPATH%\src``` sub-folder, so visit each of them and run ```go install``` which installs these projects in the ```%GOPATH%\bin``` folder. Do the same for the cesium-terrain-server.
* If all goes well, you should finally be able to run ```%GOPATH\bin\cesium-terrain-server```. 
* Finally, you need some DEM (Digital Elevation Map) data in the proper format.  On their website, it is explained how you can create one using [ctb-tile](https://github.com/geo-data/cesium-terrain-builder#ctb-tile). I've added the tile data to `MY_TILE_DATA_FOLDER\city` and used it with the following command line (note the absence of the `city` in the `dir` switch):
```
%GOPATH%\bin\cesium-terrain-server.exe -base-terrain-url /tilesets -dir /MY_TILE_DATA_FOLDER
```
* If this is still working, you should be able to visit [http://localhost:8000/tilesets/layer.json](http://localhost:8000/tilesets/layer.json) and get your 'layer.json' file. 
