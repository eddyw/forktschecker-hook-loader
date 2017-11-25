# Fork TS Checker Hook Loader

## What it does?

Allows Webpack to handle errors from ForkTsChecker and HappyPack while these run in a separate process.

## Description

Works together with [Fork Ts Checker Webpack Plugin](https://github.com/Realytics/fork-ts-checker-webpack-plugin), [HappyPack](https://github.com/amireh/happypack), and [ts-loader](https://github.com/TypeStrong/ts-loader). While ForkTSChecker works in a separate process, the loader listens for the hook `fork-ts-checker-receive` and `fork-ts-checker-done` right before the files are emitted, so it's possible to pass control to Webpack to handle errors and warnings.

## Installation
Install the following packages:
```bash
npm install --save-dev forktschecker-hook-loader
npm install --save-dev fork-ts-checker-webpack-plugin happypack cache-loader
```

## Examples

You can check an example in the [example folder](https://github.com/eddyw/forktschecker-hook-loader/tree/master/example)

Alternatively, you can:
1. Clone the repository
2. Run `npm install`
3. Run `npm run webpack:example` to run webpack in `--watch` mode
4. The output can be seen in the `/example/dist` folder

## Configuration

1. Create a Webpack Configuration file (webpack.config.js):
```javascript
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin')
const HappyPack = require('happypack')
const webpack = require('webpack')

module.exports = {
  stats,
  entry: './entry.tsx',
  output: {
    filename: 'entry.bundle.js',
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        use: [
          { loader: 'cache-loader' },
          { loader: 'happypack/loader?id=ts' },
          { loader: 'forktschecker-hook-loader' },
        ],
      },
    ],
  },
  plugins: [
    new webpack.NoEmitOnErrorsPlugin(), // < !Doesn't emit on errors
    new HappyPack({
      id: 'ts',
      loaders: [
        {
          loader: 'ts-loader',
          options: {
            configFile: './tsconfig.json',
            happyPackMode: true,
          },
        },
      ],
    }),
    new ForkTsCheckerWebpackPlugin({
      checkSyntacticErrors: true,
      tsconfig: './tsconfig.json',
      tslint: './tslint.json',
    }),
    new webpack.WatchIgnorePlugin([
      /\.d\.ts$/,
      /.js$/,
    ]),
  ],
}
```

2. Add a tsconfig.json file. For example:
```json
{
  "compilerOptions": {
    "target": "es5",
    "lib": ["es6"],
    "moduleResolution": "node",
  },
  "exclude": [
    "node_modules"
  ]
}
```

3. Run Webpack:
```bash
webpack --config webpack.config.js
```
or in watch mode:
```bash
webpack --config webpack.config.js --watch
```

## Loader Options

### emitInWatchMode (boolean) (default = false)
Outputs warnings and errors when Webpack is run with `--watch` flag. It's useful when `ForkTsCheckerWebpackPlugin` option `silent` is set to `true`.

Example:
```javascript
{
  loader: 'forktschecker-hook-loader',
  options: {
    emitInWatchMode: true,
  },
}
```

### useEmitFormatter (boolean|string) (default = false)
If set to `true`, uses the formatter specified in `ForkTsCheckerWebpackPlugin` option `formatter` (which by default is `formatter: "default"`).

This loader provides an additional formatter when `useEmitFormatter` is a `string` and the value is `default`.

When this option is set to `true` or `"default"`, it will format the emitted errors and warnings. This is different from logging which doesn't report errors or warnings to Webpack.

Example:
```javascript
{
  loader: 'forktschecker-hook-loader',
  options: {
    useEmitFormatter: true,
  },
},
```

Another example:
```javascript
{
  loader: 'forktschecker-hook-loader',
  options: {
    useEmitFormatter: 'default',
  },
},
```

## License
MIT License
