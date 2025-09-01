const path = require('path');
const { task, src, dest, parallel } = require('gulp');

// Main build task
task('build:icons', parallel(copyNodeIcons, copyCredentialIcons));

// Copy node icons and assets
function copyNodeIcons() {
	const nodeSource = path.resolve('nodes', '**', '*.{png,svg,json}');
	const nodeDestination = path.resolve('dist', 'nodes');

	return src(nodeSource, { base: 'nodes' }).pipe(dest(nodeDestination));
}

// Copy credential icons and assets
function copyCredentialIcons() {
	const credSource = path.resolve('credentials', '**', '*.{png,svg,json}');
	const credDestination = path.resolve('dist', 'credentials');

	return src(credSource, { base: 'credentials' }).pipe(dest(credDestination));
}

// Copy all assets (icons, JSON files, etc.)
task('build:assets', parallel(copyNodeIcons, copyCredentialIcons));

// Clean task
task('clean', function() {
	const { deleteSync } = require('del');
	return deleteSync(['dist/**', '!dist']);
});

// Default task
task('default', task('build:icons'));
