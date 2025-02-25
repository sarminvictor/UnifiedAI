# Project Structure Overview

## Root Directories

### `/app`
Next.js 13+ App Router directory structure
- `/api/`: API route handlers
  - `/auth/`: Authentication routes
    - `/[...nextauth]/route.ts`: NextAuth.js configuration
      * Core authentication handler
      * Provider configurations
      * Session callbacks
      * JWT handling
      * Error management
    
    - `/reset-password/`: Password management
      - `/[token]/route.ts`: Token verification
        * Validates reset tokens
        * Updates passwords
        * Handles token expiration
        * Sends confirmation emails
      - `route.ts`: Reset request handler
        * Generates reset tokens
        * Sends reset emails
        * Rate limiting
        * Security validations

    - `/signin/route.ts`: Sign in handler
      * Credential validation
      * Session creation
      * Error handling
      * Rate limiting
      * Security checks

    - `/signup/route.ts`: Registration handler
      * User creation
      * Data validation
      * Duplicate checks
      * Email verification
      * Initial setup

  - `/chat/route.ts`: Chat operations
    * Message handling
    * Real-time updates
    * Chat persistence
    * Error recovery
    * Session validation

- `/auth/`: Authentication pages and components
  - `/reset-password/`: Password reset flow
    - `/[token]/page.tsx`: Reset password form
      * Token validation
      * Password strength validation
      * Form submission handling
      * Success/error notifications
      * Redirect management
    - `page.tsx`: Request password reset
      * Email input validation
      * Rate limiting checks
      * Email sending status
      * User feedback handling
  
  - `/signin/`: Sign in functionality
    - `page.tsx`: Sign in page
      * Multiple auth providers
      * Credential validation
      * Error handling
      * Remember me functionality
      * Redirect management
    - `signin.module.css`: Sign in styles
      * Form layout
      * Provider buttons
      * Responsive design
      * Animation effects

  - `/signout/`: Sign out handling
    - `page.tsx`: Sign out confirmation
      * Session cleanup
      * Confirmation dialog
      * Cache clearing
      * Redirect handling

  - `/signup/`: Registration flow
    - `page.tsx`: Sign up page
      * Form validation
      * Password requirements
      * Email verification
      * Terms acceptance
      * Error handling
    - `signup.module.css`: Sign up styles
      * Form layout
      * Validation states
      * Success animations
      * Responsive design

- `/user/`: User management section
  - `page.tsx`: User dashboard component
    * Features:
      - User profile management
      - Subscription status display
      - Credit usage statistics
      - Activity history
    * Components:
      - Profile information editor
      - Usage metrics dashboard
      - Subscription plan details
      - Credit balance display
    * Integration points:
      - Authentication state
      - Subscription service
      - Usage tracking
      - Credit management
    * Data display:
      - Personal information
      - API usage history
      - Billing information
      - Account settings

- Root level files:
  - `auth.config.ts`: Authentication configuration
  - `favicon.ico`: Site favicon
  - `globals.css`: Global styles
  - `home.tsx`: Homepage component
  - `layout.tsx`: Root layout component
  - `providers.tsx`: Global providers wrapper

### `/pages`
Next.js Pages Router directory
- `/api/`: API endpoints
  - `chatWithGPT.ts`: Main chat interaction endpoint
    * Handles real-time chat with AI models
    * Manages token calculation and credit deduction
    * Includes context management and chat summarization
    * Handles error states and unauthorized access
    * Logs API usage and updates user credits

  - `deleteChat.ts`: Chat deletion endpoint
    * Implements soft deletion of chats
    * Validates user ownership
    * Updates chat status without removing data
    * Returns updated chat status

  - `getChat.ts`: Single chat retrieval
    * Fetches complete chat history for a specific chat
    * Includes message transformation for frontend
    * Orders messages chronologically
    * Returns formatted chat data with messages

  - `getChats.ts`: All chats retrieval
    * Retrieves all active chats for a user
    * Supports test user identification in non-production
    * Includes detailed chat history
    * Transforms data for frontend consumption
    * Orders chats by latest update

  - `getUsageLogs.ts`: Usage tracking
    * Fetches recent API usage history
    * Includes detailed chat context
    * Limited to last 50 entries
    * Provides credit usage information

  - `getUserCredits.ts`: Credit checking
    * Retrieves current user credit balance
    * Simple credit availability check
    * Returns formatted credit amount

  - `getUserPlan.ts`: Subscription check
    * Checks active subscription status
    * Includes plan details
    * Returns current plan information

  - `restoreChat.ts`: Chat restoration
    * Reverses soft deletion
    * Validates chat ownership
    * Updates chat status to active

  - `saveChat.ts`: Single chat saving
    * Handles chat creation and updates
    * Includes automatic summary generation
    * Preserves existing summaries
    * Manages chat metadata

  - `saveChats.ts`: Bulk chat saving
    * Handles multiple chat updates simultaneously
    * Supports batch operations
    * Includes error handling per chat
    * Returns success/failure count

  - `saveMessage.ts`: Message management
    * Handles individual message saving
    * Updates chat timestamps
    * Maintains message order
    * Links messages to chats

