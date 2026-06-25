const express = require('express');
const request = require('supertest');
const path = require('path');
const fs = require('fs');
const uploadRoutes = require('../routes/uploadRoutes');

const app = express();
app.use('/api/upload', uploadRoutes);


const uploadDir = path.join(__dirname, '../uploads');
app.use('/uploads', express.static(uploadDir));

async function run() {
    let passed = true;
    console.log('Starting verification...');


    try {
        console.log('\n[Test 1] Extension Sanitization (text/plain upload of .html file)...');
        const buffer = Buffer.from('<html><body><script>alert("XSS")</script></body></html>');
        const res = await request(app)
            .post('/api/upload')
            .attach('file', buffer, {
                filename: 'exploit.html',
                contentType: 'text/plain'
            });

        if (res.status === 200) {
            if (res.body.fileUrl.endsWith('.txt')) {
                console.log('✅ Passed: File saved with .txt extension.');
            } else {
                console.error('❌ Failed: File saved with extension:', path.extname(res.body.fileUrl));
                passed = false;
            }
        } else {
            console.error('❌ Failed: Upload failed with status', res.status);
            passed = false;
        }
    } catch (e) {
        console.error('❌ Error:', e);
        passed = false;
    }


    try {
        console.log('\n[Test 2] SVG Rejection (image/svg+xml)...');
        const buffer = Buffer.from('<svg><script>alert(1)</script></svg>');
        const res = await request(app)
            .post('/api/upload')
            .attach('file', buffer, {
                filename: 'malicious.svg',
                contentType: 'image/svg+xml'
            });

        if (res.status !== 200) {
             console.log('✅ Passed: SVG upload rejected with status', res.status);
        } else {
            console.error('❌ Failed: SVG upload was accepted!');
            passed = false;
        }
    } catch (e) {
        console.error('❌ Error:', e);
        passed = false;
    }


    try {
        console.log('\n[Test 3] Valid Image (image/png)...');
        const buffer = Buffer.from('fakeimagecontent');
        const res = await request(app)
            .post('/api/upload')
            .attach('file', buffer, {
                filename: 'valid.png',
                contentType: 'image/png'
            });

        if (res.status === 200) {
            if (res.body.fileUrl.endsWith('.png')) {
                console.log('✅ Passed: Valid PNG saved with .png extension.');
            } else {
                console.error('❌ Failed: Valid PNG saved with wrong extension:', path.extname(res.body.fileUrl));
                passed = false;
            }
        } else {
            console.error('❌ Failed: Valid PNG upload failed.');
            passed = false;
        }
    } catch (e) {
        console.error('❌ Error:', e);
        passed = false;
    }


    try {
        console.log('\n[Test 4] Mime Spoofing (upload .html as image/png)...');
        const buffer = Buffer.from('<html>...</html>');
        const res = await request(app)
            .post('/api/upload')
            .attach('file', buffer, {
                filename: 'exploit.html',
                contentType: 'image/png'
            });

        if (res.status === 200) {
            if (res.body.fileUrl.endsWith('.png')) {
                console.log('✅ Passed: Spoofed file saved with .png extension (harmless).');
            } else {
                 console.error('❌ Failed: Spoofed file saved with dangerous extension:', path.extname(res.body.fileUrl));
                 passed = false;
            }
        } else {
            console.error('❌ Failed: Spoofed upload failed.');
        }
    } catch (e) {
        console.error('❌ Error:', e);
        passed = false;
    }

    if (passed) {
        console.log('\n🎉 ALL TESTS PASSED');
        process.exit(0);
    } else {
        console.log('\n💥 SOME TESTS FAILED');
        process.exit(1);
    }
}

run();
