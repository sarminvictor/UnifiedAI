const { execSync } = require('child_process');

// This script handles Prisma migrations during deployment
async function main() {
    try {
        console.log('Running database migrations...');

        // Run database migrations
        execSync('npx prisma migrate deploy', {
            stdio: 'inherit',
            env: {
                ...process.env,
                // Force Prisma to use the deployment environment
                NODE_ENV: 'production'
            }
        });

        console.log('Database migrations completed successfully!');

        // Generate Prisma client
        console.log('Generating Prisma client...');
        execSync('npx prisma generate', { stdio: 'inherit' });
        console.log('Prisma client generated successfully!');

    } catch (error) {
        console.error('Failed to run database migrations:', error);
        process.exit(1);
    }
}

main(); 