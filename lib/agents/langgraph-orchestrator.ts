import { StateGraph, END } from "@langchain/langgraph";
import { Annotation } from "@langchain/langgraph";
import { BaseMessage, HumanMessage, AIMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";

// Define our agent state
const AgentState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
  }),
  nextStep: Annotation<string>(),
  retries: Annotation<number>({
      reducer: (x, y) => x + y,
      default: () => 0
  }),
  isComplete: Annotation<boolean>(),
  errors: Annotation<string[]>({
      reducer: (x, y) => x.concat(y),
      default: () => []
  })
});

export class LangGraphOrchestrator {
  private model: ChatOpenAI;

  constructor(apiKey: string) {
    this.model = new ChatOpenAI({
      openAIApiKey: apiKey,
      modelName: "gpt-4o",
      temperature: 0.7,
    });
  }

  /**
   * Internal reasoning node: "Architect"
   */
  private async architectNode(state: typeof AgentState.State) {
    const lastMessage = state.messages[state.messages.length - 1];
    
    const response = await this.model.invoke([
      new HumanMessage("Review the following request and plan the steps for execution. Return 'VALID' if the plan is sound, or 'FLAWED' if adjustments are needed. Provide reasoning."),
      ...state.messages
    ]);

    const isFlawed = response.content.toString().includes("FLAWED");

    return {
      messages: [response],
      nextStep: isFlawed ? "refine" : "execute",
    };
  }

  /**
   * Execution node: "Artisan"
   */
  private async artisanNode(state: typeof AgentState.State) {
    const response = await this.model.invoke([
      new HumanMessage("Execute the plan developed by the Architect. Provide the final output or code."),
      ...state.messages
    ]);

    return {
      messages: [response],
      isComplete: true
    };
  }

  /**
   * Decision logic for the graph
   */
  private shouldContinue(state: typeof AgentState.State) {
    if (state.isComplete || state.retries >= 3) {
      return END;
    }
    return state.nextStep === "refine" ? "architect" : "artisan";
  }

  /**
   * Build the functional reasoning graph
   */
  public createGraph() {
    const workflow = new StateGraph(AgentState)
      .addNode("architect", this.architectNode.bind(this))
      .addNode("artisan", this.artisanNode.bind(this))
      .addEdge("__start__", "architect")
      .addConditionalEdges("architect", this.shouldContinue.bind(this))
      .addEdge("artisan", END);

    return workflow.compile();
  }

  /**
   * Main entry point to run a multi-step reasoning task
   */
  public async runTask(input: string) {
    const graph = this.createGraph();
    const initialState = {
      messages: [new HumanMessage(input)],
      retries: 0,
      isComplete: false
    };

    const finalState = await graph.invoke(initialState);
    return {
        response: finalState.messages[finalState.messages.length - 1].content,
        trace: finalState.messages.map((m: any) => m.content)
    };
  }
}
