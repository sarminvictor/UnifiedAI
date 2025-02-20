import { LLMChain } from "langchain/chains";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { SystemMessage, HumanMessage, AIMessage } from "@langchain/core/messages";
import { sanitizeString } from '@/utils/sanitize';
import { ChatMessage, SummaryConfig } from '@/types/ai.types';
import { CHAT_CONSTANTS, SYSTEM_PROMPTS } from '@/constants/ai.constants';

export class SummaryManager {
  public static needsSummary(messageCount: number): boolean {
    return messageCount >= CHAT_CONSTANTS.SUMMARY_THRESHOLD;
  }

  public static async generateSummary({
    llm,
    previousMessages,
    currentUserMessage,
    currentAiResponse
  }: SummaryConfig): Promise<string | null> {
    const summaryChain = new LLMChain({
      llm,
      prompt: ChatPromptTemplate.fromMessages([
        new SystemMessage(SYSTEM_PROMPTS.SUMMARY_GENERATION),
        ...previousMessages.map(msg => 
          msg.user_input 
            ? new HumanMessage(msg.user_input)
            : new AIMessage(msg.api_response || "")
        ),
        new HumanMessage(currentUserMessage),
        new AIMessage(currentAiResponse)
      ]),
      verbose: false
    });

    const summaryResponse = await summaryChain.call({});
    return sanitizeString(summaryResponse.text?.trim());
  }
}
