require('dotenv').config();
const mongoose = require('mongoose');

async function removeTokenIndex() {
    try {
        console.log('Connecting to MongoDB Atlas...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB Atlas\n');

        const db = mongoose.connection.db;
        const collection = db.collection('tickets');

        // List all current indexes
        console.log('Current indexes on tickets collection:');
        const indexes = await collection.indexes();
        indexes.forEach(index => {
            console.log(`  - ${index.name}:`, JSON.stringify(index.key));
        });
        console.log('');

        // Drop the problematic token_1 index
        console.log('Attempting to drop token_1 index...');
        try {
            await collection.dropIndex('token_1');
            console.log('Successfully dropped token_1 index\n');
        } catch (err) {
            if (err.code === 27) {
                console.log('Index token_1 does not exist (may have been already removed)\n');
            } else {
                throw err;
            }
        }

        // Verify indexes after cleanup
        console.log('Remaining indexes after cleanup:');
        const indexesAfter = await collection.indexes();
        indexesAfter.forEach(index => {
            console.log(`  - ${index.name}:`, JSON.stringify(index.key));
        });
        console.log('');

        await mongoose.connection.close();
        console.log('Done! You can now restart your server.');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        console.error(error);
        process.exit(1);
    }
}

console.log('='.repeat(50));
console.log('MongoDB Index Cleanup Script');
console.log('='.repeat(50));
console.log('');

removeTokenIndex();
