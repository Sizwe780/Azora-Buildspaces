"use client"

import { useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { Palette } from "lucide-react"

export default function InfiniteCanvas() {
    const defaultLabels = useMemo(() => ({
        title: "Infinite Design Canvas",
        subtitle: "Professional design workspace with infinite canvas",
        description: "Drag and drop components, connect flows, create stunning designs"
    }), []);

    return (
        <div 
            className="h-full flex items-center justify-center bg-muted/20"
            role="region"
            aria-label="Design Canvas Area"
            tabIndex={0}
        >
            <div className="text-center text-muted-foreground p-4">
                <Palette aria-hidden="true" className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">{defaultLabels.title}</h3>
                <p className="text-sm">{defaultLabels.subtitle}</p>
                <p className="text-xs mt-1">{defaultLabels.description}</p>
            </div>
        </div>
    )
}
