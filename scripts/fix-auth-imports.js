// This script fixes authOptions imports
// Run with: node scripts/fix-auth-imports.js

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Find all files with the wrong import
exec("grep -r \"from '@/app/api/auth/\\[...nextauth\\]/route'\" --include=\"*.ts\" --include=\"*.tsx\" app/", (error, stdout, stderr) => {
    if (error) {
        console.error(`Error: ${error.message}`);
        return;
    }

    if (stderr) {
        console.error(`Stderr: ${stderr}`);
        return;
    }

    // Process each line of the output
    const lines = stdout.split('\n').filter(line => line);

    lines.forEach(line => {
        const [filePath] = line.split(':');
        if (!filePath) return;

        console.log(`Fixing imports in: ${filePath}`);

        try {
            let content = fs.readFileSync(filePath, 'utf8');
            // Replace the import statement
            content = content.replace(
                "import { authOptions } from '@/app/api/auth/[...nextauth]/route';",
                "import { authOptions } from '@/lib/auth.config';"
            );

            fs.writeFileSync(filePath, content);
            console.log(`✅ Fixed: ${filePath}`);
        } catch (err) {
            console.error(`❌ Error fixing ${filePath}: ${err.message}`);
        }
    });

    console.log(`\nFixed ${lines.length} files`);
}); 