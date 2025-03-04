'use server'

import { getServerSession } from "next-auth"
import { authOptions } from "../auth.config"
import prisma from "../prismaClient"
import { revalidatePath } from "next/cache"
import { serverLogger } from "@/utils/serverLogger"
import { ModelName } from '@/types/ai.types'

export async function saveMessage(chatId: string, message: {
    userInput: string
    timestamp: string
    model: ModelName
}) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            throw new Error('Unauthorized')
        }

        // Handle temp to real chat conversion
        if (chatId.startsWith('temp_')) {
            const newChat = await prisma.chat.create({
                data: {
                    user_id: session.user.id,
                    chat_title: 'New Chat'
                }
            })
            chatId = newChat.chat_id
        }

        // Save message with required fields
        const savedMessage = await prisma.chatHistory.create({
            data: {
                chat_id: chatId,
                user_input: message.userInput,
                api_response: '',
                timestamp: new Date(message.timestamp),
                model: message.model,
                context_id: chatId, // Required field
                input_type: 'text',
                output_type: 'text',
                credits_deducted: '0'
            }
        })

        revalidatePath('/chat')
        return { success: true, chatId, messageId: savedMessage.history_id }
    } catch (error) {
        serverLogger.error('Save message error:', error)
        throw error
    }
}
