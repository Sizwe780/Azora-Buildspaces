const fs = require('fs');
const path = './components/workspace/copilot-chat-panel.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace("import { useState, useRef, useEffect, useCallback, useMemo } from 'react'", 
"import { useState, useRef, useEffect, useCallback, useMemo } from 'react'\nimport { useChat } from '@ai-sdk/react'");

// Replace the handleSend logic to use useChat's append
let handleSendMatch = content.match(/const handleSend = async \(\) => \{[\s\S]*?finally \{\s*setIsStreaming\(false\)\s*setTypingAgent\(null\)\s*\}\s*\}/);

// We should replace handleSend function. 
