const path = require('path');
const fs = require('fs');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const sketches = ['chord_waves', 'mountains', 'line_sort', 'cubic_entropy'];
const basePath = './src/sketch';
const dir = fs.readdirSync(basePath);
const entry = {};
const htmlPlugins = [];

for (let i = 0; i < sketches.length; i++) {
  const name = sketches[i];
  const rel = path.join(basePath, name);
  if (fs.lstatSync(rel).isDirectory()) {
    const files = fs.readdirSync(rel).map(path.parse);
    const js = files.find(file => {
      return file.ext === '.js' && (file.name === 'index' || file.name === name);
    });
    const html = files.find(file => file.ext === '.html');
    const chunkName = path.join('sketch', name);
    entry[chunkName] = './' + path.join('src/sketch', name, js.name);
    const filename = name + '.html';
    const template = './' + path.join(rel, html.base);
    htmlPlugins.push(new HtmlWebpackPlugin({
      filename,
      template,
      chunks: [chunkName]
    }));
  } else {
    throw new Error(`Sketch ${sketches[i]} not found in ${basePath}!`);
  }
}

module.exports = {
  devtool: "eval-source-map",
  mode: 'development',
  entry,
  output: {
    path: "/",
    filename: "[name].js"
  },
  plugins: htmlPlugins,
  resolve: {
    alias: {
      // paper: path.resolve(__dirname, 'src/paper-modified'),
      common: path.resolve(__dirname, 'src/common'),
      images: path.resolve(__dirname, 'src/images')
    }
  },
  module: {
    rules: [
      { test: /\.js$/, exclude: /node_modules/, loader: "babel-loader" },
      {
        test: /\.(png|svg|jpg|jpeg|gif)$/,
        use: [
          'file-loader'
        ]
      }
    ]
  },
  devServer: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        pathRewrite: {'^/api' : ''}
      }
    }
  }
};
