"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, AreaChart, Area } from 'recharts';
import { TrendingUp } from "lucide-react";

export default function TrainingDashboard({ isTraining }: { isTraining?: boolean }) {
    const [lossData, setLossData] = useState<any[]>([]);
    const [accuracyData, setAccuracyData] = useState<any[]>([]);
    const [epoch, setEpoch] = useState(0);
    const [currentLoss, setCurrentLoss] = useState(2.5);
    const [currentAccuracy, setCurrentAccuracy] = useState(0.1);
    const [gpuUtil, setGpuUtil] = useState(0);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    // Simulate live training data when isTraining
    useEffect(() => {
        if (!isTraining) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            return;
        }
        // Reset on new training
        setLossData([]);
        setAccuracyData([]);
        setEpoch(0);
        setCurrentLoss(2.5);
        setCurrentAccuracy(0.1);
        setGpuUtil(85 + Math.random() * 10);

        intervalRef.current = setInterval(() => {
            setEpoch(prev => {
                const next = prev + 1;
                if (next > 100) {
                    if (intervalRef.current) clearInterval(intervalRef.current);
                    return prev;
                }
                const trainLoss = Math.max(0.02, 2.5 * Math.exp(-0.04 * next) + (Math.random() - 0.5) * 0.05);
                const valLoss = Math.max(0.04, 2.5 * Math.exp(-0.035 * next) + (Math.random() - 0.5) * 0.08);
                const accuracy = Math.min(0.99, 0.1 + 0.89 * (1 - Math.exp(-0.05 * next)) + (Math.random() - 0.5) * 0.02);
                setCurrentLoss(trainLoss);
                setCurrentAccuracy(accuracy);
                setGpuUtil(85 + Math.random() * 12);
                setLossData(prev => [...prev, { epoch: next, trainLoss: +trainLoss.toFixed(4), valLoss: +valLoss.toFixed(4) }]);
                setAccuracyData(prev => [...prev, { epoch: next, accuracy: +(accuracy * 100).toFixed(1) }]);
                return next;
            });
        }, 800);

        return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }, [isTraining]);
    if (!isTraining) {
        return (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-4">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                    <TrendingUp className="w-8 h-8 text-muted-foreground" />
                </div>
                <div>
                    <h3 className="text-lg font-semibold">No Active Training</h3>
                    <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                        Start a training session in the AI Studio to see real-time metrics and loss curves.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto p-4 space-y-4 bg-background">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Current Epoch</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{epoch}/100</div>
                        <p className="text-xs text-muted-foreground">ETA: {Math.max(0, Math.round((100 - epoch) * 0.8 / 60))}m {Math.round((100 - epoch) * 0.8 % 60)}s</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Training Loss</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-500">{currentLoss.toFixed(4)}</div>
                        <p className="text-xs text-muted-foreground">↓ converging</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">GPU Utilization</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-purple-500">{gpuUtil.toFixed(0)}%</div>
                        <p className="text-xs text-muted-foreground">NVIDIA A100-80GB</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[300px]">
                <Card className="h-full">
                    <CardHeader>
                        <CardTitle className="text-sm">Loss Curves</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[220px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={lossData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                <XAxis dataKey="epoch" stroke="#888" />
                                <YAxis stroke="#888" />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                                />
                                <Legend />
                                <Line type="monotone" dataKey="trainLoss" stroke="#10b981" strokeWidth={2} dot={false} name="Train Loss" />
                                <Line type="monotone" dataKey="valLoss" stroke="#f59e0b" strokeWidth={2} dot={false} name="Val Loss" />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card className="h-full">
                    <CardHeader>
                        <CardTitle className="text-sm">Accuracy</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[220px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={accuracyData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                <XAxis dataKey="epoch" stroke="#888" />
                                <YAxis stroke="#888" />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                                />
                                <Area type="monotone" dataKey="accuracy" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.2} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
