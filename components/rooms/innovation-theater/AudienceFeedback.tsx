"use client";

import { useState, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
    Heart, 
    ThumbsUp, 
    Zap, 
    MessageSquare, 
    TrendingUp, 
    Smile, 
    Frown, 
    Meh,
    Send
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

// No hardcoded comments — feedback comes from real audience during live sessions

export default function AudienceFeedback() {
    const [comments, setComments] = useState<{ id: number; user: string; avatar: string; message: string; time: string; reaction: string }[]>([]);
    const [inputValue, setInputValue] = useState("");
    const [sentiment, setSentiment] = useState(50);

    // Listen for real audience feedback events (e.g. via WebSocket or room event bus)
    useEffect(() => {
        const handler = (e: Event) => {
            const { user, avatar, message, reaction } = (e as CustomEvent).detail || {};
            if (message) {
                const newComment = {
                    id: Date.now(),
                    user: user || 'Anonymous',
                    avatar: avatar || 'A',
                    message,
                    time: 'Just now',
                    reaction: reaction || 'heart',
                };
                setComments(prev => [newComment, ...prev].slice(0, 50));
                // Update sentiment based on positive reaction keywords
                const isPositive = /great|amazing|wow|love|awesome|impressive/i.test(message);
                setSentiment(prev => Math.min(100, Math.max(0, prev + (isPositive ? 3 : -1))));
            }
        };
        window.addEventListener('theater:audience-comment', handler);
        return () => window.removeEventListener('theater:audience-comment', handler);
    }, []);

    const handleSend = () => {
        if (!inputValue.trim()) return;
        const newComment = {
            id: Date.now(),
            user: 'You',
            avatar: 'U',
            message: inputValue,
            time: 'Just now',
            reaction: 'heart'
        };
        setComments(prev => [newComment, ...prev]);
        setInputValue("");
    };

    return (
        <div className="h-full flex flex-col bg-background border-l">
            {/* Sentiment Analysis */}
            <div className="p-4 border-b bg-muted/5">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                        <TrendingUp className="w-3.5 h-3.5" />
                        Live Sentiment
                    </h3>
                    <div className="flex items-center gap-1">
                        {sentiment > 70 ? <Smile className="w-4 h-4 text-green-500" /> : 
                         sentiment > 40 ? <Meh className="w-4 h-4 text-yellow-500" /> : 
                         <Frown className="w-4 h-4 text-red-500" />}
                        <span className={`text-sm font-bold ${sentiment > 70 ? 'text-green-500' : sentiment > 40 ? 'text-yellow-500' : 'text-red-500'}`}>
                            {Math.round(sentiment)}%
                        </span>
                    </div>
                </div>
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                    <motion.div 
                        className={`h-full ${sentiment > 70 ? 'bg-green-500' : sentiment > 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                        animate={{ width: `${sentiment}%` }}
                        transition={{ type: "spring", stiffness: 50 }}
                    />
                </div>
            </div>

            {/* Chat Area */}
            <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                    <AnimatePresence initial={false}>
                        {comments.map((comment) => (
                            <motion.div 
                                key={comment.id} 
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="flex gap-3"
                            >
                                <Avatar className="w-8 h-8 border border-primary/10">
                                    <AvatarFallback className="text-[10px] bg-primary/5">{comment.avatar}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 space-y-1">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold">{comment.user}</span>
                                        <span className="text-[10px] text-muted-foreground">{comment.time}</span>
                                    </div>
                                    <div className="text-sm text-muted-foreground bg-muted/30 p-2.5 rounded-2xl rounded-tl-none border border-white/5">
                                        {comment.message}
                                    </div>
                                    <div className="flex justify-end gap-1 mt-1">
                                        {comment.reaction === 'heart' && <Heart className="w-3 h-3 text-red-500 fill-red-500" />}
                                        {comment.reaction === 'thumbsup' && <ThumbsUp className="w-3 h-3 text-blue-500 fill-blue-500" />}
                                        {comment.reaction === 'zap' && <Zap className="w-3 h-3 text-yellow-500 fill-yellow-500" />}
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="p-4 border-t bg-muted/10 space-y-4">
                <div className="flex gap-2">
                    <Input 
                        placeholder="Ask a question..." 
                        className="bg-background border-white/10 h-9 text-sm"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    />
                    <Button size="icon" className="h-9 w-9 shrink-0" onClick={handleSend}>
                        <Send className="w-4 h-4" />
                    </Button>
                </div>
                <div className="flex justify-around">
                    <button className="p-2 hover:bg-muted rounded-full transition-colors group">
                        <Heart className="w-5 h-5 text-muted-foreground group-hover:text-red-500 group-hover:fill-red-500 transition-colors" />
                    </button>
                    <button className="p-2 hover:bg-muted rounded-full transition-colors group">
                        <ThumbsUp className="w-5 h-5 text-muted-foreground group-hover:text-blue-500 group-hover:fill-blue-500 transition-colors" />
                    </button>
                    <button className="p-2 hover:bg-muted rounded-full transition-colors group">
                        <Zap className="w-5 h-5 text-muted-foreground group-hover:text-yellow-500 group-hover:fill-yellow-500 transition-colors" />
                    </button>
                </div>
            </div>
        </div>
    );
}
