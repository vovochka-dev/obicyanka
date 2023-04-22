module.exports = {
    spec: './test/**/*.test.*',
    exclude: './test/**/skip/**/*',
    parallel: true,
    watch: true,
    'watch-files': './src/**/*.*',
    //reporter: 'dot',
}
