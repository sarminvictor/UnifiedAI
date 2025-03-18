import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Check if the schema has required models for NextAuth
export async function GET() {
    try {
        // Read the schema file
        const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');

        let schemaExists = false;
        let schemaContents = '';
        let hasUserModel = false;
        let hasAccountModel = false;
        let hasSessionModel = false;
        let hasVerificationTokenModel = false;

        // Read schema file if it exists
        try {
            schemaExists = fs.existsSync(schemaPath);
            if (schemaExists) {
                schemaContents = fs.readFileSync(schemaPath, 'utf8');

                // Check for required models
                hasUserModel = schemaContents.includes('model User {');
                hasAccountModel = schemaContents.includes('model Account {');
                hasSessionModel = schemaContents.includes('model Session {');
                hasVerificationTokenModel = schemaContents.includes('model VerificationToken {');
            }
        } catch (err) {
            // File system access might be restricted in some environments
            schemaExists = false;
        }

        // Required fields for NextAuth models
        const requiredFields = {
            User: ['id', 'email', 'name'],
            Account: ['id', 'userId', 'type', 'provider', 'providerAccountId'],
            Session: ['id', 'userId', 'expires'],
            VerificationToken: ['identifier', 'token', 'expires']
        };

        // Check if models have required fields
        const modelFieldCheck = Object.entries(requiredFields).reduce((acc, [modelName, fields]) => {
            const modelPattern = new RegExp(`model ${modelName} {([^}]*)}`, 's');
            const modelMatch = schemaContents.match(modelPattern);

            if (!modelMatch) {
                acc[modelName] = { exists: false, fields: {} };
                return acc;
            }

            const modelContent = modelMatch[1];
            acc[modelName] = {
                exists: true,
                fields: fields.reduce((fieldAcc, field) => {
                    fieldAcc[field] = modelContent.includes(field);
                    return fieldAcc;
                }, {} as Record<string, boolean>)
            };

            return acc;
        }, {} as Record<string, { exists: boolean, fields: Record<string, boolean> }>);

        // Generate recommendations
        const recommendations = [];

        if (!schemaExists) {
            recommendations.push('Prisma schema file not found. Make sure it exists at prisma/schema.prisma');
        }

        if (!hasUserModel) {
            recommendations.push('User model is missing in the Prisma schema. Required for NextAuth.');
        }

        if (!hasAccountModel) {
            recommendations.push('Account model is missing in the Prisma schema. Required for OAuth.');
        }

        if (!hasSessionModel) {
            recommendations.push('Session model is missing in the Prisma schema. Required for NextAuth.');
        }

        if (!hasVerificationTokenModel) {
            recommendations.push('VerificationToken model is missing. Required for email verification.');
        }

        // Check for missing fields in models
        Object.entries(modelFieldCheck).forEach(([modelName, { exists, fields }]) => {
            if (exists) {
                Object.entries(fields).forEach(([fieldName, exists]) => {
                    if (!exists) {
                        recommendations.push(`The ${fieldName} field is missing in the ${modelName} model.`);
                    }
                });
            }
        });

        // Get database provider from schema
        let databaseProvider = 'unknown';
        const providerMatch = schemaContents.match(/provider\s*=\s*"([^"]+)"/);
        if (providerMatch) {
            databaseProvider = providerMatch[1];
        }

        return NextResponse.json({
            schemaExists,
            databaseProvider,
            hasRequiredModels: {
                User: hasUserModel,
                Account: hasAccountModel,
                Session: hasSessionModel,
                VerificationToken: hasVerificationTokenModel
            },
            modelFieldCheck,
            recommendations,
        });
    } catch (error: any) {
        return NextResponse.json(
            {
                error: 'Schema diagnostic check failed',
                message: error.message,
            },
            { status: 500 }
        );
    }
} 