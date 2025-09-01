#!/usr/bin/env node

/**
 * Deployment test script
 * Tests the package as if it were installed from npm
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');

function createTempDir() {
	const tempDir = path.join(os.tmpdir(), `n8n-pinterest-test-${Date.now()}`);
	fs.mkdirSync(tempDir, { recursive: true });
	return tempDir;
}

function testPackageInstallation() {
	console.log('📦 Testing package installation...');

	const tempDir = createTempDir();
	const packagePath = path.resolve('.');

	try {
		// Create a test package.json
		const testPackageJson = {
			name: 'test-pinterest-installation',
			version: '1.0.0',
			dependencies: {
				'n8n-workflow': 'latest'
			}
		};

		fs.writeFileSync(
			path.join(tempDir, 'package.json'),
			JSON.stringify(testPackageJson, null, 2)
		);

		// Pack the current package
		console.log('📦 Packing current package...');
		const packResult = execSync('npm pack --ignore-scripts', {
			cwd: packagePath,
			encoding: 'utf8'
		}).trim();

		const tarballPath = path.join(packagePath, packResult);

		// Install the packed package
		console.log('📥 Installing packed package...');
		execSync(`npm install "${tarballPath}"`, {
			cwd: tempDir,
			stdio: 'inherit'
		});

		// Test that the package can be required
		console.log('🔍 Testing package import...');
		const testScript = `
			const path = require('path');
			const packagePath = path.join(__dirname, 'node_modules', 'n8n-nodes-pinterest');

			// Test that main files exist
			const mainFile = require.resolve('n8n-nodes-pinterest');
			console.log('Main file:', mainFile);

			// Test that dist files exist
			const distPath = path.join(packagePath, 'dist');
			const fs = require('fs');

			if (!fs.existsSync(distPath)) {
				throw new Error('dist directory not found');
			}

			const nodeFile = path.join(distPath, 'nodes', 'Pinterest', 'Pinterest.node.js');
			const credFile = path.join(distPath, 'credentials', 'PinterestOAuth2Api.credentials.js');

			if (!fs.existsSync(nodeFile)) {
				throw new Error('Pinterest node file not found: ' + nodeFile);
			}

			if (!fs.existsSync(credFile)) {
				throw new Error('Pinterest credentials file not found: ' + credFile);
			}

			console.log('✅ All required files found');
			console.log('✅ Package installation test passed');
		`;

		fs.writeFileSync(path.join(tempDir, 'test.js'), testScript);
		execSync('node test.js', {
			cwd: tempDir,
			stdio: 'inherit'
		});

		// Cleanup
		fs.unlinkSync(tarballPath);
		fs.rmSync(tempDir, { recursive: true, force: true });

		console.log('✅ Package installation test completed successfully');
		return true;

	} catch (error) {
		console.error('❌ Package installation test failed:', error.message);

		// Cleanup on error
		try {
			fs.rmSync(tempDir, { recursive: true, force: true });
		} catch (cleanupError) {
			console.warn('⚠️  Failed to cleanup temp directory:', cleanupError.message);
		}

		return false;
	}
}

function testPackageSize() {
	console.log('\n📏 Testing package size...');

	try {
		// Pack the package to get size info
		const packResult = execSync('npm pack --dry-run --ignore-scripts', {
			encoding: 'utf8'
		});

		console.log('Package contents:');
		console.log(packResult);

		// Check if package size is reasonable (should be under 10MB)
		const sizeMatch = packResult.match(/package size:\s*(\d+(?:\.\d+)?)\s*(\w+)/i);
		if (sizeMatch) {
			const size = parseFloat(sizeMatch[1]);
			const unit = sizeMatch[2].toLowerCase();

			let sizeInMB = size;
			if (unit === 'kb') {
				sizeInMB = size / 1024;
			} else if (unit === 'b') {
				sizeInMB = size / (1024 * 1024);
			}

			console.log(`📦 Package size: ${size} ${unit} (${sizeInMB.toFixed(2)} MB)`);

			if (sizeInMB > 10) {
				console.warn('⚠️  Package size is quite large (>10MB). Consider optimizing.');
			} else {
				console.log('✅ Package size is reasonable');
			}
		}

		return true;
	} catch (error) {
		console.error('❌ Package size test failed:', error.message);
		return false;
	}
}

function testPackageMetadata() {
	console.log('\n📋 Testing package metadata...');

	try {
		const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

		// Check for common issues
		const issues = [];

		if (packageJson.name === 'n8n-nodes-starter') {
			issues.push('Package name is still the default starter name');
		}

		if (packageJson.author && packageJson.author.email === 'developer@example.com') {
			issues.push('Author email is still the default example');
		}

		if (packageJson.repository && packageJson.repository.url.includes('starter')) {
			issues.push('Repository URL still references starter template');
		}

		if (!packageJson.keywords || packageJson.keywords.length < 3) {
			issues.push('Package should have more descriptive keywords');
		}

		if (issues.length > 0) {
			console.warn('⚠️  Metadata issues found:');
			issues.forEach(issue => console.warn(`   - ${issue}`));
		} else {
			console.log('✅ Package metadata looks good');
		}

		return issues.length === 0;
	} catch (error) {
		console.error('❌ Package metadata test failed:', error.message);
		return false;
	}
}

function main() {
	console.log('🚀 Starting deployment tests...\n');

	const tests = [
		testPackageSize,
		testPackageMetadata,
		testPackageInstallation
	];

	let allPassed = true;

	for (const test of tests) {
		if (!test()) {
			allPassed = false;
		}
	}

	console.log('\n' + '='.repeat(50));

	if (allPassed) {
		console.log('🎉 All deployment tests passed! Package is ready for publishing.');
		process.exit(0);
	} else {
		console.log('💥 Some deployment tests failed. Please fix the issues before publishing.');
		process.exit(1);
	}
}

if (require.main === module) {
	main();
}

module.exports = {
	testPackageInstallation,
	testPackageSize,
	testPackageMetadata
};
