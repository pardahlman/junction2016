const webpack = require('webpack')
const WebpackDevServer = require('webpack-dev-server')
const config = require('./development.config')

const server = new WebpackDevServer(webpack(config), {
  publicPath: config.output.publicPath,
  contentBase: 'static',
  hot: true
})

const port = process.env.PORT || 9000

server.listen(port, () =>
  console.log(`Server listening at port ${port}`)
)
