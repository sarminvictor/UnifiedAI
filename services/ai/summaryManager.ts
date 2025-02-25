import { LLMChain } from "langchain/chains";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { SystemMessage, HumanMessage, AIMessage } from "@langchain/core/messages";
import * as sanitizeUtils from '@/utils/sanitize';
import { ChatMessage, SummaryConfig } from '@/types/ai.types';
import { CHAT_CONSTANTS, SYSTEM_PROMPTS } from '@/constants/ai.constants';

console.log('sanitizeString:', sanitizeUtils.sanitizeString); // Log to verify import

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
    try {
      console.log('Generating summary with:', {
        llm,
        previousMessages,
        currentUserMessage,
        currentAiResponse
      }); // Log input parameters

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
      console.log('Summary response:', summaryResponse);

      if (!summaryResponse?.text) {
        console.warn('No summary text received');
        return null;
      }

      try {
        const sanitizedSummary = sanitizeUtils.sanitizeString(summaryResponse.text.trim());
        console.log('Sanitized summary:', sanitizedSummary);
        return sanitizedSummary;
      } catch (error) {
        console.error('Error sanitizing summary:', error);
        return summaryResponse.text.trim();
      }
    } catch (error) {
      console.error('Error generating summary:', error);
      return null;
    }
  }
}
