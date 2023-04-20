module.exports = {
    spec: './test/**/*.test.*',
    exclude: './test/**/skip/**/*',
    parallel: true,
    timeout: '300',
    watch: true,
    'watch-files': './src/**/*.*',
    //reporter: 'dot',
}
