const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

// Get all layout components
const appDir = path.join(__dirname, '..', 'app');

async function processLayoutFile(filePath) {
    try {
        const contents = await readFile(filePath, 'utf8');

        // Skip if already has 'use client' directive
        if (contents.includes("'use client'") || contents.includes('"use client"')) {
            console.log(`Skipping (already client): ${filePath}`);
            return;
        }

        // Add 'use client' directive at the top
        const updatedContents = "'use client';\n\n" + contents;

        // Write the modified file
        await writeFile(filePath, updatedContents, 'utf8');
        console.log(`Updated: ${filePath}`);
    } catch (error) {
        console.error(`Error processing ${filePath}:`, error);
    }
}

async function findAndProcessLayoutFiles(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            await findAndProcessLayoutFiles(fullPath);
        } else if (entry.name === 'layout.tsx' || entry.name === 'layout.jsx') {
            // Skip files in the api directory
            if (!fullPath.includes(path.join('app', 'api'))) {
                await processLayoutFile(fullPath);
            }
        }
    }
}

findAndProcessLayoutFiles(appDir)
    .then(() => console.log('Finished updating layout components.'))
    .catch(err => console.error('Error:', err)); 