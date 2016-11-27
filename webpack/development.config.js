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
  devtool: 'cheap-module-eval-source-map',
  entry: [
    `webpack-dev-server/client?http://localhost:${process.env.PORT || 9000}`,
    'webpack/hot/only-dev-server',
    './client/main'
  ],
  output: {
    path: path.resolve(__dirname, '../dist'),
    filename: 'bundle.js',
    publicPath: '/js/'
  },
  plugins: [
    new webpack.HotModuleReplacementPlugin(),
    new webpack.NamedModulesPlugin()
  ]
}
