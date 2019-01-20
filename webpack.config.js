const path = require('path');
const fs = require('fs');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const basePath = './src/sketch';
const dir = fs.readdirSync(basePath);
const entry = {};
const htmlPlugins = [];
for (let i = 0; i < dir.length; i++) {
  const name = dir[i];
  const rel = path.join(basePath, name);
  if (fs.lstatSync(rel).isDirectory()) {
    const files = fs.readdirSync(rel).map(path.parse);
    const js = files.find(file => {
      return file.ext === '.js' && (file.name === 'index' || file.name === name);
    });
    const html = files.find(file => file.ext === '.html');
    // entry[path.join('sketch', name)] = path.join(__dirname, 'src/sketch', name, js.name);
    const chunkName = path.join('sketch', name);
    entry[chunkName] = './' + path.join('src/sketch', name, js.name);
    const filename = name + '.html';
    const template = './' + path.join(rel, html.base);
    htmlPlugins.push(new HtmlWebpackPlugin({
      filename,
      template,
      chunks: [chunkName]
    }));
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
      common: path.resolve(__dirname, 'src/common')
    }
  },
  module: {
    rules: [
      { test: /\.js$/, exclude: /node_modules/, loader: "babel-loader" },
      {
        test: /\.(png|svg|jpg|gif)$/,
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
