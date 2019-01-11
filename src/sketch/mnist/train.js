const fs = require('fs');
const brain = require('brain.js');
const Papa = require('papaparse');
const { tail, take, takeRight } = require('lodash');

console.log('Loading Data.');
const traincsv = loadCSV('./train.csv');
// const test = loadCSV('./test.csv');

console.log('Converting to trainable format.');
const [train, test] = trainTestSplit(traincsv.data);
const trainData = toTrainable(tail(train));
const testData = toTrainable(tail(test), oneHot = false);

const net = runTraining(take(trainData, 5000));
console.log('Running Tests');
const accuracy = runTests(take(testData, 5000), net);
console.log(`Accuracy: ${accuracy}`);

console.log("Saving model");
saveModel(net);

function runTests (testData, net) {
  let correct = 0;
  for (let i = 0; i < testData.length; i++) {
    const prediction = brain.likely(testData[i].input, net);
    if (prediction === testData[i].output) {
      correct++;
    }
  }
  const accuracy = correct / testData.length;
  return accuracy;
}

function trainTestSplit (data, split=0.2) {
  const ntest = Math.floor(data.length * split);
  const ntrain = data.length - ntest;
  const test = takeRight(data, ntest);
  const train = take(data, ntrain);
  return [train, test];
}

function saveModel (net) {
  const model = JSON.stringify(net.toJSON());
  fs.writeFileSync('./model.json', model, {encoding: 'utf8'});
  console.log("Save complete");
}

function runTraining (data, config = {hiddenLayers: [784]}) {
  const net = new brain.NeuralNetwork(config);
  console.log('Training');
  net.train(data, {
    log: detail => console.log(detail)
  });
  return net;
}

function loadCSV (path) {
  const trainStr = fs.readFileSync(path, {encoding: 'utf8'});
  return Papa.parse(trainStr);
}

function getLabeledData (data) {
  const labels = [];
  const images = [];
  for (let i = 1; i < data.length; i++) {
    const [label, ...img] = data[i];
    labels.push(label);
    images.push(img);
  }
  return [labels, images];
}

function toTrainable (data, oneHot = true) {
  const [labels, images] = getLabeledData(data);
  const formatted = [];
  for (let i = 0; i < labels.length; i++) {
    const input = images[i].map(n => n / 255);
    if (oneHot) {
      const output = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
      output[labels[i]] = 1;
      formatted.push({input, output});
    } else {
      const output = labels[i];
      formatted.push({input, output});
    }
  }
  return formatted;
}



module.exports = {
  loadCSV,
  getLabeledData,
  toTrainable,
  runTraining,
  train,
  test
};
