import typescript from 'rollup-plugin-typescript';
import resolve from 'rollup-plugin-node-resolve';
import copy from 'rollup-plugin-copy';
import builtins from 'rollup-plugin-node-builtins';
import replace from 'rollup-plugin-replace';
import { uglify } from 'rollup-plugin-uglify'

export default {
    input: 'index.ts',
    output: {
        file: 'dist/ngx-tslint-report.js',
        format: 'iife',
        banner: '#!/usr/bin/env node',
        name: 'ngxtslintreport'
    },
    plugins: [
        typescript(),
        resolve(),
        copy({
            "src/app/config/": "dist/config/",
            "src/app/templates/": "dist/templates/",
            verbose: true
        }),
        builtins(),
        replace({
            delimiters: ['', ''],
            '#!/usr/bin/env node': ''
        }),
        uglify()
    ]
}