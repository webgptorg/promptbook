import typescript from '@rollup/plugin-typescript';

export default {
    input: './src/index.ts',
    output: [
        {
            file: './dist/umd/index.js',
            name: 'spaceTrim',
            format: 'umd',
            sourcemap: true,
        },
        {
            file: './dist/esm/index.js',
            format: 'es',
            sourcemap: true,
        },
    ],
    plugins: [typescript({ tsconfig: './tsconfig.json' })],
};
