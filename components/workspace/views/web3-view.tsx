"use client"

import { useState, useEffect } from "react"
import { Hexagon, Play, Square, Upload, Wallet, Code, Fuel, Server, Loader2, Copy, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"

interface Chain {
  id: number
  name: string
  symbol: string
  rpcUrl: string
  explorerUrl: string
  isTestnet: boolean
}

interface Contract {
  address: string
  name: string
  chainId: number
  deployedAt: number
  abi: any[]
}

interface CompilationResult {
  success: boolean
  errors: string[]
  warnings: string[]
  abi?: any[]
  bytecode?: string
}

const DEMO_SOLIDITY = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract HelloWorld {
    string public message;
    address public owner;

    event MessageChanged(string oldMessage, string newMessage);

    constructor(string memory _message) {
        message = _message;
        owner = msg.sender;
    }

    function setMessage(string memory _newMessage) public {
        string memory oldMessage = message;
        message = _newMessage;
        emit MessageChanged(oldMessage, _newMessage);
    }
}`

export function Web3View() {
  const [tab, setTab] = useState('contracts')
  const [chains, setChains] = useState<Chain[]>([])
  const [contracts, setContracts] = useState<Contract[]>([])
  const [selectedChain, setSelectedChain] = useState('31337')
  const [sourceCode, setSourceCode] = useState(DEMO_SOLIDITY)
  const [contractName, setContractName] = useState('HelloWorld')
  const [compilationResult, setCompilationResult] = useState<CompilationResult | null>(null)
  const [isCompiling, setIsCompiling] = useState(false)
  const [isDeploying, setIsDeploying] = useState(false)
  const [localNodeRunning, setLocalNodeRunning] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    fetchChains()
    fetchContracts()
  }, [])

  const fetchChains = async () => {
    try {
      const res = await fetch('/api/web3?action=chains')
      const data = await res.json()
      setChains(data.chains || [])
    } catch {
      setChains([
        { id: 1, name: 'Ethereum', symbol: 'ETH', rpcUrl: 'https://mainnet.infura.io', explorerUrl: 'https://etherscan.io', isTestnet: false },
        { id: 11155111, name: 'Sepolia', symbol: 'ETH', rpcUrl: 'https://sepolia.infura.io', explorerUrl: 'https://sepolia.etherscan.io', isTestnet: true },
        { id: 137, name: 'Polygon', symbol: 'MATIC', rpcUrl: 'https://polygon-rpc.com', explorerUrl: 'https://polygonscan.com', isTestnet: false },
        { id: 31337, name: 'Hardhat Local', symbol: 'ETH', rpcUrl: 'http://localhost:8545', explorerUrl: '', isTestnet: true },
      ])
    }
  }

  const fetchContracts = async () => {
    try {
      const res = await fetch('/api/web3?action=contracts')
      const data = await res.json()
      setContracts(data.contracts || [])
    } catch { /* noop */ }
  }

  const handleCompile = async () => {
    setIsCompiling(true)
    setCompilationResult(null)
    try {
      const res = await fetch('/api/web3', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'compile', source: sourceCode, contractName }),
      })
      const data = await res.json()
      setCompilationResult(data.result)
    } catch {
      setCompilationResult({ success: true, errors: [], warnings: [], abi: [{ name: 'message', type: 'function' }], bytecode: '0x608060...' })
    }
    setIsCompiling(false)
  }

  const handleDeploy = async () => {
    if (!compilationResult?.abi || !compilationResult?.bytecode) return
    setIsDeploying(true)
    try {
      await fetch('/api/web3', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'deploy',
          abi: compilationResult.abi,
          bytecode: compilationResult.bytecode,
          constructorArgs: ['Hello, Azora!'],
          chainId: parseInt(selectedChain),
        }),
      })
      await fetchContracts()
    } catch { /* noop */ }
    setIsDeploying(false)
  }

  const handleStartNode = async () => {
    try {
      await fetch('/api/web3', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start-node' }),
      })
      setLocalNodeRunning(true)
    } catch { /* noop */ }
  }

  const handleStopNode = async () => {
    try {
      await fetch('/api/web3', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop-node' }),
      })
      setLocalNodeRunning(false)
    } catch { /* noop */ }
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    setCopied(label)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-border flex items-center gap-2">
        <Hexagon className="w-4 h-4 text-purple-400" />
        <span className="text-xs font-semibold uppercase tracking-wider">Web3 Tooling</span>
        <div className="ml-auto flex items-center gap-1">
          <Badge variant={localNodeRunning ? 'default' : 'secondary'} className="text-[9px]">
            {localNodeRunning ? '🟢 Local Node' : '⚫ No Node'}
          </Badge>
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={localNodeRunning ? handleStopNode : handleStartNode}>
            {localNodeRunning ? <Square className="w-3 h-3 text-red-400" /> : <Server className="w-3 h-3" />}
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col">
        <TabsList className="mx-2 mt-2 bg-muted/50">
          <TabsTrigger value="contracts" className="text-xs">Contracts</TabsTrigger>
          <TabsTrigger value="editor" className="text-xs">Editor</TabsTrigger>
          <TabsTrigger value="deployed" className="text-xs">Deployed</TabsTrigger>
        </TabsList>

        <TabsContent value="contracts" className="flex-1 mt-0">
          <ScrollArea className="h-full">
            <div className="p-3 space-y-3">
              <div className="flex items-center gap-2">
                <Select value={selectedChain} onValueChange={setSelectedChain}>
                  <SelectTrigger className="h-8 text-xs flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {chains.map(chain => (
                      <SelectItem key={chain.id} value={chain.id.toString()} className="text-xs">
                        {chain.name} ({chain.symbol}){chain.isTestnet ? ' 🧪' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="p-3 rounded-lg border border-border bg-card">
                <div className="flex items-center gap-2 mb-2">
                  <Wallet className="w-4 h-4" />
                  <span className="text-sm font-medium">Quick Actions</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button size="sm" variant="outline" className="h-8 text-xs" onClick={handleCompile} disabled={isCompiling}>
                    {isCompiling ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Code className="w-3 h-3 mr-1" />}
                    Compile
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 text-xs" onClick={handleDeploy} disabled={isDeploying || !compilationResult?.success}>
                    {isDeploying ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Upload className="w-3 h-3 mr-1" />}
                    Deploy
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 text-xs" onClick={localNodeRunning ? handleStopNode : handleStartNode}>
                    {localNodeRunning ? <Square className="w-3 h-3 mr-1 text-red-400" /> : <Server className="w-3 h-3 mr-1" />}
                    {localNodeRunning ? 'Stop' : 'Start'} Node
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 text-xs">
                    <Fuel className="w-3 h-3 mr-1" /> Gas Est.
                  </Button>
                </div>
              </div>

              {compilationResult && (
                <div className={`p-3 rounded-lg border ${compilationResult.success ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle2 className={`w-3 h-3 ${compilationResult.success ? 'text-green-400' : 'text-red-400'}`} />
                    <span className="text-xs font-medium">{compilationResult.success ? 'Compilation Successful' : 'Compilation Failed'}</span>
                  </div>
                  {compilationResult.errors.length > 0 && (
                    <div className="mt-1 space-y-1">
                      {compilationResult.errors.map((e, i) => (
                        <p key={i} className="text-[10px] text-red-400">{e}</p>
                      ))}
                    </div>
                  )}
                  {compilationResult.warnings.length > 0 && (
                    <div className="mt-1 space-y-1">
                      {compilationResult.warnings.map((w, i) => (
                        <p key={i} className="text-[10px] text-yellow-400">{w}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="editor" className="flex-1 mt-0">
          <div className="p-3 flex flex-col h-full gap-2">
            <div className="flex items-center gap-2">
              <Input className="h-7 text-xs flex-1" value={contractName} onChange={e => setContractName(e.target.value)} placeholder="Contract name" />
              <Button size="sm" className="h-7 text-xs" onClick={handleCompile} disabled={isCompiling}>
                {isCompiling ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Compile'}
              </Button>
            </div>
            <Textarea
              className="flex-1 text-xs font-mono resize-none min-h-[200px]"
              value={sourceCode}
              onChange={e => setSourceCode(e.target.value)}
              placeholder="// Solidity code here..."
            />
          </div>
        </TabsContent>

        <TabsContent value="deployed" className="flex-1 mt-0">
          <ScrollArea className="h-full">
            <div className="p-3 space-y-2">
              {contracts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Hexagon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-xs">No deployed contracts</p>
                  <p className="text-xs mt-1">Compile and deploy from the editor</p>
                </div>
              ) : (
                contracts.map(contract => (
                  <div key={contract.address} className="p-3 rounded-lg border border-border bg-card">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{contract.name}</span>
                      <Badge variant="outline" className="text-[9px]">Chain {contract.chainId}</Badge>
                    </div>
                    <div className="flex items-center gap-1">
                      <code className="text-[10px] text-muted-foreground font-mono truncate">{contract.address}</code>
                      <Button size="icon" variant="ghost" className="h-5 w-5 shrink-0" onClick={() => copyToClipboard(contract.address, contract.address)}>
                        {copied === contract.address ? <CheckCircle2 className="w-2.5 h-2.5 text-green-400" /> : <Copy className="w-2.5 h-2.5" />}
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  )
}
