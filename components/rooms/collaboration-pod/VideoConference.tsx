"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Video, VideoOff, Mic, MicOff, PhoneOff, Monitor, MessageSquare, Users, Settings } from "lucide-react";

import * as Y from "yjs";
// Dynamic import for browser-only module
const getWebsocketProvider = () => import("y-websocket").then(m => m.WebsocketProvider);

interface VideoConferenceProps {
    ydoc: Y.Doc;
    provider: any;
}

/**
 * ICE servers — uses Google STUN + optional TURN from env.
 * For production, set NEXT_PUBLIC_TURN_URL / NEXT_PUBLIC_TURN_USER / NEXT_PUBLIC_TURN_CRED.
 */
const ICE_SERVERS: RTCIceServer[] = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    ...(typeof window !== "undefined" && process.env.NEXT_PUBLIC_TURN_URL
        ? [{
            urls: process.env.NEXT_PUBLIC_TURN_URL,
            username: process.env.NEXT_PUBLIC_TURN_USER ?? "",
            credential: process.env.NEXT_PUBLIC_TURN_CRED ?? "",
        }]
        : []),
];

interface RemotePeer {
    id: number;
    name: string;
    video: boolean;
    mic: boolean;
    isSpeaking: boolean;
    stream: MediaStream | null;
}

