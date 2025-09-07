const webpack = require('webpack');

module.exports = function override(config, env) {
    config.target = 'electron-renderer';
    
    // Add fallbacks for browser environment
    config.resolve.fallback = {
        ...config.resolve.fallback,
        "process": require.resolve("process/browser.js"),
        "events": require.resolve("events/"),
        "fs": false,
        "child_process": false,
        "net": false,
        "tls": false
    };
    
    // Add alias to handle framer-motion's process/browser import
    config.resolve.alias = {
        ...config.resolve.alias,
        "process/browser": require.resolve("process/browser.js"),
    };
    
    // Define global for browser environment
    config.plugins = [
        ...config.plugins,
        new webpack.DefinePlugin({
            global: 'globalThis',
        }),
        new webpack.ProvidePlugin({
            process: 'process/browser.js',
            EventEmitter: ['events', 'EventEmitter'],
        }),
    ];
    
    return config;
};
