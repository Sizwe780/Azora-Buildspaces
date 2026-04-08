const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'components', 'rooms', 'ai-studio', 'AgentWorkflowEditor.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Add new imports for auto-save state
if (!content.includes('Clock, Check')) {
    content = content.replace(
        'import { Play, Plus, Trash2, Save, Send, Sparkles, Loader2 } from "lucide-react";',
        'import { Play, Plus, Trash2, Save, Send, Sparkles, Loader2, Clock, Check } from "lucide-react";'
    );
}

// Add state variables and ref for debouncing
if (!content.includes('const [isSaving, setIsSaving] = useState(false);')) {
    content = content.replace(
        '    const [isLoading, setIsLoading] = useState(false);',
        '    const [isLoading, setIsLoading] = useState(false);\n    const [isSaving, setIsSaving] = useState(false);\n    const [lastSaved, setLastSaved] = useState<Date | null>(null);\n    const [isInitialLoad, setIsInitialLoad] = useState(true);'
    );
}

// Replace loadWorkflow inside useEffect to include local storage fallback
if (!content.includes('localStorage.getItem(\'azora_workflow_backup\')')) {
const loadReplacement = `        const loadWorkflow = async () => {
            setIsLoading(true);
            try {
                const resp = await fetch('/api/agents/workflows/current');      
                if (resp.ok) {
                    const data = await resp.json();
                    if (data.steps && data.steps.length > 0) {
                        setSteps(data.steps);
                        setLastSaved(new Date());
                        setIsInitialLoad(false);
                        return;
                    }
                }
                throw new Error("API load failed or returned empty");
            } catch (error) {
                console.warn('API workflow load failed, trying local fallback...');
                // Fallback to localStorage
                try {
                    const localData = localStorage.getItem('azora_workflow_backup');
                    if (localData) {
                        setSteps(JSON.parse(localData));
                    }
                } catch (e) {}
            } finally {
                setIsLoading(false);
                setTimeout(() => setIsInitialLoad(false), 500); // Give time for state to settle
            }
        };`;

    content = content.replace(
        /        const loadWorkflow = async \(\) => \{[\s\S]*?        \};/,
        loadReplacement
    );
}

// Replace saveWorkflow with auto-save aware version
if (!content.includes('// Auto-save effect')) {
const saveReplacement = `    const saveWorkflow = async () => {
        setIsSaving(true);
        try {
            // Local fallback save first
            localStorage.setItem('azora_workflow_backup', JSON.stringify(steps));
            
            const resp = await fetch('/api/agents/workflows', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ steps })
            });
            if (resp.ok) {
                setLastSaved(new Date());
            }
        } catch (error) {
            console.error('Failed to save workflow:', error);
        } finally {
            setIsSaving(false);
        }
    };

    // Auto-save effect
    useEffect(() => {
        if (isInitialLoad || steps.length === 0) return;
        
        const timeoutId = setTimeout(() => {
            saveWorkflow();
        }, 1500);
        
        return () => clearTimeout(timeoutId);
    }, [steps, isInitialLoad]);`;

    content = content.replace(
        /    const saveWorkflow = async \(\) => \{[\s\S]*?    \};\n/,
        saveReplacement + '\n'
    );
}

// Replace UI header to show save status instead of save button
if (!content.includes('Auto-save Indicator')) {
const headerReplacement = `                <div className="flex flex-1 items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-500" />
                    <span className="font-semibold px-2">Agent Workflow Designer</span>
                    
                    {/* Auto-save Indicator */}
                    <div className="ml-4 flex items-center px-2 py-1 rounded-md bg-zinc-900/50 text-[10px] text-zinc-400 border border-zinc-800">
                        {isSaving ? (
                            <><Loader2 className="w-3 h-3 mr-1.5 animate-spin" /> Saving...</>
                        ) : lastSaved ? (
                            <><Check className="w-3 h-3 mr-1.5 text-emerald-500" /> Saved {lastSaved.toLocaleTimeString()}</>
                        ) : (
                            <><Clock className="w-3 h-3 mr-1.5" /> Not saved</>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={addStep} className="gap-2">
                        <Plus className="w-4 h-4" />
                        Add Step
                    </Button>
                </div>`;

    content = content.replace(
        /<div className="flex items-center gap-2">\s*<Sparkles className="w-4 h-4 text-purple-500" \/>\s*<span className="font-semibold px-2">Agent Workflow Designer<\/span>\s*<\/div>\s*<div className="flex items-center gap-2">\s*<Button size="sm" variant="outline" onClick=\{addStep\} className="gap-2">\s*<Plus className="w-4 h-4" \/>\s*Add Step\s*<\/Button>\s*<Button[\s\S]*?<\/Button>\s*<\/div>/,
        headerReplacement
    );
}

fs.writeFileSync(filePath, content);
console.log('Successfully updated workflow editor');
