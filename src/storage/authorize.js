/**
 * Authorization Script
 * Run this to authorize with Google Drive
 */

const { googleDriveOAuth } = require('./index');

async function main() {
    console.log('\n🔐 Starting Google Drive Authorization...\n');

    try {
        // This will trigger the authorization flow
        await googleDriveOAuth.initializeDrive();

        console.log('\n✅ Authorization complete! You can now use Google Drive storage.');

        // Test by listing files
        console.log('\n📋 Testing by listing your files...');
        const files = await googleDriveOAuth.listFiles(null, 5);
        console.log(`Found ${files.length} files in your Drive.`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Authorization failed:', error.message);
        process.exit(1);
    }
}

main();
