"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  ArrowLeft,
  ArrowRight,
  Rocket,
  Sparkles,
  Globe,
  Server,
  Zap,
  ChevronRight,
} from "lucide-react"
import { EnvironmentTemplateSelector } from "./environment-template-selector"
import type { EnvironmentTemplate } from "@/types/execution-environments"

interface NewWorkspaceWizardProps {
  onComplete: (config: {
    projectName: string
    template: EnvironmentTemplate
    repoUrl?: string
  }) => void
  onCancel: () => void
}

type WizardStep = "name" | "environment" | "review"

export function NewWorkspaceWizard({ onComplete, onCancel }: NewWorkspaceWizardProps) {
  const [step, setStep] = useState<WizardStep>("name")
  const [projectName, setProjectName] = useState("")
  const [repoUrl, setRepoUrl] = useState("")
  const [selectedTemplate, setSelectedTemplate] = useState<EnvironmentTemplate | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  const canProceed = () => {
    switch (step) {
      case "name":
        return projectName.trim().length > 0
      case "environment":
        return selectedTemplate !== null
      case "review":
        return true
    }
  }

  const handleNext = () => {
    if (step === "name") setStep("environment")
    else if (step === "environment") setStep("review")
    else if (step === "review") handleCreate()
  }

  const handleBack = () => {
    if (step === "environment") setStep("name")
    else if (step === "review") setStep("environment")
  }

  const handleCreate = async () => {
    if (!selectedTemplate) return
    setIsCreating(true)
    
    // Simulate creation delay
    await new Promise((resolve) => setTimeout(resolve, 1500))
    
    onComplete({
      projectName: projectName.trim(),
      template: selectedTemplate,
      repoUrl: repoUrl.trim() || undefined,
    })
  }

  const steps: { key: WizardStep; label: string; number: number }[] = [
    { key: "name", label: "Project", number: 1 },
    { key: "environment", label: "Environment", number: 2 },
    { key: "review", label: "Launch", number: 3 },
  ]

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Progress Bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <button
          onClick={onCancel}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Cancel
        </button>

        <div className="flex items-center gap-2">
          {steps.map((s, i) => (
            <div key={s.key} className="flex items-center gap-2">
              <div
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs transition-colors ${
                  step === s.key
                    ? "bg-primary text-primary-foreground"
                    : steps.findIndex((x) => x.key === step) > i
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <span className="w-4 h-4 rounded-full border flex items-center justify-center text-[10px]">
                  {s.number}
                </span>
                <span>{s.label}</span>
              </div>
              {i < steps.length - 1 && <ChevronRight className="w-3 h-3 text-muted-foreground" />}
            </div>
          ))}
        </div>

        <div className="w-16" /> {/* Spacer */}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {step === "name" && (
            <motion.div
              key="name"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="max-w-lg mx-auto py-12 px-6"
            >
              <div className="text-center mb-8">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-emerald-400 flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-lg font-semibold text-foreground">Create a New Workspace</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Name your project and optionally link a repository
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5">
                    Project Name
                  </label>
                  <input
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="my-awesome-project"
                    className="w-full px-4 py-2.5 text-sm bg-muted/30 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5">
                    Repository URL <span className="text-muted-foreground">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    placeholder="https://github.com/user/repo"
                    className="w-full px-4 py-2.5 text-sm bg-muted/30 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground"
                  />
                </div>
              </div>
            </motion.div>
          )}

          {step === "environment" && (
            <motion.div
              key="environment"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="max-w-3xl mx-auto py-8 px-6"
            >
              <EnvironmentTemplateSelector
                onSelect={setSelectedTemplate}
                selectedTemplateId={selectedTemplate?.id}
              />
            </motion.div>
          )}

          {step === "review" && selectedTemplate && (
            <motion.div
              key="review"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="max-w-lg mx-auto py-12 px-6"
            >
              <div className="text-center mb-8">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-emerald-400 flex items-center justify-center mx-auto mb-4">
                  <Rocket className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-lg font-semibold text-foreground">Ready to Launch</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Review your workspace configuration
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between px-4 py-3 bg-muted/30 rounded-lg border border-border">
                  <span className="text-xs text-muted-foreground">Project</span>
                  <span className="text-sm font-medium text-foreground">{projectName}</span>
                </div>

                {repoUrl && (
                  <div className="flex items-center justify-between px-4 py-3 bg-muted/30 rounded-lg border border-border">
                    <span className="text-xs text-muted-foreground">Repository</span>
                    <span className="text-xs text-foreground truncate max-w-[250px]">{repoUrl}</span>
                  </div>
                )}

                <div className="flex items-center justify-between px-4 py-3 bg-muted/30 rounded-lg border border-border">
                  <span className="text-xs text-muted-foreground">Environment</span>
                  <div className="flex items-center gap-2">
                    <span className="text-base">{selectedTemplate.icon}</span>
                    <span className="text-sm font-medium text-foreground">{selectedTemplate.name}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between px-4 py-3 bg-muted/30 rounded-lg border border-border">
                  <span className="text-xs text-muted-foreground">Resources</span>
                  <span className="text-xs text-foreground">
                    {selectedTemplate.resources.cpu} CPU &middot;{" "}
                    {selectedTemplate.resources.memory >= 1024
                      ? `${(selectedTemplate.resources.memory / 1024).toFixed(0)} GB`
                      : `${selectedTemplate.resources.memory} MB`}{" "}
                    RAM &middot; {selectedTemplate.resources.storage} GB disk
                  </span>
                </div>

                <div className="flex items-center justify-between px-4 py-3 bg-muted/30 rounded-lg border border-border">
                  <span className="text-xs text-muted-foreground">Type</span>
                  <span className="text-xs text-foreground capitalize">{selectedTemplate.type}</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-6 py-4 border-t border-border">
        <button
          onClick={handleBack}
          disabled={step === "name"}
          className="flex items-center gap-1.5 px-4 py-2 text-xs rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back
        </button>

        <button
          onClick={handleNext}
          disabled={!canProceed() || isCreating}
          className="flex items-center gap-1.5 px-4 py-2 text-xs rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isCreating ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              Creating...
            </>
          ) : step === "review" ? (
            <>
              <Rocket className="w-3.5 h-3.5" />
              Launch Workspace
            </>
          ) : (
            <>
              Next
              <ArrowRight className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </div>
    </div>
  )
}
