/**
 * migrate-to-oracle.js
 *
 * Migrates all collections from MongoDB Atlas → Oracle ADB 26ai (MongoDB API)
 * Uses the native mongodb driver — no mongodump/mongorestore needed.
 *
 * Usage:  node migrate-to-oracle.js
 */

const { MongoClient } = require('mongodb');


const SOURCE_URI =
  'mongodb+srv://chitkullakshya_db_user:GAJbowG2cvz59ub0@zync.qgvjh6f.mongodb.net/?appName=Zync';
const SOURCE_DB = 'zync-production';


const TARGET_URI =
  'mongodb://ZYNC_USER:Zync_Backend_Pass_2026%21@G76E39710C3F23C-ZYNCDB.adb.ap-hyderabad-1.oraclecloudapps.com:27017/ZYNC_USER?authMechanism=PLAIN&authSource=$external&ssl=true&retryWrites=false&loadBalanced=true';
const TARGET_DB = 'ZYNC_USER';


const BATCH_SIZE = 100;

async function migrate() {
  const sourceClient = new MongoClient(SOURCE_URI);
  const targetClient = new MongoClient(TARGET_URI);

  try {

    console.log('🔗 Connecting to Atlas (source)...');
    await sourceClient.connect();
    const sourceDb = sourceClient.db(SOURCE_DB);
    console.log('✅ Atlas connected.\n');

    console.log('🔗 Connecting to Oracle ADB (target)...');
    await targetClient.connect();
    const targetDb = targetClient.db(TARGET_DB);
    console.log('✅ Oracle ADB connected.\n');


    const collections = await sourceDb.listCollections().toArray();
    console.log(`Found ${collections.length} collections to migrate:\n`);
    for (const col of collections) {
      const count = await sourceDb.collection(col.name).countDocuments();
      console.log(`  • ${col.name}  (${count} docs)`);
    }
    console.log('');


    let totalDocs = 0;
    const results = [];

    for (const colInfo of collections) {
      const name = colInfo.name;
      const sourceCol = sourceDb.collection(name);
      const targetCol = targetDb.collection(name);
      const docCount = await sourceCol.countDocuments();

      if (docCount === 0) {
        console.log(`⏭️  ${name}: 0 docs — skipping.`);
        results.push({ collection: name, status: 'skipped (empty)', count: 0 });
        continue;
      }

      console.log(`📦 Migrating "${name}" (${docCount} docs)...`);

      let migrated = 0;
      let batch = [];
      const cursor = sourceCol.find();

      while (await cursor.hasNext()) {
        const doc = await cursor.next();
        batch.push(doc);

        if (batch.length >= BATCH_SIZE) {
          try {
            await targetCol.insertMany(batch, { ordered: false });
          } catch (err) {

            if (err.code !== 11000) {
              console.error(
                `   ⚠️  Batch insert error in "${name}": ${err.message}`
              );
            }
          }
          migrated += batch.length;
          process.stdout.write(`   ${migrated}/${docCount}\r`);
          batch = [];
        }
      }


      if (batch.length > 0) {
        try {
          await targetCol.insertMany(batch, { ordered: false });
        } catch (err) {
          if (err.code !== 11000) {
            console.error(
              `   ⚠️  Batch insert error in "${name}": ${err.message}`
            );
          }
        }
        migrated += batch.length;
      }

      console.log(`   ✅ ${name}: ${migrated} docs migrated.`);
      totalDocs += migrated;
      results.push({ collection: name, status: 'migrated', count: migrated });
    }


    console.log('\n══════════════════════════════════════════════');
    console.log('  MIGRATION COMPLETE');
    console.log('══════════════════════════════════════════════');
    console.log(`  Total documents migrated: ${totalDocs}`);
    console.log('');
    for (const r of results) {
      console.log(`  ${r.collection}: ${r.count} docs (${r.status})`);
    }
    console.log('══════════════════════════════════════════════\n');
  } catch (err) {
    console.error('❌ Migration failed:', err);
  } finally {
    await sourceClient.close();
    await targetClient.close();
    console.log('Connections closed.');
  }
}

migrate();
