"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
    Play, Pause, Square, Settings, Users, MessageSquare,
    Mic, MicOff, Video, VideoOff, Circle as Record, Share2,
    QrCode, ChevronLeft, ChevronRight, Clock, FileText,
    AlignLeft, ThumbsUp, ThumbsDown, BarChart3, Maximize2, Timer
} from "lucide-react";
import SlideEditor from "./SlideEditor";
import LiveDemo from "./LiveDemo";
import AudienceFeedback from "./AudienceFeedback";

const SAMPLE_SLIDES = [
    { id: 1, title: "Introduction", body: "Welcome to the Innovation Theater\n\nPresenting breakthrough ideas that reshape the future.", notes: "Start with a strong hook. Mention key stakeholders in the room. Target: 2 minutes." },
    { id: 2, title: "The Problem", body: "Current State\n\n• 73% of teams lack real-time collaboration\n• Manual workflows cost 4hrs/day per person\n• Context-switching reduces productivity by 40%", notes: "Use the statistics to create urgency. Pause after each stat." },
    { id: 3, title: "Our Solution", body: "Azora Buildspaces\n\nA unified workspace that brings every tool into one intelligent platform.", notes: "Emphasize the word 'unified'. Show demo after this slide." },
    { id: 4, title: "Architecture", body: "Technical Overview\n\n┌─────────────────┐\n│   Elara AI Core │\n└────────┬────────┘\n         │\n  ┌──────┴──────┐\n  │  9 Rooms    │\n  └─────────────┘", notes: "Technical audience — go deeper here. Have diagram ready." },
    { id: 5, title: "Roadmap", body: "What's Next\n\nQ1: Multi-agent workflows\nQ2: Enterprise SSO\nQ3: Mobile apps\nQ4: API marketplace", notes: "Keep this brief — 90 seconds max. Q&A will cover specifics." },
];

interface QaQuestion {
    id: number;
    question: string;
    author: string;
    votes: number;
    answered: boolean;
}