- `/c/`: Chat interface routes
  - `[chatId].tsx`: Dynamic chat page component
    * Handles real-time chat interactions
    * Features:
      - Real-time message updates
      - Chat history management
      - Credit system integration
      - AI model selection
      - Error handling and recovery
    * Components:
      - Chat input with validation
      - Message list with formatting
      - Loading states
      - Error boundaries
    * Integration points:
      - AI models via API
      - User authentication
      - Credit system
      - Message persistence
    * State management:
      - Chat history
      - User credits
      - Loading states
      - Error states
- `_app.tsx`: Application wrapper component
  * Core application setup and configuration
  * Features:
    - Global state provider integration
    - Authentication session management
    - Theme provider setup
    - Global error boundary
    - Layout management
  * Integrations:
    - NextAuth session provider
    - Custom providers wrapper
    - Global CSS imports
    - SWR configuration

- `index.tsx`: Main landing/dashboard page
  * Primary application interface
  * Features:
    - User authentication check
    - Dynamic chat list
    - Credit system display
    - Navigation controls
  * Components:
    - Chat interface
    - User profile section
    - Credit balance display
    - Navigation menu
  * Integration points:
    - Chat management
    - User session
    - Credit system
    - Real-time updates

- `subscribe.tsx`: Subscription management page
  * User plan management interface
  * Features:
    - Current plan display
    - Plan selection interface
    - Subscription management
    - Plan comparison
  * Components:
    - Plan cards
    - Subscription buttons
    - Current plan indicator
    - Payment integration
  * State management:
    - Subscription status
    - Plan selection
    - Payment processing
    - Error handling

### `/prisma`
Database configuration and migrations
- `/migrations/`: Database migration files
- `schema.prisma`: Prisma schema definition
- `seed.ts`: Database seeding script

### `/public`
Static assets
- Various SVG files and images used in the application

### `/scripts`
Utility scripts
- `create-test-user.ts`: Test user creation utility
- `create-user.ts`: User creation utility
- `getProjectStructure.ts`: Project structure generator
- `start-dev.sh`: Development startup script

### `/services`
Business logic and service layer
- `/ai/`: AI service implementations
  - `modelFactory.ts`: AI model factory service
    * Model initialization and configuration
    * Features:
      - Dynamic model loading
      - Model configuration management
      - Provider-specific setups
      - Temperature and settings control
    * Supported Models:
      - OpenAI GPT models
      - Anthropic Claude
      - Google PaLM
      - Custom model configurations
    * Integration:
      - API key management
      - Error handling
      - Rate limiting
      - Model fallbacks

  - `summaryManager.ts`: Chat summarization service
    * Chat context management
    * Features:
      - Automatic summary generation
      - Context length monitoring
      - Summary updates
      - Memory management
    * Functionality:
      - Progressive summarization
      - Key points extraction
      - Context preservation
      - Token optimization

  - `tokenCalculator.ts`: Token usage calculator
    * Token counting and management
    * Features:
      - Model-specific calculations
      - Credit consumption tracking
      - Usage optimization
      - Cost estimation
    * Methods:
      - Message token counting
      - Credit conversion
      - Usage forecasting
      - Limit checking

- `/db/`: Database services
  - `apiUsageService.ts`: API usage tracking service
    * Features:
      - Usage logging and monitoring
      - Credit consumption tracking
      - Rate limiting enforcement
      - Usage statistics generation
    * Functionality:
      - Log API calls and responses
      - Track token usage per request
      - Monitor credit consumption
      - Generate usage reports
    * Integration points:
      - Model-specific tracking
      - User credit management
      - Usage analytics
      - Billing support

  - `chatService.ts`: Chat data management
    * Features:
      - Chat CRUD operations
      - Message management
      - Chat history tracking
      - Summary management
    * Methods:
      - Create/update/delete chats
      - Message persistence
      - History retrieval
      - Context management
    * Functionality:
      - Soft deletion support
      - Automatic timestamps
      - Message ordering
      - Chat restoration

  - `userService.ts`: User account management
    * Features:
      - User CRUD operations
      - Credit management
      - Subscription handling
      - Profile management
    * Methods:
      - Credit calculations
      - Plan management
      - Usage validation
      - Profile updates
    * Security:
      - Credit validation
      - Access control
      - Rate limiting
      - Audit logging

