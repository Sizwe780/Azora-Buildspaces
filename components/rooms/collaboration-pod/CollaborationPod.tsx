"use client";

import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useRoomEvents } from "@/lib/hooks/use-room-events";
import * as Y from "yjs";
// Dynamic import for browser-only module
const getWebsocketProvider = () => import("y-websocket").then(m => m.WebsocketProvider);
import { motion, AnimatePresence } from "framer-motion";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Video, Palette, MessageSquare, CheckSquare, Share2, Users, Settings, Bell, Wifi, WifiOff, Monitor, RefreshCw, GitBranch, History, Zap } from "lucide-react";
import VideoConference from "./VideoConference";
import Whiteboard from "./Whiteboard";
import Chat from "./Chat";
import TaskBoard from "./TaskBoard";

// Participants are derived from Yjs awareness (real connected users)
// No hardcoded sample data — the list is populated live.

const EMOJIS = ["👍", "❤️", "🎉", "🔥", "🤔", "😂"];

interface FlyingEmoji {
    id: number;
    emoji: string;
    x: number;
}

interface RoomSettings {
    roomName: string;
    maxParticipants: string;
    videoQuality: string;
    enableTranscription: boolean;
}

const STATUS_COLORS: Record<string, string> = {
    online: "bg-green-500",
    away: "bg-amber-500",
    typing: "bg-blue-400",
};

interface SessionSnapshot {
    id: string;
    timestamp: number;
    participants: string[];
    snapshotLabel: string;
}

