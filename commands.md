# Development Commands

## Start the Development Server

- **Command**: `npm run dev`
- **Description**: Start the Next.js development server.
- [Learn More about Next.js Development](https://nextjs.org/docs)

## Run Tests

- **Command**: `npm run test`
- **Description**: Run the test suite (if you have tests set up).
- [Learn More about Testing](https://jestjs.io/)

## Format Code

- **Command**: `npm run format`
- **Description**: Format the code using Prettier or a similar tool.
- [Learn More about Prettier](https://prettier.io/)

## Lint Code

- **Command**: `npm run lint`
- **Description**: Lint the code using ESLint.
- [Learn More about ESLint](https://eslint.org/)

## Run Prisma Migrations

- **Command**: `npx prisma migrate dev`
- **Description**: Apply pending migrations.
- [Learn More about Prisma Migrations](https://www.prisma.io/docs/concepts/components/prisma-migrate)

- **Command**: `npx prisma migrate dev --name <migration_name>`
- **Description**: Create a new migration with a specific name.

## Generate Prisma Client

- **Command**: `npx prisma generate`
- **Description**: Regenerate Prisma client.
- [Learn More about Prisma Client](https://www.prisma.io/docs/concepts/components/prisma-client)

## Run Prisma Studio

- **Command**: `npx prisma studio`
- **Description**: Open Prisma Studio for interacting with your database.
- [Learn More about Prisma Studio](https://www.prisma.io/docs/concepts/components/prisma-studio)

## Run Production Build

- **Command**: `npm run build`
- **Description**: Build the project for production.
- [Learn More about Next.js Production Build](https://nextjs.org/docs/advanced-features/production)

## Start Production Server

- **Command**: `npm run start`
- **Description**: Start the production server.
- [Learn More about Deploying Next.js](https://nextjs.org/docs/deployment)

## Install Dependencies

- **Command**: `npm install`
- **Description**: Install the dependencies defined in `package.json`.

## Start or Restart Docker Containers (If using Docker)

- **Command**: `docker-compose up`
- **Description**: Start the containers defined in the `docker-compose.yml` file.
- **Command**: `docker-compose down`
- **Description**: Stop the containers.

## Clear Next.js Cache (Optional, if cache-related issues occur)

- **Command**: `npm run build && npm run dev`
- **Description**: Rebuild the Next.js application, clearing the cache.

## Create a New Prisma Migration (When modifying the Prisma schema)

- **Command**: `npx prisma migrate dev --name <migration_name>`
- **Description**: Create a new migration when modifying the Prisma schema.

# GitHub Commands

## Clone a Repository

- **Command**: `git clone <repository-url>`
- **Description**: Clone a GitHub repository to your local machine.
- [Learn More about Git Cloning](https://docs.github.com/en/github/using-git/clone-a-repository)

## Stage Changes

- **Command**: `git add .`
- **Description**: Stage all modified files for commit.

## Commit Changes

- **Command**: `git commit -m "your commit message"`
- **Description**: Commit changes with a message.

## Push Changes

- **Command**: `git push origin <branch-name>`
- **Description**: Push the changes to your remote GitHub repository.
- [Learn More about Git Push](https://docs.github.com/en/github/using-git/pushing-commits-to-a-remote-repository)

## Pull Latest Changes from Remote

- **Command**: `git pull origin <branch-name>`
- **Description**: Pull the latest changes from the remote repository.
- [Learn More about Git Pull](https://docs.github.com/en/github/using-git/pulling-changes-from-a-remote-repository)

## Check Git Status

- **Command**: `git status`
- **Description**: Check the status of your local repository.
- [Learn More about Git Status](https://docs.github.com/en/github/using-git/checking-the-status-of-your-files)

## View Git Log

- **Command**: `git log --oneline`
- **Description**: View the commit history.
- [Learn More about Git Log](https://docs.github.com/en/github/using-git/viewing-your-commit-history)
