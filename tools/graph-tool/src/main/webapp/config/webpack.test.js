var helpers = require('./helpers');
var webpack = require('webpack');
var ContextReplacementPlugin = webpack.ContextReplacementPlugin;
var DefinePlugin = webpack.DefinePlugin;

module.exports = {
    devtool: 'inline-source-map',

    resolve: {
        extensions: ['.ts', '.js']
    },

    module: {
        loaders: [
            {
                test: /\.ts$/,
                loaders: ['awesome-typescript-loader', 'angular2-template-loader']
            },
            {
                test: /\.html$/,
                loader: 'html-loader'

            },
            {
                test: /\.(png|jpe?g|gif|svg|woff|woff2|ttf|eot|ico)$/,
                loader: 'null-loader'
            },
            {
                test: /\.css$/,
                exclude: /node_modules/,
                loader: 'raw-loader'
            },
            {
                test: /\.scss$/,
                exclude: /node_modules/,
                loaders: [ 'raw-loader', 'sass-loader' ]
            }
        ]
    },
    plugins: [
        // This is needed to suppress warning caused by some angular issue
        // see https://github.com/angular/angular/issues/11580
        new ContextReplacementPlugin(
            // The (\\|\/) piece accounts for path separators in *nix and Windows
            /angular(\\|\/)core(\\|\/)(esm(\\|\/)src|src)(\\|\/)linker/,
            helpers.root('./src'), // location of your src
            {} // a map of your routes
        ),
        new DefinePlugin({
            'process.env': {
                ENV: JSON.stringify('test')
            }
        })
    ]
};
