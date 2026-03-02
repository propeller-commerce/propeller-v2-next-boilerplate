module.exports = {
    files: 'ui-components/**',
    targets: ['react', 'vue'],
    dest: 'output',
    options: {
        react: {
            typescript: true,
            stylesType: 'style-tag',
            prettier: false,
        },
        vue: {
            typescript: true,
            api: 'composition',
            prettier: false,
        }
    }
};