export default function VideoConference({ ydoc, provider }: VideoConferenceProps) {
    const sessionResult = useSession();
    const session = sessionResult?.data ?? null;
    const [isVideoOn, setIsVideoOn] = useState(true);
    const [isMicOn, setIsMicOn] = useState(true);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [isCallActive, setIsCallActive] = useState(false);
    const [participants, setParticipants] = useState<any[]>([]);
    const [remotePeers, setRemotePeers] = useState<Map<number, RemotePeer>>(new Map());
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
    const localVideoRef = useRef<HTMLVideoElement>(null);

    // WebRTC peer connection map: clientId → RTCPeerConnection
    const peerConnections = useRef<Map<number, RTCPeerConnection>>(new Map());
    const localStreamRef = useRef<MediaStream | null>(null);
    const isCallActiveRef = useRef(false);

    // Keep refs in sync
    useEffect(() => { isCallActiveRef.current = isCallActive; }, [isCallActive]);
    useEffect(() => { localStreamRef.current = localStream; }, [localStream]);

    // ─── Participant awareness (non-WebRTC metadata) ───
    useEffect(() => {
        if (!provider) return;
        const updateParticipants = () => {
            const states = Array.from(provider.awareness.getStates().entries()) as [number, any][];
            const callParticipants = states
                .map(([id, state]) => ({
                    id,
                    name: state.user?.name || "Anonymous",
                    avatar: state.user?.avatar || "",
                    video: state.video || false,
                    mic: state.mic || false,
                    isSpeaking: state.isSpeaking || false,
                    isInCall: state.isInCall || false,
                }))
                .filter(p => p.isInCall);
            setParticipants(callParticipants);
        };
        provider.awareness.on("change", updateParticipants);
        updateParticipants();
        return () => { provider.awareness.off("change", updateParticipants); };
    }, [provider]);

    // ─── WebRTC Signaling via Yjs awareness ───
    // We piggy-back on awareness state fields:
    //   signal_offer_{toClientId}: { sdp, type }
    //   signal_answer_{toClientId}: { sdp, type }
    //   signal_ice_{toClientId}: RTCIceCandidateInit
    // This avoids a separate WebSocket signaling server.

    const createPeerConnection = useCallback((remoteClientId: number): RTCPeerConnection => {
        const existing = peerConnections.current.get(remoteClientId);
        if (existing) {
            existing.close();
        }

        const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
        peerConnections.current.set(remoteClientId, pc);

        // Add local tracks to the connection
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => {
                pc.addTrack(track, localStreamRef.current!);
            });
        }

        // Handle incoming remote tracks
        pc.ontrack = (event) => {
            const [remoteStream] = event.streams;
            if (remoteStream) {
                setRemotePeers(prev => {
                    const next = new Map(prev);
                    const existing = next.get(remoteClientId);
                    next.set(remoteClientId, {
                        id: remoteClientId,
                        name: existing?.name || `Peer ${remoteClientId}`,
                        video: existing?.video ?? true,
                        mic: existing?.mic ?? true,
                        isSpeaking: existing?.isSpeaking ?? false,
                        stream: remoteStream,
                    });
                    return next;
                });
            }
        };

        // Send ICE candidates to remote peer via awareness
        pc.onicecandidate = (event) => {
            if (event.candidate && provider) {
                const key = `signal_ice_${remoteClientId}`;
                const currentState = provider.awareness.getLocalState() || {};
                const currentIceList = currentState[key] || [];
                
                provider.awareness.setLocalStateField(key, [
                    ...currentIceList,
                    {
                        candidate: event.candidate.toJSON(),
                        ts: Date.now(),
                    }
                ]);
            }
        };

        pc.onconnectionstatechange = () => {
            if (pc.connectionState === "failed" || pc.connectionState === "disconnected" || pc.connectionState === "closed") {
                setRemotePeers(prev => {
                    const next = new Map(prev);
                    next.delete(remoteClientId);
                    return next;
                });
                peerConnections.current.delete(remoteClientId);
            }
        };

        return pc;
    }, [provider]);

    // Initiate offer to a remote peer
    const sendOffer = useCallback(async (remoteClientId: number) => {
        if (!provider) return;
        const pc = createPeerConnection(remoteClientId);
        try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            provider.awareness.setLocalStateField(`signal_offer_${remoteClientId}`, {
                sdp: offer.sdp,
                type: offer.type,
                ts: Date.now(),
            });
        } catch (err) {
            console.warn("[WebRTC] Failed to send offer:", err);
        }
    }, [provider, createPeerConnection]);

    // Handle incoming signaling via awareness changes
    useEffect(() => {
        if (!provider) return;

        const myId = provider.awareness.clientID;

        const handleAwarenessChange = () => {
            if (!isCallActiveRef.current) return;

            const states = provider.awareness.getStates();

            states.forEach((state: any, clientId: number) => {
                if (clientId === myId) return;

                // Check for offer addressed to me
                const offerKey = `signal_offer_${myId}`;
                const offer = state[offerKey];
                if (offer && offer.sdp) {
                    handleIncomingOffer(clientId, offer);
                }

                // Check for answer addressed to me
                const answerKey = `signal_answer_${myId}`;
                const answer = state[answerKey];
                if (answer && answer.sdp) {
                    handleIncomingAnswer(clientId, answer);
                }

                // Check for ICE candidate addressed to me
                const iceKey = `signal_ice_${myId}`;
                const iceData = state[iceKey];
                if (Array.isArray(iceData)) {
                    iceData.forEach(ice => handleIncomingIce(clientId, ice));
                } else if (iceData && iceData.candidate) {
                    handleIncomingIce(clientId, iceData);
                }
            });
        };

        const processedOffers = new Set<string>();
        const processedAnswers = new Set<string>();
        const processedIce = new Set<string>();

        const handleIncomingOffer = async (fromClientId: number, offer: any) => {
            const key = `${fromClientId}_${offer.ts}`;
            if (processedOffers.has(key)) return;
            processedOffers.add(key);

            try {
                const pc = createPeerConnection(fromClientId);
                await pc.setRemoteDescription(new RTCSessionDescription({ sdp: offer.sdp, type: offer.type }));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                
                // Process pending ICE candidates
                const queue = pendingIceCandidates.get(fromClientId) || [];
                for (const candidate of queue) {
                    await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(e => console.warn(e));
                }
                pendingIceCandidates.delete(fromClientId);

                provider.awareness.setLocalStateField(`signal_answer_${fromClientId}`, {
                    sdp: answer.sdp,
                    type: answer.type,
                    ts: Date.now(),
                });
            } catch (err) {
                console.warn("[WebRTC] Failed to handle offer:", err);
            }
        };

        const handleIncomingAnswer = async (fromClientId: number, answer: any) => {
            const key = `${fromClientId}_${answer.ts}`;
            if (processedAnswers.has(key)) return;
            processedAnswers.add(key);

            try {
                const pc = peerConnections.current.get(fromClientId);
                if (pc && pc.signalingState === "have-local-offer") {
                    await pc.setRemoteDescription(new RTCSessionDescription({ sdp: answer.sdp, type: answer.type }));
                    
                    // Process pending ICE candidates
                    const queue = pendingIceCandidates.get(fromClientId) || [];
                    for (const candidate of queue) {
                        await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(e => console.warn(e));
                    }
                    pendingIceCandidates.delete(fromClientId);
                }
            } catch (err) {
                console.warn("[WebRTC] Failed to handle answer:", err);
            }
        };

        const pendingIceCandidates = new Map<number, any[]>();

        const handleIncomingIce = async (fromClientId: number, ice: any) => {
            const key = `${fromClientId}_${ice.ts}_${JSON.stringify(ice.candidate).slice(0, 40)}`;
            if (processedIce.has(key)) return;
            processedIce.add(key);

            try {
                const pc = peerConnections.current.get(fromClientId);
                if (pc) {
                    if (pc.remoteDescription && pc.remoteDescription.type) {
                        await pc.addIceCandidate(new RTCIceCandidate(ice.candidate));
                    } else {
                        const queue = pendingIceCandidates.get(fromClientId) || [];
                        queue.push(ice.candidate);
                        pendingIceCandidates.set(fromClientId, queue);
                    }
                }
            } catch (err) {
                console.warn("[WebRTC] Failed to add ICE candidate:", err);
            }
        };

        provider.awareness.on("change", handleAwarenessChange);
        return () => { provider.awareness.off("change", handleAwarenessChange); };
    }, [provider, createPeerConnection]);

    // When joining the call, send offers to all existing peers
    const connectToExistingPeers = useCallback(() => {
        if (!provider) return;
        const myId = provider.awareness.clientID;
        const states = provider.awareness.getStates();
        states.forEach((_state: any, clientId: number) => {
            if (clientId === myId) return;
            const state = _state as any;
            if (state.isInCall) {
                sendOffer(clientId);
            }
        });
    }, [provider, sendOffer]);

    // Update remote peer metadata when awareness changes
    useEffect(() => {
        if (!provider) return;
        const updateRemoteMeta = () => {
            const states = provider.awareness.getStates();
            setRemotePeers(prev => {
                const next = new Map(prev);
                let changed = false;
                next.forEach((peer, clientId) => {
                    const state = states.get(clientId) as any;
                    if (state) {
                        const updated = {
                            ...peer,
                            name: state.user?.name || peer.name,
                            video: state.video ?? peer.video,
                            mic: state.mic ?? peer.mic,
                            isSpeaking: state.isSpeaking ?? peer.isSpeaking,
                        };
                        if (JSON.stringify(updated) !== JSON.stringify(peer)) {
                            next.set(clientId, updated);
                            changed = true;
                        }
                    }
                });
                return changed ? next : prev;
            });
        };
        provider.awareness.on("change", updateRemoteMeta);
        return () => { provider.awareness.off("change", updateRemoteMeta); };
    }, [provider]);

    // ─── Media Controls ───

    const startLocalStream = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            setLocalStream(stream);
            localStreamRef.current = stream;
            if (localVideoRef.current) localVideoRef.current.srcObject = stream;
            
            // Add tracks to any existing peer connections that missed them
            peerConnections.current.forEach((pc) => {
                const senders = pc.getSenders();
                const hasVideo = senders.some(s => s.track && s.track.kind === 'video');
                const hasAudio = senders.some(s => s.track && s.track.kind === 'audio');
                
                stream.getTracks().forEach(track => {
                    const alreadyHasKind = track.kind === 'video' ? hasVideo : hasAudio;
                    if (!alreadyHasKind) {
                        pc.addTrack(track, stream);
                    }
                });
            });
            
            return stream;
        } catch (err) {
            console.warn("Could not access camera/mic:", err);
            return null;
        }
    };

    const stopLocalStream = () => {
        localStream?.getTracks().forEach(t => t.stop());
        setLocalStream(null);
        localStreamRef.current = null;
        if (localVideoRef.current) localVideoRef.current.srcObject = null;
    };

    const closeAllPeerConnections = () => {
        peerConnections.current.forEach(pc => pc.close());
        peerConnections.current.clear();
        setRemotePeers(new Map());
    };

    const toggleCall = async () => {
        const newState = !isCallActive;
        setIsCallActive(newState);
        isCallActiveRef.current = newState;

        if (newState) {
            const stream = await startLocalStream();
            if (stream) {
                localStreamRef.current = stream;
                provider.awareness.setLocalStateField("isInCall", true);
                provider.awareness.setLocalStateField("video", isVideoOn);
                provider.awareness.setLocalStateField("mic", isMicOn);
                // Small delay for awareness to propagate, then connect
                setTimeout(() => connectToExistingPeers(), 500);
            }
        } else {
            stopLocalStream();
            stopScreenShare();
            closeAllPeerConnections();
            // Clear signaling fields
            provider.awareness.setLocalStateField("isInCall", false);
            provider.awareness.setLocalStateField("video", false);
            provider.awareness.setLocalStateField("mic", false);
        }
    };

    const toggleVideo = () => {
        const newState = !isVideoOn;
        setIsVideoOn(newState);
        localStream?.getVideoTracks().forEach(t => { t.enabled = newState; });
        provider.awareness.setLocalStateField("video", newState);
    };

    const toggleMic = () => {
        const newState = !isMicOn;
        setIsMicOn(newState);
        localStream?.getAudioTracks().forEach(t => { t.enabled = newState; });
        provider.awareness.setLocalStateField("mic", newState);
    };

    const startScreenShare = async () => {
        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
            setScreenStream(stream);
            setIsScreenSharing(true);

            // Replace video track in all peer connections with screen track
            const screenTrack = stream.getVideoTracks()[0];
            peerConnections.current.forEach(pc => {
                const sender = pc.getSenders().find(s => s.track?.kind === "video");
                if (sender) sender.replaceTrack(screenTrack);
            });

            screenTrack.addEventListener("ended", () => {
                setIsScreenSharing(false);
                setScreenStream(null);
                // Restore camera track
                const camTrack = localStream?.getVideoTracks()[0];
                if (camTrack) {
                    peerConnections.current.forEach(pc => {
                        const sender = pc.getSenders().find(s => s.track?.kind === "video");
                        if (sender) sender.replaceTrack(camTrack);
                    });
                }
            });
        } catch {
            setIsScreenSharing(false);
        }
    };

    const stopScreenShare = () => {
        screenStream?.getTracks().forEach(t => t.stop());
        setScreenStream(null);
        setIsScreenSharing(false);
        // Restore camera track
        const camTrack = localStream?.getVideoTracks()[0];
        if (camTrack) {
            peerConnections.current.forEach(pc => {
                const sender = pc.getSenders().find(s => s.track?.kind === "video");
                if (sender) sender.replaceTrack(camTrack);
            });
        }
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            localStreamRef.current?.getTracks().forEach(t => t.stop());
            peerConnections.current.forEach(pc => pc.close());
            peerConnections.current.clear();
        };
    }, []);

    // Helper: attach remote stream to video element
    const remoteVideoRef = useCallback((el: HTMLVideoElement | null, stream: MediaStream | null) => {
        if (el && stream && el.srcObject !== stream) {
            el.srcObject = stream;
        }
    }, []);

    const remotePeerArray = Array.from(remotePeers.values());

    return (
        <div className="h-full flex flex-col bg-slate-900">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
                <div className="flex items-center gap-4">
                    <h3 className="font-semibold text-white">Team Standup</h3>
                    <Badge variant="secondary" className={isCallActive ? "bg-green-600" : "bg-slate-700"}>
                        {isCallActive ? "Live" : "Idle"}
                    </Badge>
                    {isCallActive && remotePeerArray.length > 0 && (
                        <Badge variant="secondary" className="bg-blue-600/50 text-xs">
                            {remotePeerArray.filter(p => p.stream).length} connected
                        </Badge>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">
                        <Users className="w-4 h-4 mr-2" />
                        {participants.length}
                    </Button>
                    <Button variant="outline" size="sm">
                        <MessageSquare className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm">
                        <Settings className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            {/* Video Grid */}
            <div className="flex-1 p-4 overflow-y-auto">
                {!isCallActive ? (
                    <div className="h-full flex flex-col items-center justify-center space-y-6">
                        <div className="w-64 h-48 bg-slate-800 rounded-xl border border-white/10 flex items-center justify-center">
                            <VideoOff className="w-12 h-12 text-slate-600" />
                        </div>
                        <div className="text-center space-y-4">
                            <h4 className="text-white font-medium">Ready to join?</h4>
                            <p className="text-slate-400 text-sm">WebRTC peer-to-peer • end-to-end encrypted</p>
                            <Button size="lg" className="bg-blue-600 hover:bg-blue-700 px-8" onClick={toggleCall}>
                                Join Call
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* Screen Share (full width when active) */}
                        {isScreenSharing && screenStream && (
                            <Card className="bg-slate-800 border-blue-500/30 overflow-hidden aspect-video relative col-span-full">
                                <video
                                    autoPlay
                                    muted
                                    playsInline
                                    className="w-full h-full object-contain"
                                    ref={(el) => { if (el && screenStream) el.srcObject = screenStream; }}
                                />
                                <div className="absolute top-2 left-2">
                                    <Badge className="bg-blue-600/50 backdrop-blur text-xs">Screen Share</Badge>
                                </div>
                            </Card>
                        )}

                        {/* My Video */}
                        <Card className="bg-slate-800 border-white/10 overflow-hidden aspect-video relative">
                            {isVideoOn && localStream ? (
                                <video
                                    ref={localVideoRef}
                                    autoPlay
                                    muted
                                    playsInline
                                    className="w-full h-full object-cover"
                                    style={{ transform: "scaleX(-1)" }}
                                />
                            ) : isVideoOn ? (
                                <div className="w-full h-full bg-gradient-to-br from-blue-500/20 to-purple-600/20 flex items-center justify-center">
                                    <Avatar className="w-20 h-20 border-4 border-white/10">
                                        <AvatarImage src={session?.user?.image || ""} />
                                        <AvatarFallback className="text-2xl bg-blue-600">{session?.user?.name?.[0] || "Y"}</AvatarFallback>
                                    </Avatar>
                                </div>
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-slate-900">
                                    <Avatar className="w-16 h-16">
                                        <AvatarFallback className="bg-slate-700">{session?.user?.name?.[0] || "Y"}</AvatarFallback>
                                    </Avatar>
                                </div>
                            )}
                            <div className="absolute top-2 right-2">
                                <Badge className="bg-blue-600/50 backdrop-blur text-xs">You</Badge>
                            </div>
                            <div className="absolute bottom-2 left-2 flex gap-1">
                                {!isMicOn && <Badge variant="destructive" className="p-1"><MicOff className="w-3 h-3" /></Badge>}
                            </div>
                        </Card>

                        {/* Remote Participants — real WebRTC video streams */}
                        {remotePeerArray.map((peer) => (
                            <Card key={peer.id} className="bg-slate-800 border-white/10 overflow-hidden aspect-video relative">
                                {peer.stream && peer.video ? (
                                    <video
                                        autoPlay
                                        playsInline
                                        className="w-full h-full object-cover"
                                        ref={(el) => remoteVideoRef(el, peer.stream)}
                                    />
                                ) : peer.stream && !peer.video ? (
                                    <div className="w-full h-full flex items-center justify-center bg-slate-900">
                                        <Avatar className="w-16 h-16">
                                            <AvatarFallback className="bg-purple-600">{peer.name[0]}</AvatarFallback>
                                        </Avatar>
                                        {/* Audio still plays via the hidden stream */}
                                        <audio
                                            autoPlay
                                            ref={(el) => { if (el && peer.stream) el.srcObject = peer.stream; }}
                                            className="hidden"
                                        />
                                    </div>
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-slate-900">
                                        <Avatar className="w-16 h-16">
                                            <AvatarFallback className="bg-slate-700">{peer.name[0]}</AvatarFallback>
                                        </Avatar>
                                    </div>
                                )}
                                <div className="absolute bottom-2 left-2 flex items-center gap-2">
                                    <span className="text-xs text-white bg-black/50 px-2 py-1 rounded">{peer.name}</span>
                                    {!peer.mic && <Badge variant="destructive" className="p-1"><MicOff className="w-3 h-3" /></Badge>}
                                </div>
                                {peer.isSpeaking && (
                                    <div className="absolute inset-0 border-2 border-green-500 pointer-events-none animate-pulse" />
                                )}
                            </Card>
                        ))}

                        {/* Participants who are in call but not yet WebRTC-connected */}
                        {participants
                            .filter(p => p.id !== provider.awareness.clientID && !remotePeers.has(p.id))
                            .map((p) => (
                                <Card key={p.id} className="bg-slate-800 border-white/10 overflow-hidden aspect-video relative">
                                    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 gap-2">
                                        <Avatar className="w-16 h-16">
                                            <AvatarFallback className="bg-slate-700">{p.name[0]}</AvatarFallback>
                                        </Avatar>
                                        <span className="text-xs text-slate-400">Connecting…</span>
                                    </div>
                                    <div className="absolute bottom-2 left-2">
                                        <span className="text-xs text-white bg-black/50 px-2 py-1 rounded">{p.name}</span>
                                    </div>
                                </Card>
                            ))}
                    </div>
                )}
            </div>

            {/* Controls */}
            {isCallActive && (
                <div className="p-4 border-t border-white/10 bg-slate-800/50">
                    <div className="flex items-center justify-center gap-4">
                        <Button
                            variant={isMicOn ? "outline" : "destructive"}
                            size="lg"
                            onClick={toggleMic}
                            className="w-12 h-12 rounded-full p-0"
                        >
                            {isMicOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                        </Button>

                        <Button
                            variant={isVideoOn ? "outline" : "destructive"}
                            size="lg"
                            onClick={toggleVideo}
                            className="w-12 h-12 rounded-full p-0"
                        >
                            {isVideoOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                        </Button>

                        <Button
                            variant={isScreenSharing ? "default" : "outline"}
                            size="lg"
                            onClick={() => isScreenSharing ? stopScreenShare() : startScreenShare()}
                            className="w-12 h-12 rounded-full p-0"
                        >
                            <Monitor className="w-5 h-5" />
                        </Button>

                        <Button
                            variant="destructive"
                            size="lg"
                            onClick={toggleCall}
                            className="w-12 h-12 rounded-full p-0"
                        >
                            <PhoneOff className="w-5 h-5" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}