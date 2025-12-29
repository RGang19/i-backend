/**
 * Example: How to use Google Drive Storage
 * 
 * Run this file: node src/storage/example.js
 */

const { googleDrive } = require('./index');

async function main() {
    try {
        console.log('🚀 Google Drive Storage Examples\n');

        // ==========================================
        // 1. CREATE A FOLDER
        // ==========================================
        console.log('📁 Creating a folder...');
        const folder = await googleDrive.createFolder('MyAppUploads');
        console.log('Folder created:', folder);
        const folderId = folder.id;

        // ==========================================
        // 2. UPLOAD A FILE
        // ==========================================
        console.log('\n📤 Uploading a file...');
        // Create a test file first
        const fs = require('fs');
        fs.writeFileSync('test-upload.txt', 'Hello from Google Drive Storage!');

        const uploadedFile = await googleDrive.uploadFile(
            'test-upload.txt',
            'my-test-file.txt',
            'text/plain',
            folderId
        );
        console.log('Uploaded file:', uploadedFile);

        // ==========================================
        // 3. UPLOAD A BUFFER (for multer uploads)
        // ==========================================
        console.log('\n📤 Uploading from buffer...');
        const buffer = Buffer.from('This is uploaded from a buffer!');
        const bufferFile = await googleDrive.uploadBuffer(
            buffer,
            'buffer-file.txt',
            'text/plain',
            folderId
        );
        console.log('Buffer uploaded:', bufferFile);

        // ==========================================
        // 4. LIST FILES
        // ==========================================
        console.log('\n📋 Listing files in folder...');
        const files = await googleDrive.listFiles(folderId);
        console.log('Files:', files);

        // ==========================================
        // 5. MAKE FILE PUBLIC
        // ==========================================
        console.log('\n🌐 Making file public...');
        const publicUrl = await googleDrive.makePublic(uploadedFile.id);
        console.log('Public URL:', publicUrl);

        // ==========================================
        // 6. DOWNLOAD FILE
        // ==========================================
        console.log('\n📥 Downloading file...');
        await googleDrive.downloadFile(uploadedFile.id, 'downloaded-file.txt');

        // ==========================================
        // 7. SEARCH FILES
        // ==========================================
        console.log('\n🔍 Searching files...');
        const searchResults = await googleDrive.searchFiles('test');
        console.log('Search results:', searchResults);

        // ==========================================
        // 8. DELETE FILE (cleanup)
        // ==========================================
        console.log('\n🗑️ Cleaning up...');
        await googleDrive.deleteFile(uploadedFile.id);
        await googleDrive.deleteFile(bufferFile.id);
        await googleDrive.deleteFile(folderId);
        fs.unlinkSync('test-upload.txt');
        fs.unlinkSync('downloaded-file.txt');
        console.log('Cleanup complete!');

        console.log('\n✅ All examples completed successfully!');
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

// Run the examples
main();
