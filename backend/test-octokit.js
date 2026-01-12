require('dotenv').config();

async function testOctokit() {
    const appId = process.env.GITHUB_APP_ID;
    let privateKey = process.env.GITHUB_PRIVATE_KEY;

    console.log('--- Before any processing ---');
    console.log('Type:', typeof privateKey);
    console.log('Length:', privateKey?.length);
    console.log('Contains literal backslash-n:', privateKey?.includes('\\n'));
    console.log('Number of actual newlines:', (privateKey?.match(/\n/g) || []).length);

    // Try different replacement strategies
    // Strategy 1: Replace literal \n (backslash + n) with actual newline
    let key1 = privateKey.replace(/\\n/g, '\n');
    console.log('\n--- Strategy 1: replace(/\\\\n/g, \\n) ---');
    console.log('Lines:', key1.split('\n').length);

    // Strategy 2: Also handle double-escaped \\n
    let key2 = privateKey.replace(/\\\\n/g, '\n').replace(/\\n/g, '\n');
    console.log('\n--- Strategy 2: double replace ---');
    console.log('Lines:', key2.split('\n').length);

    // Use the key that has proper line count (27 for RSA)
    const finalKey = key1.split('\n').length === 27 ? key1 : key2;
    console.log('\n--- Using key with', finalKey.split('\n').length, 'lines ---');
    console.log('First line:', finalKey.split('\n')[0]);
    console.log('Last line:', finalKey.split('\n').slice(-1)[0]);

    try {
        const { App } = await import('octokit');
        const app = new App({ appId, privateKey: finalKey });

        const installationId = 103830528;
        console.log('\n--- Testing with installation ID:', installationId, '---');

        const octokit = await app.getInstallationOctokit(installationId);
        console.log('Got octokit instance');

        const { data } = await octokit.request('GET /installation/repositories', { per_page: 5 });
        console.log('SUCCESS! Found', data.total_count, 'repos');
        console.log('First repos:', data.repositories.slice(0, 3).map(r => r.full_name));
    } catch (e) {
        console.error('\nERROR:', e.message);
        if (e.response) {
            console.error('Status:', e.response.status);
        }
    }
}

testOctokit();
