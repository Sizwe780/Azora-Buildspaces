import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/config"
import { MiningEngine } from "@/lib/economy/mining-engine"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"
import { executeTool, getTool } from "@/lib/agents/tools"
import { runCommand } from "@/lib/runtime/command-runner"
import { fileSystem } from "@/lib/workspace/file-system"

// Move miningEngine instantiation into the route handler or a getter to facilitate testing
function getMiningEngine() {
  return new MiningEngine()
}

// The AI Studio "run" endpoint used to contain a bunch of hard-coded
// behaviour (previously mocked tool execution/transform logic).  It's now
// backed by a pluggable tool registry so new capabilities can be added
// dynamically without editing this file.
//
// To comply with the Zero-Mock Policy we now perform real actions where
// possible and fall back to a documented TODO for more advanced tooling.
// This keeps the editor interactive while making sure users see genuine
// side effects (running commands, writing files, etc.) rather than fake
// responses.

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { workflowName, nodes } = body

    if (!nodes || !Array.isArray(nodes)) {
      return NextResponse.json({ error: "Invalid nodes" }, { status: 400 })
    }

    const runId = `run-${Date.now()}`
    const startedAt = new Date().toISOString()
    const userId = session.user.id
    
    // Server-Sent Events (SSE) stream for Real-Time Execution
    const customReadable = new ReadableStream({
      async start(controller) {
        const sendEvent = (data: any) => {
          controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`));
        };

        sendEvent({ type: 'start', runId, startedAt, message: `Starting workflow: ${workflowName}` });

        const nodeResults: Record<string, { status: string; output?: string }> = {}
        let currentInput = ""
        let successCount = 0

        for (const node of nodes) {
          nodeResults[node.id] = { status: "running" }
          sendEvent({ type: 'node_start', nodeId: node.id, status: 'running' });

          try {
            if (node.type === "input") {
              currentInput = node.config.prompt || "Hello"
              nodeResults[node.id] = { status: "success", output: currentInput }
              successCount++
            } else if (node.type === "llm") {
              const modelName = node.config.model || "gpt-4o-mini"
              const systemPrompt = node.config.system || "You are a helpful assistant."
              const maxAttempts = 3;
              let lastError: Error | null = null;

              for (let attempt = 1; attempt <= maxAttempts; attempt++) {
                try {
                  sendEvent({ type: 'node_update', nodeId: node.id, message: `Querying ${modelName}... (attempt ${attempt}/${maxAttempts})` });

                  const { text } = await generateText({
                    model: openai(modelName),
                    system: systemPrompt,
                    prompt: currentInput,
                  });

                  // Validate JSON output if the node expects it
                  if (node.config.expectJson) {
                    try {
                      JSON.parse(text);
                    } catch {
                      throw new Error(`LLM returned invalid JSON: ${text.slice(0, 120)}...`);
                    }
                  }

                  currentInput = text;
                  nodeResults[node.id] = { status: "success", output: text };
                  lastError = null;
                  break;
                } catch (err) {
                  lastError = err as Error;
                  if (attempt < maxAttempts) {
                    const backoff = Math.pow(2, attempt) * 500;
                    sendEvent({ type: 'node_update', nodeId: node.id, message: `Retry ${attempt}/${maxAttempts} after ${backoff}ms...` });
                    await new Promise(r => setTimeout(r, backoff));
                  }
                }
              }

              if (lastError) {
                throw lastError;
              }
            } else if (node.type === "tool") {
              const toolName = node.config.toolName || ""
              sendEvent({ type: 'node_update', nodeId: node.id, message: `Executing tool ${toolName}...` });
              
              try {
                const result = await executeTool(toolName, currentInput, node.config)
                if (typeof result === 'string') {
                  currentInput = result
                  nodeResults[node.id] = { status: 'success', output: currentInput }
                } else {
                  currentInput = result.output || ''
                  nodeResults[node.id] = { status: result.status, output: currentInput }
                }
              } catch (err) {
                currentInput = `[Tool error: ${(err as Error).message}] ${currentInput}`
                nodeResults[node.id] = { status: 'error', output: currentInput }
              }
            } else if (node.type === "transform") {
              sendEvent({ type: 'node_update', nodeId: node.id, message: `Running transform...` });
              try {
                const result = await executeTool('transform', currentInput, node.config)
                if (typeof result === 'string') {
                  currentInput = result
                  nodeResults[node.id] = { status: 'success', output: currentInput }
                } else {
                  currentInput = result.output || ''
                  nodeResults[node.id] = { status: result.status, output: currentInput }
                }
              } catch (err) {
                currentInput = `[Transform error: ${(err as Error).message}] ${currentInput}`
                nodeResults[node.id] = { status: 'error', output: currentInput }
              }
            } else if (node.type === "output") {
              nodeResults[node.id] = { status: "success", output: currentInput }
            } else {
              nodeResults[node.id] = { status: "success" }
            }
          } catch (error) {
            console.error(`Error in node ${node.id}:`, error)
            nodeResults[node.id] = { status: "error" }
            sendEvent({ type: 'node_end', nodeId: node.id, status: 'error', result: nodeResults[node.id] });
            break
          }
          
          sendEvent({ type: 'node_end', nodeId: node.id, status: nodeResults[node.id].status, result: nodeResults[node.id] });
        }

        const duration = (Date.now() - new Date(startedAt).getTime()) / 1000
        const stepsCompleted = Object.values(nodeResults).filter((r) => r.status === "success").length
        const runStatus = stepsCompleted === nodes.length ? "completed" : "failed"
        
        const run = {
          id: runId,
          status: runStatus,
          startedAt,
          duration,
          steps: nodes.length,
          stepsCompleted,
        }

        // Award tokens for successful workflow completion (Proof-of-Knowledge)
        if (runStatus === "completed" && nodes.length > 1) {
          try {
            const miningEngine = getMiningEngine()
            await miningEngine.awardByType(
              userId, 
              'FEATURE_COMPLETE', 
              `AI Studio: Successfully completed multi-node workflow "${workflowName || 'Untitled'}" (${nodes.length} steps)`
            )
          } catch (rewardError) {
            console.warn("[AI Studio] Token award failed:", rewardError)
          }
        }

        sendEvent({ type: 'complete', run, nodeResults });
        controller.close();
      }
    });

    return new Response(customReadable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error("Workflow run error:", error)
    return NextResponse.json({ error: "Failed to run workflow" }, { status: 500 })
  }
}
