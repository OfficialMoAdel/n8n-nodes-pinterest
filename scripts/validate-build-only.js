#!/usr/bin/env node

/**
 * Build-only validation script
 * Validates build configuration without running tests
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function runCommand(command, description) {
	console.log(`🔄 ${description}...`);
	try {
		execSync(command, { stdio: 'inherit' });
		console.log(`✅ ${description} completed successfully`);
		return true;
	} catch (error) {
		console.error(`❌ ${description} failed:`, error.message);
		return false;
	}
}

function validateTypeScript() {
	console.log('\n📝 Validating TypeScript...');
	return runCommand('npm run type-check', 'TypeScript type checking');
}

function validateLinting() {
	console.log('\n🔍 Validating code quality...');
	return runCommand('npm run lint', 'ESLint validation');
}

function validateFormatting() {
	console.log('\n🎨 Validating code formatting...');
	return runCommand('npm run format:check', 'Prettier format checking');
}

function validateBuild() {
	console.log('\n🏗️  Validating build process...');
	return runCommand('npm run build', 'Build process');
}

function validatePackage() {
	console.log('\n📦 Validating package integrity...');
	return runCommand('npm run test:package', 'Package integrity tests');
}

function validateDistribution() {
	console.log('\n📋 Validating distribution files...');

	const distFiles = [
		'dist/nodes/Pinterest/Pinterest.node.js',
		'dist/nodes/Pinterest/Pinterest.node.d.ts',
		'dist/credentials/PinterestOAuth2Api.credentials.js',
		'dist/credentials/PinterestOAuth2Api.credentials.d.ts'
	];

	let allValid = true;

	for (const file of distFiles) {
		if (fs.existsSync(file)) {
			const stats = fs.statSync(file);
			if (stats.size > 0) {
				console.log(`✅ ${file} (${stats.size} bytes)`);
			} else {
				console.error(`❌ ${file} is empty`);
				allValid = false;
			}
		} else {
			console.error(`❌ Missing file: ${file}`);
			allValid = false;
		}
	}

	return allValid;
}

function validatePackageJson() {
	console.log('\n📄 Validating package.json...');

	try {
		const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

		// Check version format
		const versionRegex = /^\d+\.\d+\.\d+(-\w+\.\d+)?$/;
		if (!versionRegex.test(packageJson.version)) {
			console.error(`❌ Invalid version format: ${packageJson.version}`);
			return false;
		}

		// Check required fields
		const requiredFields = {
			name: 'string',
			version: 'string',
			description: 'string',
			main: 'string',
			license: 'string',
			author: 'object',
			repository: 'object',
			engines: 'object',
			n8n: 'object'
		};

		for (const [field, type] of Object.entries(requiredFields)) {
			if (!packageJson[field]) {
				console.error(`❌ Missing required field: ${field}`);
				return false;
			}
			if (typeof packageJson[field] !== type) {
				console.error(`❌ Invalid type for field ${field}: expected ${type}, got ${typeof packageJson[field]}`);
				return false;
			}
		}

		// Validate n8n configuration
		if (!packageJson.n8n.nodes || !Array.isArray(packageJson.n8n.nodes) || packageJson.n8n.nodes.length === 0) {
			console.error('❌ Invalid n8n.nodes configuration');
			return false;
		}

		if (!packageJson.n8n.credentials || !Array.isArray(packageJson.n8n.credentials) || packageJson.n8n.credentials.length === 0) {
			console.error('❌ Invalid n8n.credentials configuration');
			return false;
		}

		console.log('✅ package.json validation passed');
		return true;
	} catch (error) {
		console.error('❌ package.json validation failed:', error.message);
		return false;
	}
}

function main() {
	console.log('🚀 Starting build configuration validation...\n');

	const validations = [
		validateTypeScript,
		validateLinting,
		validateFormatting,
		validateBuild,
		validateDistribution,
		validatePackageJson,
		validatePackage
	];

	let allPassed = true;

	for (const validation of validations) {
		if (!validation()) {
			allPassed = false;
		}
	}

	console.log('\n' + '='.repeat(50));

	if (allPassed) {
		console.log('🎉 All build validations passed! Build configuration is ready.');
		process.exit(0);
	} else {
		console.log('💥 Some build validations failed. Please fix the issues before proceeding.');
		process.exit(1);
	}
}

if (require.main === module) {
	main();
}

module.exports = {
	validateTypeScript,
	validateLinting,
	validateFormatting,
	validateBuild,
	validatePackage,
	validateDistribution,
	validatePackageJson
};
