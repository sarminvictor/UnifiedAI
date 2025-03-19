const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

// Get all route files
const apiDir = path.join(__dirname, '..', 'app', 'api');

async function processRouteFile(filePath) {
    try {
        const contents = await readFile(filePath, 'utf8');

        // Skip if already has dynamic export
        if (contents.includes("export const dynamic = 'force-dynamic'")) {
            console.log(`Skipping (already dynamic): ${filePath}`);
            return;
        }

        // Find the first import statement
        const importRegex = /^import.+$/m;
        const importMatch = contents.match(importRegex);

        if (!importMatch) {
            console.log(`Skipping (no imports): ${filePath}`);
            return;
        }

        // Find the position after the last import statement
        let lines = contents.split('\n');
        let lastImportLine = -1;

        for (let i = 0; i < lines.length; i++) {
            if (lines[i].trim().startsWith('import ')) {
                lastImportLine = i;
            } else if (lastImportLine !== -1 && !lines[i].trim()) {
                // If we've found imports and now hit an empty line, we've gone past the imports
                break;
            }
        }

        if (lastImportLine === -1) {
            console.log(`Skipping (couldn't find imports): ${filePath}`);
            return;
        }

        // Insert dynamic export after the imports
        lines.splice(lastImportLine + 1, 0, '', '// Mark this route as dynamic to avoid static generation errors', "export const dynamic = 'force-dynamic';");

        // Write the modified file
        await writeFile(filePath, lines.join('\n'), 'utf8');
        console.log(`Updated: ${filePath}`);
    } catch (error) {
        console.error(`Error processing ${filePath}:`, error);
    }
}

async function findAndProcessRouteFiles(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            await findAndProcessRouteFiles(fullPath);
        } else if (entry.name === 'route.ts' || entry.name === 'route.js') {
            await processRouteFile(fullPath);
        }
    }
}

findAndProcessRouteFiles(apiDir)
    .then(() => console.log('Finished updating API routes.'))
    .catch(err => console.error('Error:', err)); 