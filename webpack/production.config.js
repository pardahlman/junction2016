const path = require('path')
const webpack = require('webpack')

const JS_ROOT = path.resolve(__dirname, '../client')

module.exports = {
  module: {
    loaders: [{
      test: /\.js$/,
      loader: 'babel-loader',
      include: JS_ROOT
    }]
  },
  devtool: 'source-map',
  entry: './client/main',
  output: {
    path: path.resolve(__dirname, '../static/js'),
    filename: 'bundle.js'
  },
  plugins: [
    new webpack.HotModuleReplacementPlugin(),
    new webpack.NamedModulesPlugin()
  ]
}
