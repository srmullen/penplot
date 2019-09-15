#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const math = require('mathjs');
const fetch = require('node-fetch');
const UPNG = require('upng-js');
const paper = require('paper');

function degreesToRadians(n) {
  return n * Math.PI / 180;
}

class Tile {
  static min(tile) {

  }

  static max(tile) {

  }
}

class Cache {
  constructor(z, x0, y0, x1, y1) {
    this.z = z;
    this.x0 = x0;
    this.y0 = y0;
    this.x1 = x1;
    this.y1 = y1;
    this.cache = {};
  }

  loadTiles() {
    const maxRequests = 16;
    const requests = [];
    for (let y = this.y0; y < this.y1; y++) {
      for (let x = this.x0; x < this.x1; x++) {
        requests.push(getTile(this.z, x, y));
      }
    }
    let low = Infinity;
    let high = -Infinity;
    return Promise.all(requests).then((responses) => {
      for (let [path, tile] of responses) {
        let obj = this.cache;
        for (let i = 0; i < path.length; i++) {
          if (i === path.length - 1) {
            obj[path[i]] = tile;
          } else {
            if (!obj[path[i]]) {
              obj[path[i]] = {};
            }
            obj = obj[path[i]];
          }
        }
      }
      // this.ensurePath(path);
      // this.cache[path[0]][path]
    });
    // .then(res => {
    //   console.log(res);
    //   // TODO: get low and high values
    // }).catch(err => {
    //   console.error(err);
    // });
  }

  getTile(z, x, y) {
    return this.cache[z][x][y];
  }
}

// Or should this be just the tile downloader/cacher and stich them together?

main();

async function main() {
  // Antelope Island
  const lat = 40.078190;
  const lng = -111.826498;
  const widthKm = 8;
  const heightKm = 16;

  // Yosemite Valley
  // Lat, Lng = 37.733614, -119.586598
  // W, H     = 15, 10
  // Lat0, Lng0 = 37.685097, -119.674018
  // Lat1, Lng1 = 37.816173, -119.443466

  // Iceland
  // Lat0, Lng0 = 66.750108, -25.731168
  // Lat1, Lng1 = 62.881496, -12.699955
  // Lat0, Lng0 = 66.750108, -25.831168
  // Lat1, Lng1 = 62.881496, -12.599955

  // Grand Canyon
  // Lat0, Lng0 = 36.477988, -112.726473
  // Lat1, Lng1 = 35.940449, -111.561530
  // Lat0, Lng0 = 36.551589, -112.728958
  // Lat1, Lng1 = 35.886162, -111.688370

  // Mount Everest
  // Lat0, Lng0 = 28.413539, 86.467738
  // Lat1, Lng1 = 27.543224, 87.400420

  const Z = 15; // What is Z?
  const TILE_SIZE = 256;

  const [lat0, lng0, lat1, lng1] = boundingbox(lat, lng, widthKm, heightKm);
  const min = { lat: lat0, lng: lng0 };
  const max = { lat: lat1, lng: lng1 };
  console.log(min, max);
  let [x0, y0] = tileXY(Z, min);
  let [x1, y1] = tileXY(Z, max);
  console.log(x0, y0, x1, y1);
  if (x1 < x0) {
    const tmp = x0
    x0 = x1;
    x1 = tmp;
  }
  if (y1 < y0) {
    const tmp = y0;
    y0 = y1;
    y1 = tmp;
  }
  x1++;
  y1++;
  const n = (y1 - y0) * (x1 - x0);
  console.log(`${n} tiles.`);

  const cache = new Cache(Z, x0, y0, x1, y1);
  await cache.loadTiles();
  console.log('Tile loaded');

  // TODO: Stich tile together
  const width = (x1 - x0 + 1) * TILE_SIZE;
  const height = (y1 - y0 + 1) * TILE_SIZE;
  const raster = new paper.Raster(new paper.Size(width, height));
  
}

// I think the lat and lng are the center of the image.
function boundingbox(lat, lng, widthKm, heightKm) {
  const earthRadiusMiles = 3958.8;
  const earthRadiusKms = 6371;
  const eps = 1e-3;

  const lrKm = haversine({ lat, lng: lng - eps }, { lat, lng: lng + eps }) * earthRadiusKms;
  const kmPerLng = lrKm / (eps * 2);
  const tbKm = haversine({ lat: lat - eps, lng }, { lat: lat + eps, lng }) * earthRadiusKms;
  const kmPerLat = tbKm / (eps * 2);

  const dLng = widthKm / 2 / kmPerLng;
  const dLat = heightKm / 2 / kmPerLat;

  return [lat - dLat, lng - dLng, lat + dLat, lng + dLng];
}

/**
 * Calculates the shortest path between two coordinates on the surface of the earth.
 */
function haversine(from, to) {
  const lat0 = degreesToRadians(from.lat);
  const lng0 = degreesToRadians(from.lng);
  const lat1 = degreesToRadians(to.lat);
  const lng1 = degreesToRadians(to.lng);

  const diffLat = lat1 - lat0;
  const diffLng = lng1 - lng0;

  const a = math.pow(math.sin(diffLat / 2), 2) +
    math.cos(lat0) * math.cos(lat1) *
    math.pow(math.sin(diffLng / 2), 2);

  return 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a));
}

function tileXY(z, coord) {
  const lat = degreesToRadians(coord.lat);
  const n = math.pow(2, z);
  const x = (coord.lng + 180) / 360 * n;
  const y = (1 - math.log(math.tan(lat) + (1 / math.cos(lat))) / math.PI) / 2 * n;
  return [Math.floor(x), Math.floor(y)];
}

function tileUrl(z, x, y) {
  return `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`;
}

function getTile(z, x, y) {
  return new Promise((resolve, reject) => {
    // Check if the tile already exists in the cache.
    const cached = path.resolve(__dirname, `./cache/${z}/${x}/${y}.png`);
    if (fs.existsSync(cached)) {
      fs.readFile(cached, (err, data) => {
        if (err) {
          reject(err);
        }
        resolve([[z, x, y], UPNG.decode(data)]);
      })
    } else {
      return fetch(tileUrl(z, x, y)).then(res => res.arrayBuffer()).then(buf => {
        cacheFile([z, x, y], buf);
        const tile = UPNG.decode(buf);
        return resolve([[z, x, y], tile]);
      }).catch(err => {
        return reject(err);
      });
    }
  });
}

function cacheFile([z, x, y], buf) {
  const dir = `./cache/${z}/${x}`;
  if (!fs.existsSync(path.resolve(__dirname, dir))) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const png = `./cache/${z}/${x}/${y}.png`;
  fs.writeFile(png, Buffer.from(new Uint8Array(buf)), (err) => {
    if (err) {
      console.error(err);
    }
  });
}

function decode(response) {
  return response.arrayBuffer().then((buffer) => {
    return UPNG.decode(buffer);
  });
}
