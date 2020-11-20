/*
 * (c) 2020 Open AR Cloud
 * This code is licensed under MIT license (see LICENSE.md for details)
 */

import svelte from 'rollup-plugin-svelte';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import livereload from 'rollup-plugin-livereload';
import { terser } from 'rollup-plugin-terser';
import copy from 'rollup-plugin-copy';
import {config} from 'dotenv';
import postcss from 'rollup-plugin-postcss';
import replace from '@rollup/plugin-replace';
import {routify} from '@sveltech/routify';
import cleaner from 'rollup-plugin-cleaner';
import fs from "fs";
// import analyze from 'rollup-plugin-analyzer';

import path from 'path';


const production = !process.env.ROLLUP_WATCH;
const cesiumBuildPath = 'node_modules/cesium/Build/Cesium';


function serve() {
	let server;
	
	function toExit() {
		if (server) server.kill(0);
	}

	return {
		writeBundle() {
			if (server) return;
			server = require('child_process').spawn('npm', ['run', 'start', '--', '--dev'], {
				stdio: ['ignore', 'inherit', 'inherit'],
				shell: true
			});

			process.on('SIGTERM', toExit);
			process.on('exit', toExit);
		}
	};
}

export default {
	input: 'src/main.js',
	output: {
		sourcemap: !production,
		format: 'esm',
		name: 'app',
		dir: 'public/build/'
	},
	plugins: [
		replace({
			// stringify the object
			oscp_app: JSON.stringify({
				env: {
					isProd: production,
					...config().parsed // attached the .env config
				}
			})
		}),

		svelte({
			// enable run-time checks when not in production
			dev: !production,
			// we'll extract any component CSS out into
			// a separate file - better for performance
			css: css => {
				css.write('bundle.css');
			}
		}),

		//Dynamic import support
		routify({ dynamicImports : true}),

		//Clean the chunk files on changes
		cleaner({
			targets: [
				'public/build/'
			]
		}),

		// If you have external dependencies installed from
		// npm, you'll most likely need these plugins. In
		// some cases you'll need additional configuration -
		// consult the documentation for details:
		// https://github.com/rollup/plugins/tree/master/packages/commonjs
		resolve({
			browser: true,
			dedupe: ['svelte'],
			preferBuiltins: false
		}),

		postcss({
			extensions: [ '.css' ]
		}),

		copy({
			targets: [
				{ src: path.join(cesiumBuildPath, 'Assets'), dest: 'public/' },
				{ src: path.join(cesiumBuildPath, 'ThirdParty'), dest: 'public/' },
				{ src: path.join(cesiumBuildPath, 'Widgets'), dest: 'public/' },
				{ src: path.join(cesiumBuildPath, 'Workers'), dest: 'public/' },
			]
		}),

		commonjs(),
		json(),

		// analyze({
		// 	summaryOnly: true
		// }),

		// In dev mode, call `npm run start` once
		// the bundle has been generated
		!production && serve(),

		// Watch the `public` directory and refresh the
		// browser on changes when not in production
		!production && livereload({
			watch: 'public',
			https: {
				key: fs.readFileSync('localhost.key'),
				cert: fs.readFileSync('localhost.cert')
			}
		}),

		// If we're building for production (npm run build
		// instead of npm run dev), minify
		production && terser()
	],
	watch: {
		clearScreen: false
	}
};
