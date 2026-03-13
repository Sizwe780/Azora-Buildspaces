"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRoomEvents } from "@/lib/hooks/use-room-events";
import dynamic from "next/dynamic";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
    Database,
    Server,
    Shield,
    CreditCard,
    Mail,
    HardDrive,
    AlertTriangle,
    FileText,
    Settings,
    Share2,
    Play,
    Download,
    Upload,
    Code,
    Globe,
    Lock,
    Zap,
    Sparkles,
    Cpu,
    Radio,
    Wifi,
    Bluetooth,
    Usb,
    Battery,
    Thermometer,
    Activity,
    CircuitBoard,
    Microchip,
    Wrench,
    TestTube,
    BarChart3,
    Eye,
    Smartphone,
    Loader2,
} from "lucide-react";

import DatabaseDesigner from "./maker-lab/DatabaseDesigner";
import APIEndpointGenerator from "./maker-lab/APIEndpointGenerator";
import AuthTemplateGenerator from "./maker-lab/AuthTemplateGenerator";
import DeploymentConfig from "./maker-lab/DeploymentConfig";
import { SparkInterface } from "./maker-lab/spark-interface";
import CircuitSimulator from "./maker-lab/CircuitSimulator";
import FirmwareEditor from "./maker-lab/FirmwareEditor";
// Dynamic import for Three.js 3D viewer to prevent SSR issues
const ComponentViewer = dynamic(() => import("./maker-lab/ComponentViewer"), {
    ssr: false,
    loading: () => (
        <div className="w-full h-full flex items-center justify-center bg-slate-950 rounded-lg border border-slate-800">
            <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mx-auto mb-2" />
                <p className="text-xs text-slate-500">Loading 3D Viewer...</p>
            </div>
        </div>
    ),
});
import mqtt from "mqtt";

