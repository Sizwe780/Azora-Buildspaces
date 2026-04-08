'use client'

import { RoomPageLayout } from "@/components/layouts/room-page-layout"
import { Users, Video, MessageSquare, Share2, Shield, Zap } from "lucide-react"

export default function CollaborationPodPage() {
  return (
    <RoomPageLayout
      roomName="Collaboration Pod"
      roomTagline="The Real-time Hub for Collective Intelligence"
      roomDescription="A unified space for multi-player development. Real-time multi-cursor collaboration, shared whiteboards, video conferencing, and team chat — woven directly into your workflow."
      roomIcon={Users}
      accentColor="cyan"
      demoHref="/demo-collaboration-pod"
      ctaTitle="Accelerate Your Team"
      ctaDescription="The best work is done together. BuildSpaces Collaboration Pod brings your team closer, with real-time tools and AI synchronization."
      features={[
        { icon: Users, title: "Multi-player Editing", description: "Real-time, multi-cursor code editing with Conflict-Free Replicated Data Types (CRDTs)" },
        { icon: Video, title: "Video Conferencing", description: "Integrated high-fidelity voice and video calls with screen sharing to collaborate in context" },
        { icon: MessageSquare, title: "Contextual Chat", description: "Integrated team chat with code snippets, link expansion, and AI-powered summaries" },
        { icon: Share2, title: "Shared Whiteboard", description: "Infinite canvas for brainstorming, architecture diagrams, and mapping out user flows together" },
        { icon: Shield, title: "Access Control", description: "Fine-grained permissions for roles, rooms, and individual files — secure by design" },
        { icon: Zap, title: "AI Coordination", description: "Dedicated agents like Iman and Jabari help coordinate tasks and ensure security in multi-player mode" },
      ]}
      capabilities={[
        "Real-time code and spec collaboration",
        "Context-aware team chat and code referencing",
        "Integrated video calls with low-latency WebRTC",
        "Shared infinite-canvas whiteboarding",
        "Role-Based Access Control (RBAC)",
        "Automated session snapshots and history",
        "Cross-room event notifications",
        "Live peer cursors and selection markers",
        "Emoji reactions and presence indicators",
        "One-click invite system for guests",
      ]}
      visual={
        <div className="rounded-2xl bg-[#161b22] border border-white/[0.06] overflow-hidden shadow-2xl shadow-cyan-500/5">
          <div className="bg-[#0d1117] px-4 py-2.5 border-b border-white/[0.06] flex items-center gap-2">
            <div className="flex gap-1.5"><div className="w-3 h-3 rounded-full bg-red-500/60" /><div className="w-3 h-3 rounded-full bg-yellow-500/60" /><div className="w-3 h-3 rounded-full bg-green-500/60" /></div>
            <span className="text-xs text-gray-500 font-mono ml-3">collaboration-pod — live</span>
            <div className="ml-auto flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-[10px] text-cyan-400 font-mono uppercase tracking-wider">4 Active</span>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 gap-4 h-48">
              {[
                { name: "Sizwe", color: "bg-emerald-500/20", icon: "S" },
                { name: "Jabari", color: "bg-blue-500/20", icon: "J" },
                { name: "Elara", color: "bg-purple-500/20", icon: "E" },
                { name: "Imani", color: "bg-amber-500/20", icon: "I" },
              ].map((p) => (
                <div key={p.name} className={`rounded-xl border border-white/5 flex flex-col items-center justify-center gap-2 ${p.color}`}>
                   <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center font-bold text-lg">{p.icon}</div>
                   <span className="text-xs text-gray-400">{p.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      }
    />
  )
}
