module.exports = {
    files: 'ui-components/**',
    targets: ['react', 'vue', 'webcomponent'],
    dest: 'output',
    options: {
        react: {
            typescript: true,
            stylesType: 'style-tag'
        },
        vue: {
            typescript: true,
            api: 'composition',
        },
        webcomponent: {
            typescript: true,
        }
    }
};
