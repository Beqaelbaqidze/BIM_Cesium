const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: './src/index.js',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'public'),
    clean: true,
  },
  mode: 'development',
  devServer: {
    static: path.join(__dirname, 'public'),
    port: 8081,
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/index.html',
    }),
    new CopyWebpackPlugin({
      patterns: [
        { from: 'node_modules/cesium/Build/Cesium/Workers', to: 'static/Cesium/Workers' },
        { from: 'node_modules/cesium/Build/Cesium/ThirdParty', to: 'static/Cesium/ThirdParty' },
        { from: 'node_modules/cesium/Build/Cesium/Assets', to: 'static/Cesium/Assets' },
        { from: 'node_modules/cesium/Build/Cesium/Widgets', to: 'static/Cesium/Widgets' },
      ],
    }),
    
  ]
};
