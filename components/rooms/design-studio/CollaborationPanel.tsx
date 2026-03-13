"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, MessageSquare, Eye, Send, Circle } from "lucide-react";

interface Collaborator {
  id: string;
  name: string;
  avatar: string;
  color: string;
  isActive: boolean;
  cursor?: { x: number; y: number };
}

interface Comment {
  id: string;
  author: string;
  text: string;
  timestamp: string;
}

export default function CollaborationPanel({ onClose }: { onClose?: () => void }) {
  // Start empty — populated from real session or workspace context
  const [collaborators, setCollaborators] = useState<Collaborator[]>([
    { id: "self", name: "You", avatar: "👤", color: "#10b981", isActive: true },
  ]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");

  // Listen for collaboration events from the workspace event bus
  useEffect(() => {
    const handler = (e: Event) => {
      const { user, action } = (e as CustomEvent).detail || {};
      if (action === 'join' && user) {
        setCollaborators(prev => {
          if (prev.find(c => c.id === user.id)) return prev;
          return [...prev, { ...user, isActive: true }];
        });
      } else if (action === 'leave' && user) {
        setCollaborators(prev => prev.filter(c => c.id !== user.id));
      }
    };
    window.addEventListener('design:collab-update', handler);
    return () => window.removeEventListener('design:collab-update', handler);
  }, []);

  const handleSendComment = () => {
    if (!newComment.trim()) return;
    const comment: Comment = {
      id: Date.now().toString(),
      author: "You",
      text: newComment.trim(),
      timestamp: "Just now",
    };
    setComments(prev => [...prev, comment]);
    setNewComment("");
  };

  return (
    <div className="h-full overflow-auto p-4 space-y-4">
      {/* Active Users */}
      <div>
        <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
          <Users className="w-4 h-4 text-blue-400" />
          Collaborators
          <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px] ml-auto">
            {collaborators.filter((c) => c.isActive).length} online
          </Badge>
        </h3>
        <div className="space-y-2">
          {collaborators.map((user) => (
            <div
              key={user.id}
              className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.02] border border-white/[0.06]"
            >
              <div className="relative">
                <span className="text-lg">{user.avatar}</span>
                <Circle
                  className={`w-2.5 h-2.5 absolute -bottom-0.5 -right-0.5 ${
                    user.isActive ? "text-emerald-400 fill-emerald-400" : "text-gray-600 fill-gray-600"
                  }`}
                />
              </div>
              <span className="text-sm text-gray-300">{user.name}</span>
              <div
                className="w-2 h-2 rounded-full ml-auto"
                style={{ backgroundColor: user.color }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Comments */}
      <div>
        <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
          <MessageSquare className="w-4 h-4 text-amber-400" />
          Comments
        </h3>
        <div className="space-y-2 mb-3">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.06]"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray-300">{comment.author}</span>
                <span className="text-[10px] text-gray-600">{comment.timestamp}</span>
              </div>
              <p className="text-xs text-gray-400">{comment.text}</p>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            className="flex-1 text-xs bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-gray-300 placeholder:text-gray-600 focus:outline-none focus:border-white/20"
          />
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-gray-400 hover:text-white">
            <Send className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}