- `chatService.ts`: Chat business logic
  * Core chat functionality
  * Features:
    - Chat session management
    - History synchronization
    - State coordination
    - Error recovery
  * Methods:
    - Chat initialization
    - Session handling
    - Context management
    - State persistence
  * Integration points:
    - Database services
    - Message service
    - AI models
    - User state

- `messageService.ts`: Message orchestration
  * Message handling and processing
  * Features:
    - Message formatting
    - API communication
    - Error handling
    - Response transformation
  * Methods:
    - Send messages
    - Create user messages
    - Create AI responses
    - Handle errors
  * Integration points:
    - Chat API
    - AI models
    - State management
    - Error logging

### `/store`
State management using Zustand
- `/chat/`: Chat state management
  - `chatActions.ts`: Chat-related actions and mutations
    - Message handling
    - Chat creation/deletion
    - State updates
  - `chatStore.ts`: Main chat store implementation
    - Store configuration
    - State definition
    - Selectors
  - `types.ts`: Chat-related type definitions
    - Chat interfaces
    - Message types
    - Store state types

### `/styles`
Styling files
- `globals.css`: Global CSS styles

### `/tests`
Testing configuration and test files
- `/helpers/`: Test helper utilities
- `/regression/`: Regression tests

### `/types`
TypeScript type definitions
- `ai.types.ts`: AI-related type definitions
  * Model Types:
    - Model configurations
    - Provider settings
    - API parameters
    - Response formats
  * Chat Types:
    - Message structures
    - Chat history formats
    - Context management
    - Token tracking
  * Integration Types:
    - API interfaces
    - Service responses
    - Error handling
    - Configuration options

- `next-auth.d.ts`: NextAuth type extensions
  * Session Types:
    - Custom session properties
    - User profile extensions
    - JWT payload additions
    - Authentication states
  * Auth Types:
    - Provider configurations
    - Callback signatures
    - Error definitions
    - Token handling

- `prisma.d.ts`: Prisma type definitions
  * Database Models:
    - Table structures
    - Relation types
    - Query returns
    - Input types
  * Extensions:
    - Custom field types
    - Computed fields
    - Helper types
    - Middleware types

- `store.ts`: Store-related types
  * State Types:
    - Store structure
    - Action payloads
    - Selector returns
    - Middleware types
  * Chat Types:
    - Message formats
    - Chat states
    - User states
    - UI states
  * Utility Types:
    - Helper types
    - Type guards
    - Generic types
    - Type intersections

### `/utils`
Utility functions
- `chatUtils.ts`: Chat utility functions
  * Message Handling:
    - Message formatting
    - History processing
    - Context management
    - Thread organization
  * Chat Operations:
    - Chat ID generation
    - Title generation
    - Summary extraction
    - State updates
  * Data Transformation:
    - Response formatting
    - History structuring
    - Data normalization
    - Type conversion

- `errorHandler.ts`: Error management system
  * Error Types:
    - API errors
    - Validation errors
    - Auth errors
    - System errors
  * Features:
    - Error classification
    - Status code mapping
    - Message formatting
    - Stack trace handling
  * Integration:
    - Logging system
    - Error reporting
    - User feedback
    - Recovery strategies

- `format.ts`: Data formatting utilities
  * Text Formatting:
    - String sanitization
    - Case conversion
    - Template processing
    - Special characters
  * Number Formatting:
    - Credit amounts
    - Token counts
    - Percentages
    - Currencies
  * Date/Time:
    - Timestamps
    - Duration calculation
    - Time zones
    - Date ranges

- `logger.ts`: Logging system
  * Log Levels:
    - Error logging
    - Warning tracking
    - Info messages
    - Debug data
  * Features:
    - Stack traces
    - Context capture
    - Performance metrics
    - System states
  * Integration:
    - Console output
    - File logging
    - Error tracking
    - Analytics

- `sanitize.ts`: Input sanitization
  * Security:
    - XSS prevention
    - SQL injection protection
    - Input validation
    - Output encoding
  * Data Cleaning:
    - String cleaning
    - HTML sanitization
    - URL validation
    - Special characters
  * Validation:
    - Type checking
    - Format validation
    - Range checking
    - Pattern matching

## Root Files

### Configuration Files
- `package.json`: Project dependencies and scripts
- `package-lock.json`: Dependency lock file
- `next.config.js`: Next.js configuration
  * Core settings:
    - Strict mode enabled
    - SASS configuration
    - Server Actions enabled
  * Path aliasing:
    - Webpack alias setup
    - Source directory mapping
    - Style paths configuration
- `tsconfig.json`: TypeScript configuration
- `tailwind.config.ts`: Tailwind CSS configuration
- `postcss.config.js`: PostCSS configuration
- `route.ts`: Route definitions

### Environment Files
- `.env`: Environment variables (excluded from git)
- `.env.example`: Example environment variables

### Build Output
- `.next/`: Next.js build output (excluded from git)
