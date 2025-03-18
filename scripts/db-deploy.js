// This script will be run during build to apply Prisma migrations
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

async function deployDatabase() {
    try {
        console.log('🔄 Starting database deployment script...');

        // Generate Prisma client first
        console.log('📦 Generating Prisma client...');
        await execAsync('npx prisma generate');
        console.log('✅ Prisma client generated successfully');

        // Push schema to database (this creates tables without requiring a migration)
        console.log('📤 Pushing schema to database...');
        await execAsync('npx prisma db push --accept-data-loss');
        console.log('✅ Schema pushed to database successfully');

        console.log('🎉 Database deployment completed successfully!');
        return true;
    } catch (error) {
        console.error('❌ Failed to deploy database:', error.message);
        console.error(error);
        return false;
    }
}

// Run the function if script is executed directly
if (require.main === module) {
    deployDatabase()
        .then(success => {
            if (!success) {
                process.exit(1);
            }
        })
        .catch(error => {
            console.error('Unhandled error:', error);
            process.exit(1);
        });
}

module.exports = { deployDatabase }; 