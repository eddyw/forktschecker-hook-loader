/* tslint:disable */
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin')
const HappyPack = require('happypack')
const path = require('path')
const webpack = require('webpack')
const rimraf = require('rimraf')

rimraf(path.resolve(__dirname, '..', '.cache-loader'), err => {
  if (err) throw new Error(err)
})

const stats = {
  assets: true,
  cached: true,
  cachedAssets: true,
  colors: true,
  entrypoints: false,
  errorDetails: true,
  errors: true,
  hash: true,
  modules: false,
  moduleTrace: false,
  reasons: true,
  timings: true,
  usedExports: false,
  version: true,
  warnings: true, // Setting to false, webpack stops displaying warnings
}

module.exports = {
  stats,
  context: path.resolve(__dirname),
  target: 'web',
  entry: path.resolve(__dirname, 'src', 'entry.ts'),
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'entry.bundle.js',
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
  },
  performance: {
    maxAssetSize: Infinity,
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        use: [
          { loader: 'cache-loader' },
          { loader: 'happypack/loader?id=ts' },
          {
            loader: path.resolve(__dirname, '..', 'lib', 'index.js'),
            options: {
              emitInWatchMode: true, // useful if silent: true (ForkTsCheckerWebpackPlugin~options)
              useEmitFormatter: false, // use formatter (true | false | 'default') (ForkTsCheckerWebpackPlugin~options.formatter)
            }
          },
        ],
      },
    ],
  },
  plugins: [
    new webpack.NoEmitOnErrorsPlugin(),
    new webpack.EnvironmentPlugin({
      NODE_ENV: 'development',
    }),
    new HappyPack({
      id: 'ts',
      verbose: false,
      threads: ForkTsCheckerWebpackPlugin.TWO_CPUS_FREE,
      loaders: [
        {
          loader: 'ts-loader',
          options: {
            configFile: path.resolve(__dirname, 'tsconfig.json'),
            happyPackMode: true,
          },
        },
      ],
    }),
    new ForkTsCheckerWebpackPlugin({
      async: true,
      checkSyntacticErrors: true,
      silent: true,
      threads: ForkTsCheckerWebpackPlugin.TWO_CPUS_FREE,
      tsconfig: path.resolve(__dirname, 'tsconfig.json'),
      tslint: path.resolve(__dirname, 'tslint.json'),
      watch: path.resolve(__dirname, 'src')
    }),
    new webpack.WatchIgnorePlugin([/\.d\.ts$/, /.js$/]),
  ]
}