export default function CollaborationPod() {
    const { toast } = useToast();
    const { emit, ROOM_EVENTS } = useRoomEvents('collaboration-pod')
    const [activeTab, setActiveTab] = useState("video");
    const [notifications, setNotifications] = useState(5);
    const [isConnected, setIsConnected] = useState(false);

    // Feature 1: Screen Share
    const [isSharing, setIsSharing] = useState(false);
    const screenStreamRef = useRef<MediaStream | null>(null);

    // Roadmap Feature: Driver Mode & Session Handoff
    const [isDriver, setIsDriver] = useState(false);
    const [followingUserId, setFollowingUserId] = useState<number | null>(null);
    const [snapshots, setSnapshots] = useState<SessionSnapshot[]>([]);
    const [isCreatingSnapshot, setIsCreatingSnapshot] = useState(false);

    // Feature 2: Participants — derived from Yjs awareness protocol
    const [participants, setParticipants] = useState<{ id: number; name: string; initials: string; status: 'online' | 'away' | 'typing'; isDriver?: boolean }[]>([]);

    // Feature 3: Emoji Reactions
    const [showEmojiBar, setShowEmojiBar] = useState(false);
    const [flyingEmojis, setFlyingEmojis] = useState<FlyingEmoji[]>([]);
    const emojiIdRef = useRef(0);

    // Feature 4: Reconnect
    const providerRef = useRef<any>(null);
    const ydocRef = useRef<Y.Doc | null>(null);
    const [providerVersion, setProviderVersion] = useState(0);

    // Feature 5: Settings
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [inviteOpen, setInviteOpen] = useState(false);
    const [inviteLink, setInviteLink] = useState("");
    const [settings, setSettings] = useState<RoomSettings>({
        roomName: "Azora Collaboration Pod",
        maxParticipants: "10",
        videoQuality: "Medium",
        enableTranscription: false,
    });
    const [pendingSettings, setPendingSettings] = useState<RoomSettings>(settings);

    // Initialize Yjs — recreated on reconnect via providerVersion
    const [ydoc, setYdoc] = useState<Y.Doc | null>(null);
    const [provider, setProvider] = useState<any>(null);

    useEffect(() => {
        if (ydocRef.current) ydocRef.current.destroy();
        const doc = new Y.Doc();
        ydocRef.current = doc;
        setYdoc(doc);
        let cancelled = false;
        let wsProvider: any = null;

        if (typeof window !== 'undefined') {
            getWebsocketProvider().then(WebsocketProvider => {
                if (cancelled) return;
                const wsUrl = process.env.NEXT_PUBLIC_YJS_WS_URL || (process.env.NODE_ENV === 'production' && typeof window !== 'undefined' ? `wss://${window.location.host}` : 'ws://localhost:1234');
                wsProvider = new WebsocketProvider(wsUrl, 'azora-buildspaces-pod', doc);
                providerRef.current = wsProvider;
                setProvider(wsProvider);
            }).catch(() => {
                // WebSocket provider not available
            });
        }

        return () => {
            cancelled = true;
            wsProvider?.destroy();
            doc.destroy();
            setProvider(null);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [providerVersion]);

    useEffect(() => {
        if (provider) {
            provider.on('status', (event: any) => {
                setIsConnected(event.status === 'connected');
            });
        }
        return () => provider?.destroy();
    }, [provider]);

    // Awareness-driven participant list
    useEffect(() => {
        if (!provider) return;
        const awareness = provider.awareness;
        awareness.setLocalStateField('user', {
            name: 'You',
            initials: 'YO',
            color: '#ec4899',
            isDriver: isDriver,
        });

        const updateParticipants = () => {
            const states = awareness.getStates();
            const users: any[] = [];
            states.forEach((state: any, clientId: number) => {
                if (state.user) {
                    users.push({
                        id: clientId,
                        name: state.user.name || `User ${clientId}`,
                        initials: state.user.initials || state.user.name?.slice(0, 2)?.toUpperCase() || 'U',
                        status: state.user.typing ? 'typing' : 'online',
                        isDriver: state.user.isDriver,
                    });
                }
            });
            setParticipants(users);

            // Handle Following Logic
            const driver = users.find(u => u.isDriver);
            if (driver && driver.id !== awareness.clientID) {
                setFollowingUserId(driver.id);
            } else if (!driver) {
                setFollowingUserId(null);
            }
        };
        awareness.on('change', updateParticipants);
        updateParticipants();
        return () => awareness.off('change', updateParticipants);
    }, [provider, isDriver]);

    // Handle Snapshot Generation
    const createSessionSnapshot = useCallback(async () => {
        if (!provider || !ydoc) return;
        setIsCreatingSnapshot(true);
        try {
            const stateVector = Y.encodeStateVector(ydoc);
            const update = Y.encodeStateAsUpdate(ydoc);
            const snapshotId = `snap-${Date.now()}`;

            const response = await fetch('/api/collaboration/snapshot', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: snapshotId,
                    data: Buffer.from(update).toString('base64'),
                    participants: participants.map(p => p.name)
                })
            });

            if (response.ok) {
                setSnapshots(prev => [{
                    id: snapshotId,
                    timestamp: Date.now(),
                    participants: participants.map(p => p.initials),
                    snapshotLabel: `Handoff Snapshot - ${new Date().toLocaleTimeString()}`
                }, ...prev]);
                toast({ title: "Snapshot Created", description: "Current session state preserved." });
            }
        } catch (err) {
            console.error("Snapshot failed:", err);
        } finally {
            setIsCreatingSnapshot(false);
        }
    }, [provider, ydoc, participants]);

    // Feature 1: Screen share helpers
    const startScreenShare = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
            screenStreamRef.current = stream;
            setIsSharing(true);
            stream.getVideoTracks()[0].addEventListener('ended', () => {
                setIsSharing(false);
                screenStreamRef.current = null;
            });
        } catch {
            setIsSharing(false);
        }
    }, []);

    const stopScreenShare = useCallback(() => {
        screenStreamRef.current?.getTracks().forEach(t => t.stop());
        screenStreamRef.current = null;
        setIsSharing(false);
    }, []);

    useEffect(() => {
        return () => {
            screenStreamRef.current?.getTracks().forEach(t => t.stop());
        };
    }, []);

    // Feature 3: Fire emoji
    const fireEmoji = useCallback((emoji: string) => {
        const id = ++emojiIdRef.current;
        const x = 10 + Math.random() * 80;
        setFlyingEmojis(prev => [...prev, { id, emoji, x }]);
        setTimeout(() => setFlyingEmojis(prev => prev.filter(e => e.id !== id)), 1800);
    }, []);

    // Feature 4: Reconnect handler
    const handleReconnect = useCallback(() => {
        setProviderVersion(v => v + 1);
    }, []);

    // Feature 5: Save settings
    const saveSettings = useCallback(() => {
        setSettings(pendingSettings);
        setSettingsOpen(false);
    }, [pendingSettings]);

    const tabs = [
        { id: "video", label: "Video Call", icon: Video, component: VideoConference },
        { id: "whiteboard", label: "Whiteboard", icon: Palette, component: Whiteboard },
        { id: "chat", label: "Team Chat", icon: MessageSquare, component: Chat },
        { id: "tasks", label: "Task Board", icon: CheckSquare, component: TaskBoard },
    ];

    const ActiveComponent = tabs.find(t => t.id === activeTab)?.component || VideoConference;

    return (
        <div className="h-full flex flex-col bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
            {/* Feature 4: Disconnection banner */}
            {!isConnected && (
                <div className="bg-red-700/80 text-white text-sm px-6 py-2 flex items-center justify-between">
                    <span>⚠️ Disconnected from collaboration server</span>
                    <Button size="sm" variant="ghost" className="text-white hover:text-white hover:bg-red-600" onClick={handleReconnect}>
                        <RefreshCw className="w-3 h-3 mr-1" /> Reconnect
                    </Button>
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/10">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                        {settings.roomName}
                        <Badge variant="secondary" className={isConnected ? "bg-green-600" : "bg-red-600"}>
                            {isConnected ? "Connected" : "Offline"}
                        </Badge>
                        {followingUserId && (
                            <Badge variant="outline" className="border-emerald-500 text-emerald-400 animate-pulse text-[10px]">
                                <Users className="w-2.5 h-2.5 mr-1" /> Following Host
                            </Badge>
                        )}
                    </h1>
                    <p className="text-slate-400">Real-time team collaboration powered by Yjs</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                        {isDriver && <span className="bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-tighter border border-emerald-500/30">Session Driver</span>}
                        {isConnected ? <Wifi className="w-4 h-4 text-emerald-400" /> : <WifiOff className="w-4 h-4 text-red-400" />}
                        <span>{isConnected ? "Sync Active" : "Sync Paused"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Roadmap Feature: Driver & Snapshot Controls */}
                        <div className="flex items-center bg-slate-800/50 rounded-lg p-1 mr-2 border border-white/5">
                            <Button
                                variant={isDriver ? "default" : "ghost"}
                                size="sm"
                                onClick={() => setIsDriver(!isDriver)}
                                className={isDriver ? "bg-emerald-600 hover:bg-emerald-700 h-7 text-[10px]" : "h-7 text-[10px]"}
                            >
                                <Zap className={`w-3 h-3 mr-1 ${isDriver ? "fill-white" : ""}`} />
                                {isDriver ? "Driving" : "Take Lead"}
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                disabled={isCreatingSnapshot}
                                onClick={createSessionSnapshot}
                                className="h-7 text-[10px] text-slate-400 hover:text-white"
                            >
                                {isCreatingSnapshot ? <RefreshCw className="w-3 h-3 animate-spin mr-1" /> : <GitBranch className="w-3 h-3 mr-1" />}
                                Snapshot
                            </Button>
                        </div>

                        {/* Feature 1: Screen Share button */}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={isSharing ? stopScreenShare : startScreenShare}
                            className={isSharing ? "border-green-500 text-green-400" : ""}
                        >
                            <Monitor className="w-4 h-4 mr-2" />
                            {isSharing ? "Sharing" : "Share Screen"}
                        </Button>

                        <div className="relative group">
                            <Button variant="outline" size="sm" className="relative">
                                <History className="w-4 h-4" />
                                {snapshots.length > 0 && (
                                    <Badge className="absolute -top-2 -right-2 w-4 h-4 p-0 flex items-center justify-center text-[8px] bg-purple-600">
                                        {snapshots.length}
                                    </Badge>
                                )}
                            </Button>
                            {/* Snapshots Popover (Feature 6) */}
                            <div className="absolute top-full right-0 mt-2 w-64 bg-slate-900 border border-white/10 rounded-xl shadow-2xl opacity-0 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto transition-all z-50 p-2">
                                <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold px-2 py-1.5 border-b border-white/5 mb-2 flex items-center justify-between">
                                    <span>Session History</span>
                                    <History className="w-3 h-3" />
                                </div>
                                <div className="max-h-60 overflow-y-auto space-y-1">
                                    {snapshots.length === 0 ? (
                                        <div className="text-center py-6 text-slate-600 text-[10px] font-mono italic">No snapshots recorded</div>
                                    ) : (
                                        snapshots.map(snap => (
                                            <button key={snap.id} className="w-full text-left p-2 rounded-lg hover:bg-white/5 border border-transparent hover:border-white/5 transition-all group/item">
                                                <div className="text-[11px] font-bold text-slate-300 truncate group-hover/item:text-white">{snap.snapshotLabel}</div>
                                                <div className="flex items-center justify-between mt-1">
                                                    <div className="flex -space-x-1">
                                                        {snap.participants.slice(0, 3).map((p, i) => (
                                                            <div key={i} className="w-4 h-4 rounded-full bg-slate-700 border border-slate-900 flex items-center justify-center text-[7px] text-white uppercase font-bold">{p}</div>
                                                        ))}
                                                    </div>
                                                    <span className="text-[8px] text-slate-600 font-mono">{new Date(snap.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>
                                            </button>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>

                        <Button variant="outline" size="sm" className="relative">
                            <Bell className="w-4 h-4" />
                            {notifications > 0 && (
                                <Badge className="absolute -top-2 -right-2 w-5 h-5 p-0 flex items-center justify-center text-xs">
                                    {notifications}
                                </Badge>
                            )}
                        </Button>
                        {/* Feature: Invite User Dialog */}
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => {
                                // Generate a mock invite link based on current room logic
                                setInviteLink(typeof window !== "undefined" ? `${window.location.origin}/workspace?room=collaboration-pod&joinToken=${Math.random().toString(36).substr(2, 9)}` : "");
                                setInviteOpen(true);
                            }}
                            className="gap-2 bg-blue-600 hover:bg-blue-700 text-white border-none"
                        >
                            <Share2 className="w-4 h-4 ml-0.5" />
                            Share Link
                        </Button>
                        {/* Feature 5: Settings button */}
                        <Button variant="outline" size="sm" onClick={() => { setPendingSettings(settings); setSettingsOpen(true); }}>
                            <Settings className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Feature 2: Participant presence strip */}
            <div className="flex items-center gap-3 px-6 py-2 border-b border-white/5 bg-slate-900/30">
                <Users className="w-4 h-4 text-slate-400" />
                <Badge variant="secondary" className="bg-slate-700 text-slate-300 text-xs">{participants.length}</Badge>
                <div className="flex items-center gap-2">
                    {participants.map(p => (
                        <div key={p.id} className="relative flex items-center" title={`${p.name} — ${p.status}`}>
                            <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white text-xs font-semibold">
                                {p.initials}
                            </div>
                            <span
                                className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-slate-900 ${STATUS_COLORS[p.status]} ${p.status === "typing" ? "animate-pulse" : ""}`}
                            />
                        </div>
                    ))}
                </div>
                <span className="text-xs text-slate-500 ml-1">
                    {participants.find(p => p.status === "typing")?.name} is typing…
                </span>
            </div>

            {/* Main Content */}
            <div className="flex-1 relative">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
                    <TabsList className="grid w-full grid-cols-4 m-6 mb-0 bg-slate-800/50 border border-white/10">
                        {tabs.map((tab) => (
                            <TabsTrigger
                                key={tab.id}
                                value={tab.id}
                                className="flex items-center gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white"
                            >
                                <tab.icon className="w-4 h-4" />
                                <span className="hidden sm:inline">{tab.label}</span>
                            </TabsTrigger>
                        ))}
                    </TabsList>

                    {/* Feature 3: Emoji hover zone wrapping content */}
                    <div
                        className="flex-1 mx-6 mb-6 mt-4 relative"
                        onMouseEnter={() => setShowEmojiBar(true)}
                        onMouseLeave={() => setShowEmojiBar(false)}
                    >
                        {provider && ydoc && <ActiveComponent ydoc={ydoc} provider={provider} />}

                        {/* Invite Dialog */}
                        <Dialog open={inviteOpen} onOpenChange={(v) => setInviteOpen(v)}>
                            <DialogContent className="border-border bg-background sm:max-w-md">
                                <DialogHeader>
                                    <DialogTitle>Share Workspace Link</DialogTitle>
                                    <p className="text-muted-foreground text-sm mt-2">
                                        Anyone with this link can join this Collab Pod and see your current session state.
                                    </p>
                                </DialogHeader>
                                <div className="flex gap-2 mt-4 items-center">
                                    <Input 
                                        readOnly 
                                        value={inviteLink} 
                                        className="bg-muted border-border font-mono text-xs text-zinc-300"
                                        onClick={(e) => (e.target as HTMLInputElement).select()}
                                    />
                                    <Button 
                                        size="sm" 
                                        className="shrink-0 bg-muted hover:bg-zinc-700 text-foreground" 
                                        onClick={() => navigator.clipboard.writeText(inviteLink)}
                                    >
                                        Copy
                                    </Button>
                                </div>
                                <div className="my-2 border-t border-border/80 pt-4 flex flex-col gap-3">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-zinc-300">Require approval to enter</span>
                                        <Switch defaultChecked />
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-zinc-300">Grant editing permissions</span>
                                        <Switch defaultChecked />
                                    </div>
                                </div>
                            </DialogContent>
                        </Dialog>

                        {/* Emoji reaction bar */}
                        <AnimatePresence>
                            {showEmojiBar && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10 }}
                                    className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 bg-slate-800/90 backdrop-blur-sm rounded-full px-4 py-2 border border-white/10 z-10"
                                >
                                    {EMOJIS.map(emoji => (
                                        <button
                                            key={emoji}
                                            onClick={() => fireEmoji(emoji)}
                                            className="text-xl hover:scale-125 transition-transform"
                                        >
                                            {emoji}
                                        </button>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Flying emojis */}
                        <AnimatePresence>
                            {flyingEmojis.map(e => (
                                <motion.div
                                    key={e.id}
                                    initial={{ opacity: 1, y: 0, x: 0 }}
                                    animate={{ opacity: 0, y: -200, x: 0 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 1.6, ease: "easeOut" }}
                                    className="pointer-events-none absolute bottom-12 text-3xl z-20"
                                    style={{ left: `${e.x}%` }}
                                >
                                    {e.emoji}
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                </Tabs>
            </div>

            {/* Feature 5: Room Settings Dialog */}
            <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
                <DialogContent className="bg-slate-900 border border-white/10 text-white">
                    <DialogHeader>
                        <DialogTitle>Room Settings</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-1">
                            <Label htmlFor="roomName">Room Name</Label>
                            <Input
                                id="roomName"
                                value={pendingSettings.roomName}
                                onChange={e => setPendingSettings(s => ({ ...s, roomName: e.target.value }))}
                                className="bg-slate-800 border-white/10 text-white"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label>Max Participants</Label>
                            <Select
                                value={pendingSettings.maxParticipants}
                                onValueChange={v => setPendingSettings(s => ({ ...s, maxParticipants: v }))}
                            >
                                <SelectTrigger className="bg-slate-800 border-white/10 text-white">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-800 border-white/10 text-white">
                                    {Array.from({ length: 20 }, (_, i) => i + 1).map(n => (
                                        <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <Label>Video Quality</Label>
                            <Select
                                value={pendingSettings.videoQuality}
                                onValueChange={v => setPendingSettings(s => ({ ...s, videoQuality: v }))}
                            >
                                <SelectTrigger className="bg-slate-800 border-white/10 text-white">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-800 border-white/10 text-white">
                                    {["Low", "Medium", "High"].map(q => (
                                        <SelectItem key={q} value={q}>{q}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-center justify-between">
                            <Label htmlFor="transcription">Enable Transcription</Label>
                            <Switch
                                id="transcription"
                                checked={pendingSettings.enableTranscription}
                                onCheckedChange={v => setPendingSettings(s => ({ ...s, enableTranscription: v }))}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setSettingsOpen(false)}>Cancel</Button>
                        <Button onClick={saveSettings} className="bg-blue-600 hover:bg-blue-700">Save</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

