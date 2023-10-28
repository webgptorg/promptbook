import typescript from '@rollup/plugin-typescript';

export default ['node', 'browser' /* <- !!! Automatic from _packages */].map((name) => ({
    input: `./src/_packages/${name}.index.ts`,
    output: [
        {
            file: `./packages/${name}/umd/index.umd.js`,
            name: `ptp-${name}`,
            format: 'umd',
            sourcemap: true,
        },
        {
            file: `./packages/${name}/esm/index.es.js`,
            format: 'es',
            sourcemap: true,
        },
    ],
    plugins: [typescript({ tsconfig: './tsconfig.json' })],
}));
