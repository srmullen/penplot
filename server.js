const fs = require('fs');
const express = require('express');
const bodyParser = require('body-parser');
const pako = require('pako');
require('body-parser-xml')(bodyParser);
const app = express();
const port = 3000;

app.use(bodyParser.json({limit: '10000kb'}));

app.get('/', (req, res) => res.send('Hello World!'));

app.put('/svg', (req, res) => {
  console.log("Putting SVG");
  const content = pako.inflate(req.body.content, {to: 'string'});
  fs.writeFile(`./svg/${req.body.name}.svg`, content, (err) => {
    if (err) {
      console.error(err);
    } else {
      res.send("Success");
    }
  });
});

app.listen(port, () => console.log(`Example app listening on port ${port}!`));
