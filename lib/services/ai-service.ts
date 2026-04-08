import { openai } from "@ai-sdk/openai"
import { generateText, streamText, LanguageModel } from "ai"
// import { anthropic } from "@ai-sdk/anthropic" // Future
// import { mistral } from "@ai-sdk/mistral" // Future

export type AIProvider = "openai" | "anthropic" | "local" | "citadel"

export interface AICompletionOptions {
    provider?: AIProvider
    model?: string
    temperature?: number
    system?: string
    prompt: string
    abortSignal?: AbortSignal
}

export class AIService {

    private getProviderModel(provider: AIProvider, modelName?: string): LanguageModel {
        switch (provider) {
            case "openai":
                return openai(modelName || "gpt-4o-mini")
            // case "anthropic":
            //   return anthropic(modelName || "claude-3-haiku-20240307")
            case "citadel":
                // Fallback for Citadel internal models via OpenAI compat layer
                const customUrl = process.env.CITADELSM_ENDPOINT
                if (customUrl) {
                    // we configure via standard openai client but override endpoints
                    const citadelOpenAI = require("@ai-sdk/openai").createOpenAI({ baseURL: customUrl })
                    return citadelOpenAI(modelName || "citadel-model")
                }
                return openai(modelName || "gpt-4o-mini")
            default:
                return openai("gpt-4o-mini")
        }
    }

    async generate(options: AICompletionOptions): Promise<string> {
        const provider = options.provider || (process.env.CODE_CHAMBER_PROVIDER as AIProvider) || "openai"
        const model = this.getProviderModel(provider, options.model)

        const { text } = await generateText({
            model,
            temperature: options.temperature ?? 0,
            system: options.system,
            prompt: options.prompt,
            abortSignal: options.abortSignal,
        })

        return text
    }

    async stream(options: AICompletionOptions) {
        const provider = options.provider || (process.env.CODE_CHAMBER_PROVIDER as AIProvider) || "openai"
        const model = this.getProviderModel(provider, options.model)

        const { textStream } = await streamText({
            model,
            temperature: options.temperature ?? 0.7,
            system: options.system,
            prompt: options.prompt,
            abortSignal: options.abortSignal,
        })

        return textStream
    }
}

export const aiService = new AIService()
