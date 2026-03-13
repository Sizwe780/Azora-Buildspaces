

// System 2 Thinking: Ethical Reasoning
export interface ConstitutionalVerdict {
    approved: boolean
    reasoning: string
    vetoId?: string
    modifications?: string
}

export const Constitution = {
    principles: [
        "Do not generate harmful or malicious code.",
        "Respect user privacy and data security.",
        "Ensure code quality and maintainability.",
        "Prioritize user intent but verify safety."
    ]
}

export class ConstitutionalCore {
    private static instance: ConstitutionalCore

    private constructor() { }

    public static getInstance(): ConstitutionalCore {
        if (!ConstitutionalCore.instance) {
            ConstitutionalCore.instance = new ConstitutionalCore()
        }
        return ConstitutionalCore.instance
    }

    private buildVetoId(action: string): string {
        let hash = 0
        for (let index = 0; index < action.length; index += 1) {
            hash = (hash * 31 + action.charCodeAt(index)) >>> 0
        }
        return `VETO-${hash.toString(16).toUpperCase()}`
    }

    public async evaluateAction(action: string, context: string): Promise<ConstitutionalVerdict> {
        const normalizedAction = action.toLowerCase()
        const normalizedContext = context.toLowerCase()

        const destructivePatterns = ["delete database", "drop table", "truncate", "rm -rf", "format disk"]
        const secretExfiltrationPatterns = ["export secrets", "dump tokens", "read env", "exfiltrate"]
        const insecureExecutionPatterns = ["disable auth", "bypass authentication", "disable tls", "ignore ssl"]

        const isDestructive = destructivePatterns.some(pattern => normalizedAction.includes(pattern))
        const isSecretExfiltration = secretExfiltrationPatterns.some(pattern => normalizedAction.includes(pattern))
        const isInsecureExecution = insecureExecutionPatterns.some(pattern => normalizedAction.includes(pattern) || normalizedContext.includes(pattern))

        if (isDestructive) {
            return {
                approved: false,
                reasoning: "Action violates safety principle: destructive operation detected.",
                vetoId: this.buildVetoId(action),
                modifications: "Use a scoped, reversible migration or explicit backup-and-restore workflow."
            }
        }

        if (isSecretExfiltration) {
            return {
                approved: false,
                reasoning: "Action violates privacy principle: potential secret exfiltration detected.",
                vetoId: this.buildVetoId(action),
                modifications: "Use redacted diagnostics and least-privilege secret access patterns."
            }
        }

        if (isInsecureExecution) {
            return {
                approved: false,
                reasoning: "Action violates security principle: insecure runtime configuration requested.",
                vetoId: this.buildVetoId(action),
                modifications: "Keep authentication and transport security enabled; use explicit test-only flags in isolated environments."
            }
        }

        return {
            approved: true,
            reasoning: "Action aligns with Azora Constitution based on deterministic policy checks."
        }
    }
}
