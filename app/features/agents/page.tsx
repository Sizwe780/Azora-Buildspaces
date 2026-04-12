'use client'

import { RoomPageLayout } from "@/components/layouts/room-page-layout"
import { Bot, Network, Workflow, BrainCircuit, CheckSquare, Zap } from "lucide-react"

export default function AgentsFeaturePage() {
  return (
    <RoomPageLayout
      roomName="Autonomous Agents"
      roomTagline="A Family of Specialized Coders"
      roomDescription="Meet your ultimate AI engineering team. Delegate complex infrastructure, design specs, full-stack implementation, and multi-file debugging to specialized agents."
      roomIcon={Bot}
      accentColor="indigo"
      demoHref="/demo-command-desk"
      ctaTitle="Delegate Your First Task"
      ctaDescription="Access the primary Command Desk to orchestrate a fleet of contextual engineers instantly."
      features={[
        { icon: Bot, title: "Specialized Roles", description: "Designers, Engineers, QA testers, and DevOps specialists all acting within context." },
        { icon: BrainCircuit, title: "Long-Term Memory", description: "Agents actively read past session architectures scaling knowledge across the whole App." },
        { icon: Network, title: "Agent to Agent Communication", description: "Microservices communicate: designers create the spec, engineers follow the spec silently." },
        { icon: CheckSquare, title: "Constitutional Guardrails", description: "Safe output. Prevents agents from producing harmful or hallucinated dependencies." },
        { icon: Workflow, title: "Multi-file Refactoring", description: "Agents can sweep an entire node_modules folder or 30 TSX files at once." },
        { icon: Zap, title: "Real-time Monitoring", description: "Observe the explicit thought processes, searches, and terminal actions the agents perform." },
      ]}
      capabilities={[
        "Autonomous Multi-file generation",
        "System-wide bug patching",
        "CI/CD creation via Agents",
        "Design-to-Code specs",
        "E2E Test generation",
        "Vulnerability scanning"
      ]}
    />
  )
}