export default function InnovationTheater() {
    const [isStreaming, setIsStreaming] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [isMicOn, setIsMicOn] = useState(true);
    const [isVideoOn, setIsVideoOn] = useState(true);
    const [activeTab, setActiveTab] = useState("slides");
    const [currentSlide, setCurrentSlide] = useState(1);
    const [totalSlides] = useState(SAMPLE_SLIDES.length);
    const [showNotes, setShowNotes] = useState(false);
    const [isTeleprompter, setIsTeleprompter] = useState(false);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [isTimerRunning, setIsTimerRunning] = useState(false);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const [qaQuestions, setQaQuestions] = useState<QaQuestion[]>([
        { id: 1, question: "Can you explain the architecture diagram in more detail?", author: "Sarah Chen", votes: 5, answered: false },
        { id: 2, question: "What's the performance impact of this implementation?", author: "Mike Ross", votes: 3, answered: false },
        { id: 3, question: "Are there any security considerations?", author: "Jessica P", votes: 2, answered: true },
    ]);

    const activeSlide = SAMPLE_SLIDES[currentSlide - 1];

    // Presentation timer
    useEffect(() => {
        if (isTimerRunning) {
            timerRef.current = setInterval(() => setElapsedSeconds(s => s + 1), 1000);
        } else {
            if (timerRef.current) clearInterval(timerRef.current);
        }
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [isTimerRunning]);

    const formatTimer = (s: number) =>
        `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

    const goToSlide = (n: number) => setCurrentSlide(Math.max(1, Math.min(totalSlides, n)));

    const voteQuestion = (id: number) => {
        setQaQuestions(prev => prev.map(q => q.id === id ? { ...q, votes: q.votes + 1 } : q));
    };
    const markAnswered = (id: number) => {
        setQaQuestions(prev => prev.map(q => q.id === id ? { ...q, answered: true } : q));
    };

    return (
        <div className="h-full flex flex-col bg-slate-950 text-white">
            {/* Header */}
            <div className="h-14 flex items-center justify-between px-5 border-b border-white/10 bg-slate-900/60 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20">
                        <Play className="w-4 h-4 text-purple-400" />
                        <span className="text-sm font-semibold text-purple-300">Innovation Theater</span>
                    </div>
                    {isStreaming && <Badge className="bg-red-600 animate-pulse text-xs">LIVE</Badge>}
                    {isRecording && <Badge className="bg-red-700 text-xs">REC</Badge>}
                    <div className="flex items-center gap-1.5 text-sm text-slate-400">
                        <Users className="w-4 h-4" />
                        <span>124 viewers</span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {/* Presentation Timer */}
                    <button
                        onClick={() => { setIsTimerRunning(r => !r); if (!isTimerRunning) setElapsedSeconds(0); }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono transition-colors ${
                            isTimerRunning ? "border-amber-500/50 bg-amber-500/10 text-amber-300" : "border-white/10 text-slate-400 hover:text-white"
                        }`}
                    >
                        <Timer className="w-3.5 h-3.5" />
                        {formatTimer(elapsedSeconds)}
                    </button>

                    <div className="w-px h-5 bg-white/10" />

                    <Button variant="ghost" size="sm" onClick={() => setIsMicOn(!isMicOn)}
                        className={`h-8 w-8 p-0 ${!isMicOn && "bg-red-600/20 text-red-400"}`}>
                        {isMicOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setIsVideoOn(!isVideoOn)}
                        className={`h-8 w-8 p-0 ${!isVideoOn && "bg-red-600/20 text-red-400"}`}>
                        {isVideoOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                    </Button>
                    <Button variant={isRecording ? "destructive" : "outline"} size="sm" onClick={() => setIsRecording(!isRecording)} className="gap-1 text-xs">
                        <Record className="w-3.5 h-3.5" />
                        {isRecording ? "Stop Rec" : "Record"}
                    </Button>
                    <Button size="sm" onClick={() => setIsStreaming(!isStreaming)}
                        className={`gap-1.5 text-xs ${isStreaming ? "bg-red-600 hover:bg-red-700" : "bg-purple-600 hover:bg-purple-700"}`}>
                        {isStreaming ? <><Square className="w-3.5 h-3.5" />Stop</> : <><Play className="w-3.5 h-3.5" />Go Live</>}
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-white">
                        <Share2 className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left Panel — Slide thumbnails + tools */}
                <div className="w-72 border-r border-white/10 bg-slate-900/40 flex flex-col">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
                        <TabsList className="grid w-full grid-cols-4 h-10 rounded-none border-b border-white/10 bg-slate-900/60">
                            <TabsTrigger value="slides" className="text-xs">Slides</TabsTrigger>
                            <TabsTrigger value="demo" className="text-xs">Demo</TabsTrigger>
                            <TabsTrigger value="feedback" className="text-xs">Feedback</TabsTrigger>
                            <TabsTrigger value="qa" className="text-xs">Q&A</TabsTrigger>
                        </TabsList>

                        <TabsContent value="slides" className="flex-1 m-0 overflow-y-auto p-3 space-y-2">
                            {SAMPLE_SLIDES.map((slide, i) => (
                                <button
                                    key={slide.id}
                                    onClick={() => goToSlide(i + 1)}
                                    className={`w-full text-left rounded-lg overflow-hidden border transition-all ${
                                        currentSlide === i + 1
                                            ? "border-purple-500 ring-1 ring-purple-500/30"
                                            : "border-white/10 hover:border-white/30"
                                    }`}
                                >
                                    {/* 16:9 thumbnail */}
                                    <div className="aspect-video bg-gradient-to-br from-slate-800 to-slate-900 p-2 flex flex-col justify-between">
                                        <span className="text-[9px] font-bold text-purple-400 uppercase tracking-wider">
                                            {i + 1} / {totalSlides}
                                        </span>
                                        <div>
                                            <div className="text-[10px] font-semibold text-white truncate">{slide.title}</div>
                                            <div className="text-[8px] text-slate-500 line-clamp-2 mt-0.5">{slide.body.substring(0, 60)}</div>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </TabsContent>

                        <TabsContent value="demo" className="flex-1 m-0">
                            <LiveDemo />
                        </TabsContent>

                        <TabsContent value="feedback" className="flex-1 m-0">
                            <AudienceFeedback />
                        </TabsContent>

                        <TabsContent value="qa" className="flex-1 m-0 overflow-y-auto">
                            <div className="p-4 border-b border-white/10 flex items-center justify-between">
                                <span className="text-sm font-semibold flex items-center gap-2">
                                    <MessageSquare className="w-4 h-4" />Q&A
                                </span>
                                <div className="flex gap-3 text-xs text-slate-400">
                                    <span className="text-blue-400 font-bold">{qaQuestions.length}</span> total
                                    <span className="text-emerald-400 font-bold">{qaQuestions.filter(q => q.answered).length}</span> answered
                                </div>
                            </div>
                            <div className="p-3 space-y-2">
                                {qaQuestions
                                    .sort((a, b) => b.votes - a.votes)
                                    .map((q) => (
                                    <div key={q.id} className={`p-3 rounded-lg border text-sm ${q.answered ? "bg-emerald-500/5 border-emerald-500/20" : "bg-slate-800/50 border-white/10"}`}>
                                        <div className="flex items-start justify-between gap-2 mb-1.5">
                                            <span className="font-medium text-xs text-slate-300">{q.author}</span>
                                            {q.answered && <Badge className="text-[9px] h-4 bg-emerald-600">Answered</Badge>}
                                        </div>
                                        <p className="text-slate-200 text-xs mb-2 leading-relaxed">{q.question}</p>
                                        <div className="flex gap-1.5">
                                            <button onClick={() => voteQuestion(q.id)} className="flex items-center gap-1 px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-xs text-slate-300 transition-colors">
                                                <ThumbsUp className="w-3 h-3" />{q.votes}
                                            </button>
                                            {!q.answered && (
                                                <button onClick={() => markAnswered(q.id)} className="px-2 py-0.5 rounded bg-purple-500/20 hover:bg-purple-500/30 text-xs text-purple-300 transition-colors">
                                                    Mark Answered
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>

                {/* Center — Slide canvas */}
                <div className="flex-1 flex flex-col">
                    {/* Slide canvas at 16:9 */}
                    <div className="flex-1 flex items-center justify-center bg-slate-950 p-6">
                        <div className="w-full max-w-4xl">
                            {isStreaming && (
                                <div className="flex items-center gap-2 text-red-400 text-xs font-medium mb-3">
                                    <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
                                    LIVE — {124} viewers
                                </div>
                            )}
                            {/* 16:9 slide */}
                            <div className="aspect-video bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 rounded-xl border border-white/10 shadow-2xl overflow-hidden flex flex-col justify-between p-10 relative">
                                <div className="absolute top-4 right-4 text-[10px] text-slate-600 font-mono">
                                    {currentSlide} / {totalSlides}
                                </div>
                                {isTeleprompter ? (
                                    <div className="flex-1 flex items-center justify-center">
                                        <div className="text-center max-w-2xl">
                                            <div className="text-2xl font-light text-white leading-relaxed whitespace-pre-line">
                                                {activeSlide?.notes}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div>
                                            <h2 className="text-4xl font-bold text-white mb-6">{activeSlide?.title}</h2>
                                            <pre className="text-lg text-slate-300 font-sans whitespace-pre-wrap leading-relaxed">
                                                {activeSlide?.body}
                                            </pre>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center text-xs font-bold">A</div>
                                                <span className="text-xs text-slate-500">Azora Buildspaces</span>
                                            </div>
                                            <Progress value={(currentSlide / totalSlides) * 100} className="w-32 h-1 bg-white/10" />
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Presenter notes */}
                            {showNotes && (
                                <div className="mt-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                                    <div className="flex items-center gap-2 mb-2">
                                        <FileText className="w-3.5 h-3.5 text-amber-400" />
                                        <span className="text-xs font-semibold text-amber-400">Presenter Notes</span>
                                    </div>
                                    <p className="text-sm text-amber-100/80 leading-relaxed">{activeSlide?.notes}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Control bar */}
                    <div className="h-14 border-t border-white/10 bg-slate-900/60 flex items-center justify-between px-5 shrink-0">
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => goToSlide(currentSlide - 1)}
                                disabled={currentSlide <= 1} className="gap-1 text-xs border-white/20">
                                <ChevronLeft className="w-4 h-4" />Prev
                            </Button>
                            <div className="text-xs text-slate-400 px-3 font-mono">
                                {currentSlide} / {totalSlides}
                            </div>
                            <Button variant="outline" size="sm" onClick={() => goToSlide(currentSlide + 1)}
                                disabled={currentSlide >= totalSlides} className="gap-1 text-xs border-white/20">
                                Next<ChevronRight className="w-4 h-4" />
                            </Button>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setShowNotes(!showNotes)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border transition-colors ${showNotes ? "border-amber-500/50 bg-amber-500/10 text-amber-300" : "border-white/10 text-slate-400 hover:text-white"}`}
                            >
                                <AlignLeft className="w-3.5 h-3.5" />Notes
                            </button>
                            <button
                                onClick={() => setIsTeleprompter(!isTeleprompter)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border transition-colors ${isTeleprompter ? "border-blue-500/50 bg-blue-500/10 text-blue-300" : "border-white/10 text-slate-400 hover:text-white"}`}
                            >
                                <AlignLeft className="w-3.5 h-3.5" />Teleprompter
                            </button>
                            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border border-white/10 text-slate-400 hover:text-white transition-colors">
                                <Maximize2 className="w-3.5 h-3.5" />Fullscreen
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right Panel — Audience Chat */}
                <div className="w-72 border-l border-white/10 bg-slate-900/40 flex flex-col">
                    <div className="h-10 flex items-center px-4 border-b border-white/10">
                        <h3 className="text-sm font-semibold flex items-center gap-2">
                            <MessageSquare className="w-4 h-4 text-purple-400" />
                            Audience Chat
                        </h3>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-2">
                        {[
                        { name: "Alex Johnson", msg: "Amazing demo! Can you show the API integration?", time: "2m", avatar: "A", color: "bg-blue-500" },
                        { name: "Maria Santos", msg: "The performance metrics are impressive 🔥", time: "1m", avatar: "M", color: "bg-emerald-500" },
                        { name: "David Kim", msg: "How does this compare to existing solutions?", time: "30s", avatar: "D", color: "bg-orange-500" },
                        ].map((c, i) => (
                            <div key={i} className="bg-slate-800/40 p-2.5 rounded-lg border border-white/5">
                                <div className="flex items-center gap-2 mb-1">
                                    <div className={`w-5 h-5 ${c.color} rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0`}>{c.avatar}</div>
                                    <span className="text-xs font-medium text-white">{c.name}</span>
                                    <span className="text-[10px] text-slate-500 ml-auto">{c.time} ago</span>
                                </div>
                                <p className="text-xs text-slate-300 pl-7 leading-relaxed">{c.msg}</p>
                            </div>
                        ))}
                    </div>
                    <div className="p-3 border-t border-white/10">
                        <input
                            placeholder="Reply to audience..."
                            className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-purple-500/50 transition-colors"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
