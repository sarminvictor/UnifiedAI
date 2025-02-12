const chalk = require('chalk');

class CustomReporter {
  onRunComplete(contexts, results) {
    console.log('\n### Checklist of All Tests\n');

    const checklist = [
      // Auth Tests
      {
        name: 'should complete full auth lifecycle',
        steps: [
          'Register a new user.',
          'Verify email.',
          'Login with new user.',
          'Access protected route.',
          'Logout.',
        ],
        result: 'Pending',
      },
      {
        name: 'should not allow duplicate registration',
        steps: [
          'Attempt to register with an existing email.',
        ],
        result: 'Pending',
      },
      {
        name: 'should not allow login with incorrect password',
        steps: [
          'Attempt to login with incorrect password.',
        ],
        result: 'Pending',
      },
      // Chats Tests
      {
        name: 'should complete the full lifecycle of creating, sending messages, and fetching chats',
        steps: [
          'Create a new chat.',
          'Send a message to the chat.',
          'Fetch chats and verify the message.',
        ],
        result: 'Pending',
      },
      {
        name: 'should create a new chat locally without saving to the database',
        steps: [
          'Simulate creating a new chat locally.',
          'Verify the chat is created locally.',
        ],
        result: 'Pending',
      },
      {
        name: 'should not allow creating more than one empty chat',
        steps: [
          'Simulate creating a new chat locally.',
          'Simulate creating another new chat locally.',
          'Verify only one empty chat is allowed.',
        ],
        result: 'Pending',
      },
      {
        name: 'should not allow opening the chat menu for a new chat with no messages',
        steps: [
          'Simulate creating a new chat locally.',
          'Verify the chat menu cannot be opened for a new chat with no messages.',
        ],
        result: 'Pending',
      },
      {
        name: 'should send a message to a chat',
        steps: [
          'Simulate creating a new chat locally.',
          'Simulate sending a message to the chat.',
          'Verify the message is added to the chat.',
        ],
        result: 'Pending',
      },
      {
        name: 'should save messages to the database',
        steps: [
          'Simulate creating a new chat locally.',
          'Save the chat.',
          'Simulate sending a message to the chat.',
          'Save the message to the database.',
          'Verify the message is saved to the database.',
        ],
        result: 'Pending',
      },
      {
        name: 'should save a chat to the database',
        steps: [
          'Create chat directly in the database.',
          'Verify chat exists in the database and belongs to the test user.',
          'Verify chat appears in getChats API response.',
          'Update the chat.',
          'Verify the update in the database.',
        ],
        result: 'Pending',
      },
      {
        name: 'should update the updated_at field for chats and check the order of chats by updated_at',
        steps: [
          'Create chats directly in the database.',
          'Add a small delay to ensure unique timestamps.',
          'Update the first chat\'s updated_at to be more recent.',
          'Fetch chats and verify the order.',
        ],
        result: 'Pending',
      },
      {
        name: 'should rename a chat and verify the change in the database',
        steps: [
          'Create the chat in the database.',
          'Rename the chat.',
          'Verify the rename in the database.',
        ],
        result: 'Pending',
      },
      {
        name: 'should delete a chat and verify the deletion in the database',
        steps: [
          'Create the chat in the database.',
          'Delete the chat.',
          'Verify the deletion in the database.',
        ],
        result: 'Pending',
      },
      {
        name: 'should delete all related messages when a chat is deleted',
        steps: [
          'Create the chat in the database.',
          'Add a message to the chat.',
          'Verify the message exists in the database.',
          'Delete the chat.',
          'Verify the deletion in the database.',
          'Verify the related messages are also deleted.',
        ],
        result: 'Pending',
      },
      // CleanUp Tests
      {
        name: 'should check for test user by test@test.test in database',
        steps: [
          'Check for test user by test@test.test in database.',
        ],
        result: 'Pending',
      },
      {
        name: 'should check all chats related to this user in database',
        steps: [
          'Check all chats related to this user in database.',
        ],
        result: 'Pending',
      },
      {
        name: 'should check for all messages related to users chats in database',
        steps: [
          'Check for all messages related to users chats in database.',
        ],
        result: 'Pending',
      },
      {
        name: 'should delete all test data from database if existed',
        steps: [
          'Delete all test data from database if existed.',
        ],
        result: 'Pending',
      },
    ];

    results.testResults.forEach(testResult => {
      testResult.testResults.forEach(test => {
        const checklistItem = checklist.find(item => test.fullName.includes(item.name));
        if (checklistItem) {
          checklistItem.result = test.status === 'passed' ? 'Passed' : 'Failed';
          checklistItem.steps = checklistItem.steps.map(step => ({
            description: step,
            status: test.status === 'passed' ? 'Passed' : 'Failed'
          }));
        }
      });
    });

    const suites = {
      Auth: checklist.slice(0, 3),
      Chats: checklist.slice(3, 14),
      CleanUp: checklist.slice(14),
    };

    Object.keys(suites).forEach(suiteName => {
      console.log(`\n### ${suiteName} Tests\n`);
      suites[suiteName].forEach((test, index) => {
        const resultIcon = test.result === 'Passed' ? chalk.green('✓') : chalk.red('✕');
        console.log(`${index + 1}. ${resultIcon} ${test.name}`);
        test.steps.forEach((step, stepIndex) => {
          const stepResultIcon = step.status === 'Passed' ? chalk.green('·') : chalk.red('✕');
          console.log(`     ${stepResultIcon} ${step.description}`);
        });
        console.log('\n');
      });
      console.log('----------------------------------------');
    });
  }
}

module.exports = CustomReporter;
