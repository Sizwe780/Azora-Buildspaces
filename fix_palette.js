const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'components', 'workspace', 'layout', 'command-palette.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Add missing imports 
if (!content.includes('import { Pin, Clock }')) {
    content = content.replace(
        'import { useState, useMemo } from "react"',
        'import { useState, useMemo, useEffect } from "react"\nimport { Pin, Clock } from "lucide-react"'
    );
}

// Add recent commands state
if (!content.includes('const [recentIds')) {
    content = content.replace(
        '    const [value, setValue] = useState("")',
        '    const [value, setValue] = useState("")\n    const [recentIds, setRecentIds] = useState<string[]>([])\n\n    useEffect(() => {\n        try {\n            const saved = localStorage.getItem("buildspaces.recent_commands")\n            if (saved) setRecentIds(JSON.parse(saved))\n        } catch {}\n    }, [])\n'
    );
}

// Modify handleSelect to save recent commands
if (!content.includes('setRecentIds(prev =>')) {
    const handleSelectReplacement = `    const handleSelect = (cmd: CommandEntry) => {
        // Save to recent commands
        if (!cmd.id.startsWith('goto-') && !cmd.id.startsWith('semantic-')) {
            setRecentIds(prev => {
                const nextId = (cmd as any).originalId || cmd.id
                const next = [nextId, ...prev.filter(id => id !== nextId)].slice(0, 5)
                try { localStorage.setItem("buildspaces.recent_commands", JSON.stringify(next)) } catch {}
                return next
            })
        }
        cmd.action()
        onOpenChange(false)
        setValue("")
    }`;
    content = content.replace(
        /    const handleSelect = \(cmd: CommandEntry\) => \{\n\s+cmd\.action\(\)\n\s+onOpenChange\(false\)\n\s+setValue\(""\)\n\s+\}/,
        handleSelectReplacement
    );
}

// Modify the rendering logic to include Recent group
if (!content.includes('prefix: "recent."')) {
    const renderLogicReplacement = `    const groups = [
        { heading: "Recently Used", prefix: "recent." },
        { heading: "Files", prefix: "file." },
        { heading: "Views", prefix: "view." },
        { heading: "Panel", prefix: "panel." },
        { heading: "Layout", prefix: "layout." },
        { heading: "Editor", prefix: "editor." },
        { heading: "Rooms", prefix: "room." },
        { heading: "Agent Commands", prefix: "agent." },
        { heading: "Git", prefix: "git." },
        { heading: "Run & Debug", prefix: "dev." },
    ]

    const displayCommands = useMemo(() => {
        if (!value.trim()) {
            const recentCommands = recentIds
                .map(id => commands.find(c => c.id === id))
                .filter(Boolean) as CommandEntry[]
            
            const recentMapped = recentCommands.map(cmd => ({
                ...cmd,
                id: \`recent.\${cmd.id}\`,
                originalId: cmd.id
            }))
            
            return [...recentMapped, ...commands]
        }
        return filteredCommands
    }, [value, filteredCommands, recentIds, commands])`;

    content = content.replace(
        /    const groups = \[\s+\{ heading: "Files", prefix: "file\." \},[\s\S]*?\]/,
        renderLogicReplacement
    );

    // Replace filteredCommands usage with displayCommands in rendering
    content = content.replace(
        /const items = filteredCommands\.filter\(cmd => cmd\.id\.startsWith\(group\.prefix\)\)/,
        'const items = displayCommands.filter(cmd => cmd.id.startsWith(group.prefix))'
    );
}

fs.writeFileSync(filePath, content);
console.log('Successfully updated command palette');
