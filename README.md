# csWeb-tile
csWeb-tile is a wrapper around [MapBox's TileLive](https://github.com/mapbox/tilelive) application to offer a simple npm package for serving tile sources. You can run it standalone, as part of the csWeb server, or any other express-based server for that matter. 

In case you wish to serve tiles standalone, you may also take a look at [tessera](https://github.com/mojodna/tessera), a standalone tile server created by mojodna, who also made most of the tilelive modules. 

Currently, the following tilelive protocols are supported:
* mbtiles (with raster data). Default location: ```tilesources\mbtiles```.
* mbtiles (with vector tiles). Default location: `tilesources\tm2` (see world.tm2 example)
* tmstyle (or .tm2) projects, i.e. [Mapbox Studio Classic](https://www.mapbox.com/mapbox-studio-classic/#win64) tilemill 2 projects. You can create them using the free Mapbox Studio Classic tool. Default location ```tilesources\tm2```. Currently only tested with geojson source layers. For tmstyle projects, we can also serve UtfGrid files - in that case, you need to edit the project.yml file manually to add the interactivity layer, as explained in [UtfGrid](https://www.mapbox.com/help/style-quickstart/#utfgrid), [How interactivity works](https://www.mapbox.com/blog/how-interactivity-works-utfgrid/) and [here](http://www.macwright.org/2011/08/10/fast-hacky-queries-with-utfgrid.html).
* Mapnik XML projects, e.g. you can create your own map using [TileMill](https://www.mapbox.com/tilemill/), and export it as a Mapnik project. Default location: ```tilelive\mapnik```.

NOTE: Tests are performed using node 5 and npm 3 on Windows: in principle, everything should also work on Mac and Linux, but as I don't have access to these platforms, I cannot test it.

## Installation

You can simply install it using the node package manager.
```
npm i -g csweb-tile
```

## Building it from scratch

Alternatively, you can build it yourself, assuming you have installed TypeScript (otherwise, run ```npm i -g typescript```). Check out the project using git clone (or download the zip) and simply run ```tsc``` in the main folder. Next, run ```node test\app.js``` and you can visit ```http://localhost:8888/``` to run leaflet. On the command line, you see the tile layers that are being shared.

## Usage instructions

For example, if you want to share mbtiles files (with raster data), do the following.

### Simple standalone tile server

* Create a new project folder, ```csWeb-tile``` for example and ```cd csWeb-tile```.
* Create a folder ```tilesources\mbtiles```
* Put your mbtiles file in the newly created ```tilesources\mbtiles``` folder
* Run ```csweb-tile```
**NOTE:** You can only open one mbtiles file at a time, it seems, most likely because mbtiles will open an sqlite database file for you, and you won't be able to open multiple ones simultaneously. Please correct me if I'm wrong, however.  

### In [csWeb](https://github.com/TNOCS/csWeb)

Assuming that you have installed TypeScript (otherwise, run ```npm i -g typescript```), you can do the following:
* Download the zip file from [csWeb-example](https://github.com/TNOCS/csWeb-example) and unpack it in a new folder.
* Install all regular dependencies in this new project, install csweb-tile including the mbtiles protocal package, and compile the source:
```
npm i
npm i csweb-tile mbtiles --save
cd public && bower i
cd ..
tsc
```
* Add the mbtiles file(s) to a folder, e.g. ```tilesources/mbtiles```. Note that you can change 
the ```tilesources``` name, but the subfolder's name needs to be the same as the tilelive protocol, 
i.e. in this case ```mbtiles```. See above.
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

When you have csWeb-tile running, ready to serve tiles, you still need to add your tiles to the csWeb project.json (or the solution, in case you wish to use it as the base layer, projects.json).


## Installing Mapnik
NOTE: Windows binaries for the 3.x series require the Visual C++ Redistributable Packages for Visual Studio 2015:

* [64 bit binaries](https://mapbox.s3.amazonaws.com/windows-builds/visual-studio-runtimes/vcredist-VS2015/vcredist_x64.exe)
* [32 bit binaries](https://mapbox.s3.amazonaws.com/windows-builds/visual-studio-runtimes/vcredist-VS2015/vcredist_x86.exe)

See [here](https://github.com/mapnik/node-mapnik/wiki/WindowsBinaries) for more details.

## Creating your own standalone OpenStreetMap service

Using the tilesources/tm2/world.tm2 project, you can share the whole world (or a subset, if you like) using node.js. All you need to do is download the world.mbtiles file (e.g. from [OSM2VectorTiles](http://osm2vectortiles.org/downloads) and add it to this folder. And you also need to update the source path in the project.yml file. 

Optionally, you can specify another interactivity layer (see the tilejson.json file for additionaly layer names) and include a subset of the available fields in the template.

NOTE: Due to a limitation in the mbtiles package, you can only open one mbtiles file at a time.

Alternatively, take a look at [Klokan Technologies PHP tileserver](http://gis.stackexchange.com/questions/125037/self-hosting-mapbox-vector-tiles) or [here](https://github.com/klokantech/tileserver-php), also available as a [Docker image](http://osm2vectortiles.org/docs/start/), which exposes the data also as a WMTS service. 

In Leaflet, you can dan expose the tiles and UtfGrid as follows:

```javascript
L.tileLayer('world/{z}/{x}/{y}.png', {
    attribution: 'Tiles courtesy of <a href="http://www.tno.nl/" target="_blank">TNO</a>.'
}).addTo(map);
        
var utfGrid = new L.UtfGrid('world/{z}/{x}/{y}.grid.json', {
    resolution: 4,
    useJsonP: false
});
utfGrid.on('click', function (e) {
    //click events are fired with e.data==null if an area with no hit is clicked
    if (e.data) {
        alert('click: ' + JSON.stringify(e.data, null, 2));
    } else {
        alert('click: nothing');
    }
});
// utfGrid.on('mouseover', function (e) {
//     console.log('hover: ' + JSON.stringify(e.data, null, 2));
// });
// utfGrid.on('mousemove', function (e) {
//     console.log('move: ' + JSON.stringify(e.data, null, 2));
// });
// utfGrid.on('mouseout', function (e) {
//     console.log('unhover: ' + JSON.stringify(e.data, null, 2));
// });
map.addLayer(utfGrid); 
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
