require('dotenv').config();
const admin = require('firebase-admin');


if (!admin.apps.length) {
    if (process.env.GCP_SERVICE_ACCOUNT_KEY) {
        let serviceAccount = process.env.GCP_SERVICE_ACCOUNT_KEY;
        if (typeof serviceAccount === 'string') {
            serviceAccount = JSON.parse(serviceAccount);
        }
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
        });
    } else {
        console.error('ERROR: GCP_SERVICE_ACCOUNT_KEY env var is required.');
        process.exit(1);
    }
}

const corsConfig = [
    {
        origin: [
            'http://localhost:8081',
            'http://localhost:5173',
            'http://localhost:3000',
            'https://zync-meet.vercel.app'
        ],
        method: ['GET', 'POST', 'PUT', 'DELETE', 'HEAD'],
        maxAgeSeconds: 3600,
        responseHeader: ['Content-Type', 'Authorization', 'x-goog-resumable']
    }
];

async function setCors() {
    const bucketNames = [
        'zync-7c9b0.appspot.com',
        'zync-7c9b0.firebasestorage.app',
    ];

    for (const bucketName of bucketNames) {
        try {
            console.log(`Trying bucket: ${bucketName}...`);
            const bucket = admin.storage().bucket(bucketName);
            await bucket.setCorsConfiguration(corsConfig);
            console.log(`✅ CORS set successfully on bucket: ${bucketName}`);

            const [metadata] = await bucket.getMetadata();
            console.log('Current CORS config:', JSON.stringify(metadata.cors, null, 2));
            process.exit(0);
        } catch (error) {
            console.log(`  ❌ ${bucketName}: ${error.message}`);
        }
    }

    console.error('\n❌ Could not set CORS on any bucket.');
    process.exit(1);
}

setCors();
