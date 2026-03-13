/**
 * Extension Runtime Service
 *
 * Basic extension execution environment for Code Chamber.
 * Allows installed extensions to register commands, settings, and UI contributions.
 */

interface ExtensionCommand {
  id: string
  title: string
  category?: string
  icon?: string
  action: () => void | Promise<void>
}

interface ExtensionSetting {
  id: string
  title: string
  description?: string
  type: 'string' | 'number' | 'boolean' | 'array' | 'object'
  defaultValue?: any
  enum?: string[]
  minimum?: number
  maximum?: number
}

interface ExtensionContribution {
  commands?: ExtensionCommand[]
  settings?: ExtensionSetting[]
  keybindings?: any[]
  menus?: any[]
  views?: any[]
}

class ExtensionRuntime {
  private loadedExtensions = new Map<string, ExtensionContribution>()
  private commandPalette: ExtensionCommand[] = []

  /**
   * Load and activate an installed extension
   */
  async loadExtension(extensionId: string, manifest: any): Promise<void> {
    try {
      // For now, we'll simulate extension loading with basic contributions
      // In a real implementation, this would load the extension's main module
      const contributions: ExtensionContribution = {
        commands: [],
        settings: [],
      }

      // Add some example commands based on extension type
      if (extensionId.includes('prettier')) {
        contributions.commands = [
          {
            id: 'prettier.format',
            title: 'Format Document with Prettier',
            category: 'Formatting',
            action: () => {
              // Trigger Prettier formatting
              console.log('Running Prettier format...')
              // This would integrate with the editor's formatDocument action
            }
          }
        ]
        contributions.settings = [
          {
            id: 'prettier.configPath',
            title: 'Prettier Config Path',
            description: 'Path to Prettier configuration file',
            type: 'string',
            defaultValue: '.prettierrc'
          }
        ]
      } else if (extensionId.includes('eslint')) {
        contributions.commands = [
          {
            id: 'eslint.fix',
            title: 'Fix ESLint Problems',
            category: 'Linter',
            action: () => {
              console.log('Running ESLint fix...')
            }
          }
        ]
      } else if (extensionId.includes('python')) {
        contributions.commands = [
          {
            id: 'python.run',
            title: 'Run Python File',
            category: 'Python',
            action: () => {
              console.log('Running Python file...')
            }
          }
        ]
      }

      this.loadedExtensions.set(extensionId, contributions)

      // Register commands in command palette
      if (contributions.commands) {
        this.commandPalette.push(...contributions.commands)
      }

      console.log(`Extension ${extensionId} loaded successfully`)
    } catch (error) {
      console.error(`Failed to load extension ${extensionId}:`, error)
    }
  }

  /**
   * Unload an extension
   */
  unloadExtension(extensionId: string): void {
    const contributions = this.loadedExtensions.get(extensionId)
    if (contributions) {
      // Remove commands from palette
      if (contributions.commands) {
        this.commandPalette = this.commandPalette.filter(
          cmd => !contributions.commands!.some(extCmd => extCmd.id === cmd.id)
        )
      }
      this.loadedExtensions.delete(extensionId)
      console.log(`Extension ${extensionId} unloaded`)
    }
  }

  /**
   * Get all registered commands
   */
  getCommands(): ExtensionCommand[] {
    return [...this.commandPalette]
  }

  /**
   * Execute a command by ID
   */
  async executeCommand(commandId: string): Promise<void> {
    const command = this.commandPalette.find(cmd => cmd.id === commandId)
    if (command) {
      await command.action()
    } else {
      throw new Error(`Command ${commandId} not found`)
    }
  }

  /**
   * Get settings contributions from all loaded extensions
   */
  getSettingsContributions(): ExtensionSetting[] {
    const allSettings: ExtensionSetting[] = []
    for (const contributions of this.loadedExtensions.values()) {
      if (contributions.settings) {
        allSettings.push(...contributions.settings)
      }
    }
    return allSettings
  }

  /**
   * Get loaded extensions
   */
  getLoadedExtensions(): string[] {
    return Array.from(this.loadedExtensions.keys())
  }
}

// Singleton instance
export const extensionRuntime = new ExtensionRuntime()