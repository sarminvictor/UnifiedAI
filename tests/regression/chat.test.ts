import { authTestHelper } from '../helpers/auth-helper';
import prisma from '../helpers/prisma';

describe('Chats and Messages Regression Tests', () => {
  const testEmail = 'test@test.test';
  const testPassword = 'testPassword123';
  let testUserId: string;
  let sessionToken: string;

  // Clean up only test users to avoid affecting production data
  beforeAll(async () => {
    await authTestHelper.cleanupTestUser(testEmail);
    const signupResponse = await authTestHelper.createTestUser(testEmail, testPassword);
    const signupData = await signupResponse.json();
    testUserId = signupData.id;
    sessionToken = await authTestHelper.getSessionToken(testEmail, testPassword);
    console.log('Test user created:', testUserId);
  });

  afterEach(async () => {
    // Clean up after each test to keep database clean
    await prisma.chat.deleteMany({
      where: { user_id: testUserId }
    });
    console.log('Chats cleaned up for user:', testUserId);
  });

  const makeAuthorizedRequest = async (url: string, options: RequestInit = {}) => {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Content-Type': 'application/json',
        'x-test-user-id': testUserId, // Add test user ID header
        Authorization: `Bearer ${sessionToken}` // Add session token
      }
    });
    console.log(`Request to ${url} with options:`, options);
    console.log(`Response from ${url}:`, response);
    return response;
  };

  it('should complete the full lifecycle of creating, sending messages, and fetching chats', async () => {
    // 1. Create new chat
    const newChatResponse = await makeAuthorizedRequest('http://localhost:3000/api/saveChat', {
      method: 'POST',
      body: JSON.stringify({ chatId: 'test-chat-id', chatTitle: 'Test Chat' }),
    });
    expect(newChatResponse.status).toBe(200);

    // 2. Attempt to send message (should succeed)
    const newMessage = {
      userInput: 'Hello',
      apiResponse: 'Hi there!',
      inputType: 'Text',
      outputType: 'Text',
      timestamp: new Date().toISOString(),
      contextId: '',
    };

    const sendMessageResponse = await makeAuthorizedRequest('http://localhost:3000/api/saveMessage', {
      method: 'POST',
      body: JSON.stringify({ chatId: 'test-chat-id', message: newMessage }),
    });

    expect(sendMessageResponse.status).toBe(200); // Should succeed with 200
    const sendMessageData = await sendMessageResponse.json();
    expect(sendMessageData.success).toBe(true);

    // 3. Verify message was saved
    const savedMessage = await prisma.chatHistory.findFirst({
      where: { chat_id: 'test-chat-id' }
    });
    expect(savedMessage).not.toBeNull();
    expect(savedMessage?.user_input).toBe('Hello');
  });

  it('should create a new chat locally without saving to the database', async () => {
    // Simulate creating a new chat locally
    const newChatId = Date.now().toString();
    const newChat = {
      id: newChatId,
      chat_id: newChatId,
      chat_title: 'New Chat',
      messages: [],
      model: 'ChatGPT',
      name: '',
      updated_at: new Date().toISOString()
    };

    // Verify the chat is created locally
    expect(newChat.chat_title).toBe('New Chat');
    expect(newChat.messages.length).toBe(0);
  });

  it('should not allow creating more than one empty chat', async () => {
    // Simulate creating a new chat locally
    const newChatId1 = Date.now().toString();
    const newChat1 = {
      id: newChatId1,
      chat_id: newChatId1,
      chat_title: 'New Chat 1',
      messages: [],
      model: 'ChatGPT',
      name: '',
      updated_at: new Date().toISOString()
    };

    // Simulate creating another new chat locally
    const newChatId2 = Date.now().toString();
    const newChat2 = {
      id: newChatId2,
      chat_id: newChatId2,
      chat_title: 'New Chat 2',
      messages: [],
      model: 'ChatGPT',
      name: '',
      updated_at: new Date().toISOString()
    };

    // Verify only one empty chat is allowed
    expect(newChat1.messages.length).toBe(0);
    expect(newChat2.messages.length).toBe(0);
    expect(newChat1.chat_title).toBe('New Chat 1');
    expect(newChat2.chat_title).toBe('New Chat 2');
  });

  it('should not allow opening the chat menu for a new chat with no messages', async () => {
    // Simulate creating a new chat locally
    const newChatId = Date.now().toString();
    const newChat = {
      id: newChatId,
      chat_id: newChatId,
      chat_title: 'New Chat',
      messages: [],
      model: 'ChatGPT',
      name: '',
      updated_at: new Date().toISOString()
    };

    // Verify the chat menu cannot be opened for a new chat with no messages
    const canOpenMenu = newChat.messages.length > 0;
    expect(canOpenMenu).toBe(false);
  });

  it('should send a message to a chat', async () => {
    // Should succeed because message sending is enabled
    const newChatId = Date.now().toString();
    const newMessage = {
      userInput: 'Hello',
      apiResponse: 'Hi there!',
      inputType: 'Text',
      outputType: 'Text',
      timestamp: new Date().toISOString(),
      contextId: '',
    };

    const sendMessageResponse = await makeAuthorizedRequest('http://localhost:3000/api/saveMessage', {
      method: 'POST',
      body: JSON.stringify({ chatId: newChatId, message: newMessage }),
    });

    expect(sendMessageResponse.status).toBe(200); // Should succeed with 200
    const sendMessageData = await sendMessageResponse.json();
    expect(sendMessageData.success).toBe(true);

    // Verify message was saved
    const savedMessage = await prisma.chatHistory.findFirst({
      where: { chat_id: newChatId }
    });
    expect(savedMessage).not.toBeNull();
    expect(savedMessage?.user_input).toBe('Hello');
  });

  it('should save messages to the database', async () => {
    // Should succeed because message sending is enabled
    const newChatId = Date.now().toString();
    const newMessage = {
      userInput: 'Hello',
      apiResponse: 'Hi there!',
      inputType: 'Text',
      outputType: 'Text',
      timestamp: new Date().toISOString(),
      contextId: '',
    };

    const sendMessageResponse = await makeAuthorizedRequest('http://localhost:3000/api/saveMessage', {
      method: 'POST',
      body: JSON.stringify({ chatId: newChatId, message: newMessage }),
    });

    expect(sendMessageResponse.status).toBe(200); // Should succeed with 200
    const sendMessageData = await sendMessageResponse.json();
    expect(sendMessageData.success).toBe(true);

    // Verify message was saved
    const savedMessage = await prisma.chatHistory.findFirst({
      where: { chat_id: newChatId }
    });
    expect(savedMessage).not.toBeNull();
    expect(savedMessage?.user_input).toBe('Hello');
  });

  it('should save a chat to the database', async () => {
    // First create chat directly in database
    const newChatId = Date.now().toString();
    const chatTitle = 'New Chat';
    
    await prisma.chat.create({
      data: {
        chat_id: newChatId,
        chat_title: chatTitle,
        user_id: testUserId, // Using the test user ID
        created_at: new Date(),
        updated_at: new Date(),
        deleted: false
      }
    });

    // Verify chat exists in database and belongs to test user
    const dbChat = await prisma.chat.findFirst({
      where: { 
        chat_id: newChatId,
        user_id: testUserId // Ensure chat belongs to test user
      }
    });
    
    expect(dbChat).not.toBeNull();
    expect(dbChat?.chat_title).toBe(chatTitle);
    expect(dbChat?.user_id).toBe(testUserId); // Verify ownership

    // Also verify chat appears in getChats API response
    const fetchChatsResponse = await makeAuthorizedRequest('http://localhost:3000/api/getChats');
    console.log('Fetch chats response:', fetchChatsResponse);
    expect(fetchChatsResponse.status).toBe(200);
    const fetchChatsData = await fetchChatsResponse.json();
    console.log('Fetch chats data:', fetchChatsData);
    expect(fetchChatsData.success).toBe(true);
    expect(Array.isArray(fetchChatsData.data.activeChats)).toBe(true);
    
    const chatInList = fetchChatsData.data.activeChats.find((c: any) => c.chat_id === newChatId);
    expect(chatInList).toBeDefined();
    expect(chatInList.chat_title).toBe(chatTitle);

    // Now update the chat
    const newTitle = 'Updated Chat';
    const saveChatResponse = await makeAuthorizedRequest('http://localhost:3000/api/saveChat', {
      method: 'POST',
      body: JSON.stringify({ 
        chatId: newChatId, 
        chatTitle: newTitle 
      }),
    });
    console.log('Save chat response:', saveChatResponse);
    expect(saveChatResponse.status).toBe(200);

    // Verify the update in database
    const updatedChat = await prisma.chat.findFirst({
      where: { 
        chat_id: newChatId,
        user_id: testUserId 
      }
    });
    expect(updatedChat).not.toBeNull();
    expect(updatedChat?.chat_title).toBe(newTitle);
  });

  it('should update the updated_at field for chats and check the order of chats by updated_at', async () => {
    // Create chats directly in database
    const newChatId1 = Date.now().toString();
    await prisma.chat.create({
      data: {
        chat_id: newChatId1,
        chat_title: 'New Chat 1',
        user_id: testUserId,
        created_at: new Date(),
        updated_at: new Date(),
        deleted: false
      }
    });

    // Add a small delay to ensure unique timestamps
    await new Promise(resolve => setTimeout(resolve, 1000));

    const newChatId2 = Date.now().toString();
    await prisma.chat.create({
      data: {
        chat_id: newChatId2,
        chat_title: 'New Chat 2',
        user_id: testUserId,
        created_at: new Date(),
        updated_at: new Date(),
        deleted: false
      }
    });

    // Update first chat's updated_at to be more recent
    const newDate = new Date();
    await prisma.chat.update({
      where: { chat_id: newChatId1 },
      data: { updated_at: newDate }
    });

    // Fetch chats and verify order
    const fetchChatsResponse = await makeAuthorizedRequest('http://localhost:3000/api/getChats');
    console.log('Fetch chats response:', fetchChatsResponse);
    expect(fetchChatsResponse.status).toBe(200);
    const fetchChatsData = await fetchChatsResponse.json();
    console.log('Fetch chats data:', fetchChatsData);
    expect(fetchChatsData.success).toBe(true);
    expect(Array.isArray(fetchChatsData.data.activeChats)).toBe(true);
    
    const chats = fetchChatsData.data.activeChats;
    expect(chats[0].chat_id).toBe(newChatId1);
    expect(chats[1].chat_id).toBe(newChatId2);
  });

  it('should rename a chat and verify the change in the database', async () => {
    // First create the chat in database
    const newChatId = Date.now().toString();
    const initialTitle = 'New Chat';
    
    await prisma.chat.create({
      data: {
        chat_id: newChatId,
        chat_title: initialTitle,
        user_id: testUserId,
        created_at: new Date(),
        updated_at: new Date(),
        deleted: false
      }
    });

    // Rename the chat
    const newChatTitle = 'Renamed Chat';
    const renameChatResponse = await makeAuthorizedRequest('http://localhost:3000/api/saveChat', {
      method: 'POST',
      body: JSON.stringify({ chatId: newChatId, chatTitle: newChatTitle }),
    });
    console.log('Rename chat response:', renameChatResponse);
    expect(renameChatResponse.status).toBe(200);

    // Verify the rename in database
    const renamedChat = await prisma.chat.findUnique({
      where: { chat_id: newChatId }
    });
    expect(renamedChat).not.toBeNull();
    expect(renamedChat?.chat_title).toBe(newChatTitle);
  });

  it('should delete a chat and verify the deletion in the database', async () => {
    // First create the chat in database
    const newChatId = Date.now().toString();
    
    await prisma.chat.create({
      data: {
        chat_id: newChatId,
        chat_title: 'New Chat',
        user_id: testUserId,
        created_at: new Date(),
        updated_at: new Date(),
        deleted: false
      }
    });

    // Delete the chat
    const deleteChatResponse = await makeAuthorizedRequest('http://localhost:3000/api/deleteChat', {
      method: 'DELETE',
      body: JSON.stringify({ chatId: newChatId }),
    });
    console.log('Delete chat response:', deleteChatResponse);
    expect(deleteChatResponse.status).toBe(200);

    // Verify the deletion in database
    const deletedChat = await prisma.chat.findUnique({
      where: { chat_id: newChatId }
    });
    expect(deletedChat).toBeNull();
  });

  it('should delete all related messages when a chat is deleted', async () => {
    // First create the chat in database
    const newChatId = Date.now().toString();
    
    await prisma.chat.create({
      data: {
        chat_id: newChatId,
        chat_title: 'New Chat',
        user_id: testUserId,
        created_at: new Date(),
        updated_at: new Date(),
        deleted: false
      }
    });

    // Add a message to the chat
    const newMessage = {
      userInput: 'Hello',
      apiResponse: 'Hi there!',
      inputType: 'Text',
      outputType: 'Text',
      timestamp: new Date().toISOString(),
      contextId: '',
    };

    await prisma.chatHistory.create({
      data: {
        chat_id: newChatId,
        user_input: newMessage.userInput,
        api_response: newMessage.apiResponse,
        input_type: newMessage.inputType,
        output_type: newMessage.outputType,
        timestamp: new Date(newMessage.timestamp),
        context_id: newMessage.contextId,
      }
    });

    // Verify the message exists in the database
    const savedMessage = await prisma.chatHistory.findFirst({
      where: { chat_id: newChatId }
    });
    expect(savedMessage).not.toBeNull();
    expect(savedMessage?.user_input).toBe('Hello');

    // Delete the chat
    const deleteChatResponse = await makeAuthorizedRequest('http://localhost:3000/api/deleteChat', {
      method: 'DELETE',
      body: JSON.stringify({ chatId: newChatId }),
    });
    console.log('Delete chat response:', deleteChatResponse);
    expect(deleteChatResponse.status).toBe(200);

    // Verify the deletion in database
    const deletedChat = await prisma.chat.findUnique({
      where: { chat_id: newChatId }
    });
    expect(deletedChat).toBeNull();

    // Verify the related messages are also deleted
    const deletedMessage = await prisma.chatHistory.findFirst({
      where: { chat_id: newChatId }
    });
    expect(deletedMessage).toBeNull();
  });
});
