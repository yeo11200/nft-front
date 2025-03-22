const { override, addWebpackResolve } = require("customize-cra");
const webpack = require("webpack");

module.exports = override(
  addWebpackResolve({
    fallback: {
      stream: require.resolve("stream-browserify"),
      https: require.resolve("https-browserify"),
      http: require.resolve("stream-http"),
      url: require.resolve("url/"),
      crypto: require.resolve("crypto-browserify"),
      buffer: require.resolve("buffer/"),
      process: require.resolve("process/browser"),
    },
  }),
  (config) => {
    config.plugins.push(
      new webpack.ProvidePlugin({
        process: "process/browser",
        Buffer: ["buffer", "Buffer"],
      })
    );
    return config;
  }
);
