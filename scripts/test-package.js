#!/usr/bin/env node

/**
 * Package integrity test script
 * Validates the built package structure and content
 */

const fs = require('fs');
const path = require('path');

const REQUIRED_FILES = [
	'dist/nodes/Pinterest/Pinterest.node.js',
	'dist/credentials/PinterestOAuth2Api.credentials.js',
	'package.json',
	'README.md',
	'LICENSE.md'
];

const REQUIRED_DIRS = [
	'dist',
	'dist/nodes',
	'dist/nodes/Pinterest',
	'dist/credentials'
];

function testPackageStructure() {
	console.log('🔍 Testing package structure...');

	// Check required directories
	for (const dir of REQUIRED_DIRS) {
		if (!fs.existsSync(dir)) {
			console.error(`❌ Missing required directory: ${dir}`);
			process.exit(1);
		}
		console.log(`✅ Directory exists: ${dir}`);
	}

	// Check required files
	for (const file of REQUIRED_FILES) {
		if (!fs.existsSync(file)) {
			console.error(`❌ Missing required file: ${file}`);
			process.exit(1);
		}
		console.log(`✅ File exists: ${file}`);
	}
}

function testPackageJson() {
	console.log('\n📦 Testing package.json...');

	const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

	// Check required fields
	const requiredFields = ['name', 'version', 'description', 'main', 'files', 'n8n'];
	for (const field of requiredFields) {
		if (!packageJson[field]) {
			console.error(`❌ Missing required field in package.json: ${field}`);
			process.exit(1);
		}
		console.log(`✅ Package.json field exists: ${field}`);
	}

	// Check n8n configuration
	if (!packageJson.n8n.nodes || packageJson.n8n.nodes.length === 0) {
		console.error('❌ No nodes defined in package.json n8n configuration');
		process.exit(1);
	}

	if (!packageJson.n8n.credentials || packageJson.n8n.credentials.length === 0) {
		console.error('❌ No credentials defined in package.json n8n configuration');
		process.exit(1);
	}

	console.log('✅ Package.json n8n configuration is valid');
}

function testNodeFiles() {
	console.log('\n🔧 Testing node files...');

	// Test Pinterest node
	const pinterestNodePath = 'dist/nodes/Pinterest/Pinterest.node.js';
	if (!fs.existsSync(pinterestNodePath)) {
		console.error(`❌ Pinterest node file not found: ${pinterestNodePath}`);
		process.exit(1);
	}

	const nodeContent = fs.readFileSync(pinterestNodePath, 'utf8');
	if (!nodeContent.includes('Pinterest')) {
		console.error('❌ Pinterest node file does not contain Pinterest class');
		process.exit(1);
	}

	console.log('✅ Pinterest node file is valid');
}

function testCredentialFiles() {
	console.log('\n🔐 Testing credential files...');

	// Test Pinterest credentials
	const credPath = 'dist/credentials/PinterestOAuth2Api.credentials.js';
	if (!fs.existsSync(credPath)) {
		console.error(`❌ Pinterest credentials file not found: ${credPath}`);
		process.exit(1);
	}

	const credContent = fs.readFileSync(credPath, 'utf8');
	if (!credContent.includes('PinterestOAuth2Api')) {
		console.error('❌ Pinterest credentials file does not contain PinterestOAuth2Api class');
		process.exit(1);
	}

	console.log('✅ Pinterest credentials file is valid');
}

function testAssets() {
	console.log('\n🎨 Testing assets...');

	// Check for Pinterest icon
	const iconPath = 'dist/nodes/Pinterest/pinterest.svg';
	if (fs.existsSync(iconPath)) {
		console.log('✅ Pinterest icon found');
	} else {
		console.warn('⚠️  Pinterest icon not found (optional)');
	}
}

function main() {
	console.log('🚀 Starting package integrity tests...\n');

	try {
		testPackageStructure();
		testPackageJson();
		testNodeFiles();
		testCredentialFiles();
		testAssets();

		console.log('\n🎉 All package integrity tests passed!');
		console.log('📦 Package is ready for distribution');
	} catch (error) {
		console.error('\n💥 Package integrity test failed:', error.message);
		process.exit(1);
	}
}

if (require.main === module) {
	main();
}

module.exports = {
	testPackageStructure,
	testPackageJson,
	testNodeFiles,
	testCredentialFiles,
	testAssets
};