export default function MakerLab() {
    const { emit, ROOM_EVENTS } = useRoomEvents('maker-lab')
    const [mqttClient, setMqttClient] = useState<mqtt.MqttClient | null>(null);
    const [mqttConnectionStatus, setMqttConnectionStatus] = useState("Disconnected");

    const [activeView, setActiveView] = useState("overview");
    const [projectName, setProjectName] = useState("IoT Smart Device");
    const [projectDescription, setProjectDescription] = useState("");
    const [selectedBoard, setSelectedBoard] = useState("esp32");
    const [isSimulating, setIsSimulating] = useState(false);
    const [simulationData, setSimulationData] = useState<any>(null);

    // Sensor live data
    const [sensorReadings, setSensorReadings] = useState<Record<string, number[]>>({
        temperature: [22.4, 22.6, 22.5, 22.8, 23.1, 23.0, 22.9, 23.2],
        humidity:    [61, 62, 61, 60, 62, 63, 61, 62],
        pressure:    [1013, 1014, 1013, 1012, 1013, 1014, 1013, 1012],
        light:       [320, 340, 330, 310, 350, 360, 340, 355],
    });
    const sensorIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Serial monitor
    const [serialLog, setSerialLog] = useState<{ ts: string; data: string; type: "rx" | "tx" }[]>([
        { ts: "00:00:01", data: "ESP32 booting...", type: "rx" },
        { ts: "00:00:02", data: "WiFi connecting to SSID: Azora", type: "rx" },
        { ts: "00:00:03", data: "IP: 192.168.1.42", type: "rx" },
        { ts: "00:00:04", data: "Sensors initialized OK", type: "rx" },
        { ts: "00:00:05", data: "MQTT broker: mqtt.azora.io", type: "rx" },
    ]);
    const [serialCmd, setSerialCmd] = useState("");
    const serialEndRef = useRef<HTMLDivElement>(null);

    // Tests
    const [testResults, setTestResults] = useState<{ name: string; status: "pending" | "pass" | "fail"; duration?: number }[]>([
        { name: "GPIO pin read/write", status: "pending" },
        { name: "WiFi connection", status: "pending" },
        { name: "MQTT publish", status: "pending" },
        { name: "Sensor I2C init", status: "pending" },
        { name: "NVS storage write", status: "pending" },
        { name: "OTA update check", status: "pending" },
    ]);
    const [isRunningTests, setIsRunningTests] = useState(false);

    // OTA Update state
    const [otaVersion, setOtaVersion] = useState("1.0.0");
    const [otaAvailableVersion, setOtaAvailableVersion] = useState("1.0.1");
    const [otaProgress, setOtaProgress] = useState(0);
    const [otaStatus, setOtaStatus] = useState<"idle" | "checking" | "downloading" | "installing" | "complete" | "error">("idle");
    const [otaDevices, setOtaDevices] = useState([
        { id: "dev-001", name: "Living Room Sensor", version: "1.0.0", status: "online" },
        { id: "dev-002", name: "Kitchen Hub", version: "0.9.8", status: "online" },
        { id: "dev-003", name: "Garage Controller", version: "1.0.0", status: "offline" },
    ]);

    const checkForUpdates = async () => {
        setOtaStatus("checking");
        // Simulate API call
        await new Promise(r => setTimeout(r, 1500));
        setOtaAvailableVersion("1.0.2");
        setOtaStatus("idle");
    };

    const startOtaUpdate = async (deviceId?: string) => {
        setOtaStatus("downloading");
        setOtaProgress(0);
        
        // Simulate download progress
        for (let i = 0; i <= 100; i += 5) {
            await new Promise(r => setTimeout(r, 100));
            setOtaProgress(i);
            if (i === 50) setOtaStatus("installing");
        }
        
        setOtaStatus("complete");
        if (deviceId) {
            setOtaDevices(prev => prev.map(d => 
                d.id === deviceId ? { ...d, version: otaAvailableVersion } : d
            ));
        } else {
            setOtaVersion(otaAvailableVersion);
        }
        
        setTimeout(() => setOtaStatus("idle"), 2000);
    };

    // Real MQTT state
    const [mqttTopic, setMqttTopic] = useState("");
    const [mqttPayload, setMqttPayload] = useState("");
    const [mqttTopics, setMqttTopics] = useState<{topic: string, qos: number, messages: number, lastMsg: string}[]>([]);
    
    useEffect(() => {
        // Connect to a public test MQTT WebSockets broker
        const client = mqtt.connect('wss://test.mosquitto.org:8081');
        
        client.on('connect', () => {
            setMqttConnectionStatus("Connected");
            setMqttClient(client);
            // Subscribe to some demo topics
            const defaultTopics = ["device/telemetry", "device/commands", "device/status"];
            defaultTopics.forEach(t => client.subscribe(t));
            setMqttTopics(defaultTopics.map(t => ({ topic: t, qos: 0, messages: 0, lastMsg: "never" })));
        });

        client.on('message', (topic, message) => {
            setMqttTopics(prev => {
                const existing = prev.find(t => t.topic === topic);
                if (existing) {
                    return prev.map(t => t.topic === topic ? { ...t, messages: t.messages + 1, lastMsg: "just now" } : t);
                }
                return [...prev, { topic, qos: 0, messages: 1, lastMsg: "just now" }];
            });
            const ts = new Date().toISOString().substr(11, 8);
            setSerialLog(prev => [...prev, { ts, data: `[MQTTRX] ${topic}: ${message.toString()}`, type: "rx" }]);
        });

        client.on('error', (err) => {
            console.error('MQTT error: ', err);
            setMqttConnectionStatus("Error");
        });

        client.on('offline', () => {
            setMqttConnectionStatus("Offline");
        });

        return () => {
            client.end();
            setMqttClient(null);
            setMqttConnectionStatus("Disconnected");
        };
    }, []);

    // Live sensor simulation
    useEffect(() => {
        sensorIntervalRef.current = setInterval(() => {
            setSensorReadings(prev => {
                const next: Record<string, number[]> = {};
                Object.entries(prev).forEach(([key, vals]) => {
                    const last = vals[vals.length - 1];
                    const noise = (Math.random() - 0.5) * (key === "light" ? 10 : key === "pressure" ? 0.5 : 0.4);
                    const newVal = parseFloat((last + noise).toFixed(1));
                    next[key] = [...vals.slice(-11), newVal];
                });
                return next;
            });
        }, 2000);
        return () => { if (sensorIntervalRef.current) clearInterval(sensorIntervalRef.current); };
    }, []);

    useEffect(() => {
        serialEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [serialLog]);

    const sendSerialCmd = useCallback(() => {
        if (!serialCmd.trim()) return;
        const ts = new Date().toISOString().substr(11, 8);
        setSerialLog(prev => [
            ...prev,
            { ts, data: serialCmd.trim(), type: "tx" },
            { ts, data: `> OK (${serialCmd.trim()})`, type: "rx" },
        ]);
        setSerialCmd("");
    }, [serialCmd]);

    const runTests = useCallback(async () => {
        setIsRunningTests(true);
        setTestResults(prev => prev.map(t => ({ ...t, status: "pending" as const })));
        for (let i = 0; i < testResults.length; i++) {
            await new Promise(r => setTimeout(r, 400 + Math.random() * 300));
            const pass = Math.random() > 0.15;
            const duration = Math.round(50 + Math.random() * 200);
            setTestResults(prev => prev.map((t, idx) => idx === i ? { ...t, status: pass ? "pass" : "fail", duration } : t));
        }
        setIsRunningTests(false);
    }, [testResults.length]);

    const SENSOR_UNITS: Record<string, string> = {
        temperature: "°C", humidity: "%RH", pressure: "hPa", light: "lux"
    };

    const boards = [
        { id: "esp32", name: "ESP32", description: "WiFi & Bluetooth SoC" },
        { id: "esp8266", name: "ESP8266", description: "WiFi SoC" },
        { id: "arduino", name: "Arduino Uno", description: "Classic microcontroller board" },
        { id: "raspberry", name: "Raspberry Pi", description: "Single-board computer" },
        { id: "particle", name: "Particle Photon", description: "IoT development board" }
    ]

    const startSimulation = async () => {
        setIsSimulating(true)
        try {
            const resp = await fetch("/api/maker-lab/simulate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ board: selectedBoard, project: projectName }),
            })
            if (resp.ok) {
                const data = await resp.json()
                setSimulationData(data)
            } else {
                console.error("Simulation request failed:", resp.status)
            }
        } catch (error) {
            console.error('Simulation failed:', error)
        } finally {
            setIsSimulating(false)
        }
    }

    return (
        <div className="h-full flex flex-col bg-background">
            {/* Enhanced Toolbar */}
            <div className="h-14 border-b flex items-center justify-between px-4 bg-muted/20">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 px-3 py-2 bg-orange-500/10 text-orange-500 rounded-lg border border-orange-500/20">
                        <CircuitBoard className="w-5 h-5" />
                        <span className="text-sm font-medium">Maker Lab</span>
                    </div>

                    <span className="text-muted-foreground">/</span>

                    <span className="text-sm font-medium">{projectName}</span>

                    {/* Hardware Status */}
                    <div className="flex items-center gap-2 ml-4">
                        <div className={`w-2 h-2 rounded-full ${
                            simulationData ? 'bg-green-500 animate-pulse' : 'bg-gray-500'
                        }`} />
                        <span className="text-xs text-muted-foreground">
                            {simulationData ? 'Connected' : 'Disconnected'}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Board Selection */}
                    <Select value={selectedBoard} onValueChange={setSelectedBoard}>
                        <SelectTrigger className="w-40">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {boards.map(board => (
                                <SelectItem key={board.id} value={board.id}>
                                    {board.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {/* Action Buttons */}
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={startSimulation}
                        disabled={isSimulating}
                        className="gap-2"
                    >
                        <Play className="w-4 h-4" />
                        {isSimulating ? 'Testing...' : 'Test Hardware'}
                    </Button>

                    <Button 
                        size="sm" 
                        variant="outline" 
                        className="gap-2"
                        onClick={async () => {
                            try {
                                if (!("serial" in navigator)) {
                                    alert("Web Serial API not supported. Please use Chrome or Edge.");
                                    return;
                                }
                                const port = await (navigator as any).serial.requestPort();
                                await port.open({ baudRate: 115200 });
                                const ts = new Date().toISOString().substring(11,19);
                                setSerialLog(prev => [...prev, { ts, data: "Opened Web Serial Port at 115200 baud.", type: "rx" }]);
                                // In a real scenario we'd use esptool.js here via a writer stream to upload the binary
                                setTimeout(() => port.close(), 1000);
                            } catch (e: any) {
                                console.error(e);
                            }
                        }}
                    >
                        <Download className="w-4 h-4" />
                        Flash
                    </Button>

                    <Button size="sm" className="gap-2 bg-orange-500 hover:bg-orange-600">
                        <Upload className="w-4 h-4" />
                        Deploy
                    </Button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-hidden">
                <Tabs value={activeView} onValueChange={setActiveView} className="h-full">
                    <TabsList className="grid w-full grid-cols-7 h-12 rounded-none border-b">
                        <TabsTrigger value="overview" className="gap-2">
                            <Eye className="w-4 h-4" />
                            Overview
                        </TabsTrigger>
                        <TabsTrigger value="circuit" className="gap-2">
                            <CircuitBoard className="w-4 h-4" />
                            Circuit
                        </TabsTrigger>
                        <TabsTrigger value="firmware" className="gap-2">
                            <Microchip className="w-4 h-4" />
                            Firmware
                        </TabsTrigger>
                        <TabsTrigger value="sensors" className="gap-2">
                            <Activity className="w-4 h-4" />
                            Sensors
                        </TabsTrigger>
                        <TabsTrigger value="iot" className="gap-2">
                            <Radio className="w-4 h-4" />
                            IoT
                        </TabsTrigger>
                        <TabsTrigger value="testing" className="gap-2">
                            <TestTube className="w-4 h-4" />
                            Testing
                        </TabsTrigger>
                        <TabsTrigger value="deploy" className="gap-2">
                            <Globe className="w-4 h-4" />
                            Deploy
                        </TabsTrigger>
                    </TabsList>

                    {/* Sensors Tab */}
                    <TabsContent value="sensors" className="h-full m-0 p-4 overflow-y-auto">
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            {Object.entries(sensorReadings).map(([key, vals]) => {
                                const current = vals[vals.length - 1];
                                const min = Math.min(...vals);
                                const max = Math.max(...vals);
                                const unit = SENSOR_UNITS[key] || "";
                                const sparkH = 32;
                                const sparkW = 80;
                                const points = vals.map((v, i) => {
                                    const x = (i / (vals.length - 1)) * sparkW;
                                    const y = sparkH - ((v - min) / (max - min + 0.001)) * sparkH;
                                    return `${x},${y}`;
                                }).join(" ");
                                return (
                                    <Card key={key}>
                                        <CardContent className="p-4">
                                            <div className="flex items-start justify-between mb-2">
                                                <div>
                                                    <div className="text-[10px] text-muted-foreground capitalize font-semibold uppercase tracking-wider">{key}</div>
                                                    <div className="text-2xl font-bold mt-0.5">{current}<span className="text-sm font-normal text-muted-foreground ml-1">{unit}</span></div>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                                    <span className="text-[10px] text-emerald-500">Live</span>
                                                </div>
                                            </div>
                                            {/* Sparkline */}
                                            <svg width={sparkW} height={sparkH} className="mt-1">
                                                <polyline points={points} fill="none" stroke="hsl(var(--primary))" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                            <div className="flex justify-between text-[9px] text-muted-foreground mt-1">
                                                <span>Min {min}{unit}</span>
                                                <span>Max {max}{unit}</span>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>

                        {/* Serial Monitor */}
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm flex items-center gap-2">
                                    <Activity className="w-4 h-4 text-orange-500" />
                                    Serial Monitor
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-3">
                                <div className="bg-black rounded-md border border-border/50 h-32 overflow-y-auto p-2 font-mono text-xs mb-2">
                                    {serialLog.map((entry, i) => (
                                        <div key={i} className={`${entry.type === "tx" ? "text-cyan-400" : "text-emerald-400"}`}>
                                            <span className="text-slate-600 mr-2">[{entry.ts}]</span>
                                            <span className="text-slate-500 mr-1">{entry.type === "tx" ? "→" : "←"}</span>
                                            {entry.data}
                                        </div>
                                    ))}
                                    <div ref={serialEndRef} />
                                </div>
                                <div className="flex gap-2">
                                    <Input
                                        value={serialCmd}
                                        onChange={e => setSerialCmd(e.target.value)}
                                        onKeyDown={e => e.key === "Enter" && sendSerialCmd()}
                                        placeholder="Send command (Enter)..."
                                        className="h-8 text-xs font-mono"
                                    />
                                    <Button size="sm" onClick={sendSerialCmd} className="h-8 text-xs bg-orange-500 hover:bg-orange-600">Send</Button>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* IoT MQTT Tab */}
                    <TabsContent value="iot" className="h-full m-0 p-4 overflow-y-auto">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-semibold">MQTT Broker</h3>
                                <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs">
                                    Connected
                                </Badge>
                            </div>
                            <Card>
                                <CardContent className="p-3">
                                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Broker</div>
                                    <code className="text-xs text-foreground">mqtt.azora.io:1883</code>
                                </CardContent>
                            </Card>
                            <div className="space-y-2">
                                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active Topics</div>
                                {mqttTopics.map((t, i) => (
                                    <div key={i} className="flex items-center justify-between p-3 rounded-lg border bg-muted/10">
                                        <div>
                                            <code className="text-xs text-foreground">{t.topic}</code>
                                            <div className="text-[10px] text-muted-foreground mt-0.5">QoS {t.qos} · {t.messages} msgs · Last {t.lastMsg}</div>
                                        </div>
                                        <Badge variant="outline" className="text-[10px]">Active</Badge>
                                    </div>
                                ))}
                            </div>
                            <div className="space-y-2">
                                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Publish Message</div>
                                <div className="flex gap-2">
                                    <Input 
                                        placeholder="topic/path" 
                                        className="h-8 text-xs font-mono flex-1" 
                                        value={mqttTopic}
                                        onChange={e => setMqttTopic(e.target.value)}
                                    />
                                    <Input 
                                        placeholder="payload JSON" 
                                        className="h-8 text-xs font-mono flex-1"
                                        value={mqttPayload}
                                        onChange={e => setMqttPayload(e.target.value)}
                                        onKeyDown={e => {
                                            if (e.key === "Enter" && mqttClient && mqttTopic) {
                                                mqttClient.publish(mqttTopic, mqttPayload);
                                                const ts = new Date().toISOString().substr(11, 8);
                                                setSerialLog(prev => [...prev, { ts, data: `[MQTTTX] ${mqttTopic}: ${mqttPayload}`, type: "tx" }]);
                                                setMqttPayload("");
                                            }
                                        }}
                                    />
                                    <Button 
                                        size="sm" 
                                        className="h-8 text-xs bg-orange-500 hover:bg-orange-600"
                                        onClick={() => {
                                            if (mqttClient && mqttTopic) {
                                                mqttClient.publish(mqttTopic, mqttPayload);
                                                const ts = new Date().toISOString().substr(11, 8);
                                                setSerialLog(prev => [...prev, { ts, data: `[MQTTTX] ${mqttTopic}: ${mqttPayload}`, type: "tx" }]);
                                                setMqttPayload("");
                                            }
                                        }}
                                    >
                                        Publish
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </TabsContent>

                    {/* Testing Tab */}
                    <TabsContent value="testing" className="h-full m-0 p-4 overflow-y-auto">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-semibold">Hardware Test Suite</h3>
                                <Button
                                    size="sm"
                                    onClick={runTests}
                                    disabled={isRunningTests}
                                    className="gap-2 bg-orange-500 hover:bg-orange-600"
                                >
                                    {isRunningTests ? <><Activity className="w-3.5 h-3.5 animate-spin" />Running…</> : <><Play className="w-3.5 h-3.5" />Run All Tests</>}
                                </Button>
                            </div>

                            {/* Summary */}
                            {testResults.some(t => t.status !== "pending") && (
                                <div className="grid grid-cols-3 gap-3 text-center">
                                    {[
                                        { label: "Passed", count: testResults.filter(t => t.status === "pass").length, color: "text-emerald-500" },
                                        { label: "Failed", count: testResults.filter(t => t.status === "fail").length, color: "text-red-500" },
                                        { label: "Pending", count: testResults.filter(t => t.status === "pending").length, color: "text-slate-400" },
                                    ].map(s => (
                                        <div key={s.label} className="p-3 rounded-lg border bg-muted/10">
                                            <div className={`text-xl font-bold ${s.color}`}>{s.count}</div>
                                            <div className="text-[10px] text-muted-foreground">{s.label}</div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="space-y-2">
                                {testResults.map((test, i) => (
                                    <div key={i} className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                                        test.status === "pass" ? "bg-emerald-500/5 border-emerald-500/20" :
                                        test.status === "fail" ? "bg-red-500/5 border-red-500/20" :
                                        "bg-muted/5 border-border/50"
                                    }`}>
                                        <div className="flex items-center gap-3">
                                            <div className={`w-2 h-2 rounded-full ${
                                                test.status === "pass" ? "bg-emerald-500" :
                                                test.status === "fail" ? "bg-red-500" :
                                                isRunningTests ? "bg-amber-400 animate-pulse" : "bg-slate-600"
                                            }`} />
                                            <span className="text-sm">{test.name}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {test.duration && <span className="text-[10px] text-muted-foreground">{test.duration}ms</span>}
                                            <Badge
                                                variant="outline"
                                                className={`text-[10px] ${
                                                    test.status === "pass" ? "border-emerald-500/30 text-emerald-400" :
                                                    test.status === "fail" ? "border-red-500/30 text-red-400" :
                                                    "border-border text-muted-foreground"
                                                }`}
                                            >
                                                {test.status}
                                            </Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </TabsContent>

                    {/* Deploy Tab with OTA Updates */}
                    <TabsContent value="deploy" className="h-full m-0 p-4 overflow-y-auto">
                        <div className="grid grid-cols-2 gap-6">
                            {/* OTA Updates Section */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <Upload className="w-5 h-5 text-blue-500" />
                                        OTA Firmware Updates
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {/* Current Version Info */}
                                    <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                                        <div>
                                            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Current Version</div>
                                            <div className="text-lg font-bold">{otaVersion}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Available</div>
                                            <div className="text-lg font-bold text-blue-500">{otaAvailableVersion}</div>
                                        </div>
                                    </div>

                                    {/* Progress */}
                                    {otaStatus !== "idle" && otaStatus !== "complete" && (
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-xs">
                                                <span className="capitalize">{otaStatus}...</span>
                                                <span>{otaProgress}%</span>
                                            </div>
                                            <Progress value={otaProgress} className="h-2" />
                                        </div>
                                    )}

                                    {otaStatus === "complete" && (
                                        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-sm text-center">
                                            Update installed successfully!
                                        </div>
                                    )}

                                    {/* Actions */}
                                    <div className="flex gap-2">
                                        <Button
                                            onClick={checkForUpdates}
                                            variant="outline"
                                            className="flex-1"
                                            disabled={otaStatus !== "idle"}
                                        >
                                            {otaStatus === "checking" ? (
                                                <><Activity className="w-4 h-4 mr-2 animate-spin" />Checking...</>
                                            ) : (
                                                <><Download className="w-4 h-4 mr-2" />Check Updates</>
                                            )}
                                        </Button>
                                        <Button
                                            onClick={() => startOtaUpdate()}
                                            className="flex-1 bg-blue-600 hover:bg-blue-700"
                                            disabled={otaStatus !== "idle" || otaVersion === otaAvailableVersion}
                                        >
                                            <Upload className="w-4 h-4 mr-2" />
                                            Install Update
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Device Fleet OTA */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <Server className="w-5 h-5 text-purple-500" />
                                        Fleet Management
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {otaDevices.map(device => (
                                        <div key={device.id} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-2 h-2 rounded-full ${device.status === "online" ? "bg-emerald-500" : "bg-slate-500"}`} />
                                                <div>
                                                    <div className="text-sm font-medium">{device.name}</div>
                                                    <div className="text-[10px] text-muted-foreground">v{device.version}</div>
                                                </div>
                                            </div>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => startOtaUpdate(device.id)}
                                                disabled={device.status === "offline" || device.version === otaAvailableVersion || otaStatus !== "idle"}
                                            >
                                                {device.version === otaAvailableVersion ? "Up to date" : "Update"}
                                            </Button>
                                        </div>
                                    ))}
                                    
                                    <Button
                                        className="w-full mt-2"
                                        variant="outline"
                                        onClick={() => otaDevices.filter(d => d.status === "online" && d.version !== otaAvailableVersion).forEach(d => startOtaUpdate(d.id))}
                                        disabled={otaStatus !== "idle"}
                                    >
                                        <Upload className="w-4 h-4 mr-2" />
                                        Update All Online Devices
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    <TabsContent value="overview" className="h-full m-0 p-4">
                        <div className="grid grid-cols-3 gap-4 h-full">
                            {/* Project Settings */}
                            <div className="space-y-4">
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-lg">Project Configuration</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div>
                                            <Label>Project Name</Label>
                                            <Input
                                                value={projectName}
                                                onChange={(e) => setProjectName(e.target.value)}
                                                placeholder="Enter project name"
                                            />
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Quick Actions */}
                            <div className="space-y-4">
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-lg">Quick Actions</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-2">
                                        <Button
                                            className="w-full justify-start gap-2"
                                            variant="outline"
                                            onClick={() => setActiveView('circuit')}
                                        >
                                            <CircuitBoard className="w-4 h-4" />
                                            Design Circuit
                                        </Button>

                                        <Button
                                            className="w-full justify-start gap-2"
                                            variant="outline"
                                            onClick={() => setActiveView('firmware')}
                                        >
                                            <Microchip className="w-4 h-4" />
                                            Write Firmware
                                        </Button>

                                        <Button
                                            className="w-full justify-start gap-2"
                                            variant="outline"
                                            onClick={() => setActiveView('sensors')}
                                        >
                                            <Thermometer className="w-4 h-4" />
                                            Configure Sensors
                                        </Button>

                                        <Button
                                            className="w-full justify-start gap-2"
                                            variant="outline"
                                            onClick={() => setActiveView('testing')}
                                        >
                                            <TestTube className="w-4 h-4" />
                                            Run Tests
                                        </Button>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-lg">Connectivity</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        <div className="flex items-center gap-2">
                                            <Wifi className="w-4 h-4 text-blue-500" />
                                            <span className="text-sm">WiFi</span>
                                            <Badge variant="outline" className="ml-auto">Enabled</Badge>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <Bluetooth className="w-4 h-4 text-blue-600" />
                                            <span className="text-sm">Bluetooth</span>
                                            <Badge variant="outline" className="ml-auto">Enabled</Badge>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <Usb className="w-4 h-4 text-gray-600" />
                                            <span className="text-sm">USB</span>
                                            <Badge variant="outline" className="ml-auto">Connected</Badge>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
