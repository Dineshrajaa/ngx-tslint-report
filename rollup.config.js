import typescript from 'rollup-plugin-typescript';
import resolve from 'rollup-plugin-node-resolve';
import copy from 'rollup-plugin-copy';

export default {
    input: 'index.ts',
    output: {
        file: 'dist/ngx-tslint-report.js',
        format: 'cjs'
    },
    plugins: [
        typescript(),
        resolve(),
        copy({
            "src/app/config/": "dist/config/",
            "src/app/templates/": "dist/templates/",
            verbose: true
        })
    ]
}