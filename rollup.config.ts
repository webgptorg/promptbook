import typescript from '@rollup/plugin-typescript';

export default ['node', 'browser', 'foo' /* <- !!! Remove */].map((name) => ({
    input: `./src/${name}.index.ts`,
    output: [
        {
            file: `./dist/umd/${name}.umd.js`,
            name: `ptp-${name}`,
            format: 'umd',
            sourcemap: true,
        },
        {
            file: `./dist/esm/${name}.es.js`,
            format: 'es',
            sourcemap: true,
        },
    ],
    plugins: [typescript({ tsconfig: './tsconfig.json' })],
}));
