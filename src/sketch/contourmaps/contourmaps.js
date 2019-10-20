import paper, { Point, Path, Raster, Group } from 'paper';
import UPNG from 'upng-js';
import math, { random, randomInt } from 'mathjs';
import { sortBy, take, range } from 'lodash';
import dat from 'dat.gui';
import GPU from 'gpu.js';
import { A4, STRATH_SMALL, ARTIST_SKETCH, createCanvas, loadImage } from 'common/setup';
import {
  saveAsSVG, choose, wchoose, maprange, clipBounds, processOptions, timer, degreesToRadians
} from 'common/utils';
import * as pens from 'common/pens';
import * as palettes from 'common/palettes';
import { clipToBorder } from 'common/border';
import tilepng from './cache/15/5491/12665.png';

window.math = math;

const PAPER_SIZE = STRATH_SMALL.landscape;
const [width, height] = PAPER_SIZE;
const canvas = createCanvas(PAPER_SIZE);
paper.setup(canvas);

const options = {
  method: 'GET',
  headers: {},
  mode: 'cors',
  cache: 'default'
};

function tileUrl(z, x, y) {
  return `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`;
}

// main();
terrarium2gray();

async function terrarium2gray() {
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

  const [lat0, lng0, lat1, lng1] = boundingbox(lat, lng, widthKm, heightKm);
  const min = { lat: lat0, lng: lng0 };
  const max = { lat: lat1, lng: lng1 };
  console.log(min, max);
}

// I think the lat and lng are the center of the image.
function boundingbox(lat, lng, widthKm, heightKm) {
  const earthRadiusMiles = 3958.8;
  const earthRadiusKms = 6371;
  const eps = 1e-3;

  const lrKm = haversine({ lat, lng: lng - eps }, { lat, lng: lng + eps }) * earthRadiusKms;
  const kmPerLng = lrKm / (eps * 2);
  const tbKm = haversine({ lat: lat - eps, lng }, { lat: lat + eps, lng}) * earthRadiusKms;
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

  const a = math.pow(math.sin(diffLat/2), 2) + 
    math.cos(lat0) * math.cos(lat1) *
    math.pow(math.sin(diffLng/2), 2);

  return math.atan2(math.sqrt(a), math.sqrt(1-a));
}

main();

async function main() {
  // Not yet sure how to use pixel data here. Appears to be one extra row or column of data (perhaps line breaks).
  const tile = await fetch(tileUrl(11, 330, 790), options).then(decode);
  console.log(tile);


  // This gives error: Canvas has been tainted by cross-origin data.
  const raster = new Raster(tileUrl(11, 330, 790));
  raster.onLoad = () => {
    window.raster = raster;
    // const pixel = raster.getPixel(10, 10);
  }
}

function decode(response) {
  return response.arrayBuffer().then((buffer) => {
    return UPNG.decode(buffer);
  });
}

async function asUint8Array(response) {
  return response.arrayBuffer().then((buffer) => {
    return [].slice.call(new Uint8Array(buffer));
  });
}

function displayTileAsImage(response) {
  response.arrayBuffer().then((buffer) => {
    var base64Flag = 'data:image/jpeg;base64,';
    var imageStr = arrayBufferToBase64(buffer);

    const img = document.createElement('img');
    img.src = base64Flag + imageStr;
    const root = document.getElementById('root');
    root.appendChild(img);
  });
}

function arrayBufferToBase64(buffer) {
  var binary = '';
  var bytes = [].slice.call(new Uint8Array(buffer));

  bytes.forEach((b) => binary += String.fromCharCode(b));

  return window.btoa(binary);
};

