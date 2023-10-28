import typescript from '@rollup/plugin-typescript';
import { readdirSync } from 'fs';
import { join } from 'path';

const packages = readdirSync(join(__dirname, 'src/_packages'), { recursive: false, withFileTypes: true })
    .filter((dirent) => dirent.isFile())
    .filter((dirent) => dirent.name.endsWith('.index.ts'))
    .map((dirent) => dirent.name.split('.').shift());

export default packages.map((name) => ({
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
