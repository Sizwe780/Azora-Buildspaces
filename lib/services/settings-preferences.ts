// Task 24: Settings & Preferences Service
// Full VS Code-style settings UI (JSON + GUI), keybinding editor, profile sync

export interface SettingDefinition {
  id: string
  title: string
  description: string
  category: string
  type: 'string' | 'number' | 'boolean' | 'enum' | 'array' | 'object' | 'color'
  default: any
  enum?: string[]
  enumDescriptions?: string[]
  minimum?: number
  maximum?: number
  scope: 'user' | 'workspace' | 'language'
  tags?: string[]
}

export interface KeyBinding {
  id: string
  command: string
  key: string
  when?: string
  source: 'default' | 'user' | 'extension'
}

export interface UserSettings {
  [key: string]: any
}

export interface SettingsSearchResult {
  setting: SettingDefinition
  matchType: 'title' | 'description' | 'id' | 'category'
  relevance: number
}

class SettingsPreferencesService {
  private definitions: SettingDefinition[] = [
    // Editor
    { id: 'editor.fontSize', title: 'Font Size', description: 'Controls the font size in pixels.', category: 'Editor', type: 'number', default: 14, minimum: 8, maximum: 72, scope: 'user', tags: ['font'] },
    { id: 'editor.fontFamily', title: 'Font Family', description: 'Controls the font family.', category: 'Editor', type: 'string', default: "'Fira Code', 'Cascadia Code', Menlo, Monaco, monospace", scope: 'user', tags: ['font'] },
    { id: 'editor.fontLigatures', title: 'Font Ligatures', description: 'Configures font ligatures or font features.', category: 'Editor', type: 'boolean', default: true, scope: 'user', tags: ['font'] },
    { id: 'editor.tabSize', title: 'Tab Size', description: 'The number of spaces a tab is equal to.', category: 'Editor', type: 'number', default: 2, minimum: 1, maximum: 8, scope: 'user' },
    { id: 'editor.insertSpaces', title: 'Insert Spaces', description: 'Insert spaces when pressing Tab.', category: 'Editor', type: 'boolean', default: true, scope: 'user' },
    { id: 'editor.wordWrap', title: 'Word Wrap', description: 'Controls how lines should wrap.', category: 'Editor', type: 'enum', default: 'off', enum: ['off', 'on', 'wordWrapColumn', 'bounded'], enumDescriptions: ['Lines will never wrap.', 'Lines will wrap at the viewport width.', 'Lines will wrap at word wrap column.', 'Lines will wrap at the minimum of viewport and word wrap column.'], scope: 'user' },
    { id: 'editor.minimap.enabled', title: 'Minimap Enabled', description: 'Controls whether the minimap is shown.', category: 'Editor', type: 'boolean', default: true, scope: 'user', tags: ['minimap'] },
    { id: 'editor.minimap.renderCharacters', title: 'Minimap Render Characters', description: 'Render the actual characters on a line in the minimap.', category: 'Editor', type: 'boolean', default: false, scope: 'user', tags: ['minimap'] },
    { id: 'editor.cursorBlinking', title: 'Cursor Blinking', description: 'Control the cursor animation style.', category: 'Editor', type: 'enum', default: 'blink', enum: ['blink', 'smooth', 'phase', 'expand', 'solid'], scope: 'user' },
    { id: 'editor.cursorStyle', title: 'Cursor Style', description: 'Controls the cursor style.', category: 'Editor', type: 'enum', default: 'line', enum: ['line', 'block', 'underline', 'line-thin', 'block-outline', 'underline-thin'], scope: 'user' },
    { id: 'editor.lineNumbers', title: 'Line Numbers', description: 'Controls the display of line numbers.', category: 'Editor', type: 'enum', default: 'on', enum: ['off', 'on', 'relative', 'interval'], scope: 'user' },
    { id: 'editor.renderWhitespace', title: 'Render Whitespace', description: 'Controls how the editor should render whitespace characters.', category: 'Editor', type: 'enum', default: 'selection', enum: ['none', 'boundary', 'selection', 'trailing', 'all'], scope: 'user' },
    { id: 'editor.bracketPairColorization', title: 'Bracket Pair Colorization', description: 'Controls whether bracket pair colorization is enabled.', category: 'Editor', type: 'boolean', default: true, scope: 'user' },
    { id: 'editor.guides.indentation', title: 'Indentation Guides', description: 'Controls whether the editor should render indent guides.', category: 'Editor', type: 'boolean', default: true, scope: 'user' },
    { id: 'editor.smoothScrolling', title: 'Smooth Scrolling', description: 'Controls whether the editor will scroll using an animation.', category: 'Editor', type: 'boolean', default: true, scope: 'user' },
    { id: 'editor.stickyScroll.enabled', title: 'Sticky Scroll', description: 'Shows the nested current scopes during the scroll at the top.', category: 'Editor', type: 'boolean', default: true, scope: 'user' },
    { id: 'editor.autoClosingBrackets', title: 'Auto Closing Brackets', description: 'Controls whether the editor should auto close brackets.', category: 'Editor', type: 'enum', default: 'languageDefined', enum: ['always', 'languageDefined', 'beforeWhitespace', 'never'], scope: 'user' },
    { id: 'editor.formatOnSave', title: 'Format On Save', description: 'Format a file on save.', category: 'Editor', type: 'boolean', default: true, scope: 'user' },
    { id: 'editor.formatOnPaste', title: 'Format On Paste', description: 'Format content when pasting.', category: 'Editor', type: 'boolean', default: false, scope: 'user' },
    { id: 'editor.codeActionsOnSave', title: 'Code Actions On Save', description: 'Code actions to be run on save.', category: 'Editor', type: 'object', default: {}, scope: 'user' },

    // Terminal
    { id: 'terminal.fontSize', title: 'Terminal Font Size', description: 'Controls the font size of the terminal.', category: 'Terminal', type: 'number', default: 13, minimum: 6, maximum: 40, scope: 'user', tags: ['font'] },
    { id: 'terminal.fontFamily', title: 'Terminal Font Family', description: 'Controls the terminal font family.', category: 'Terminal', type: 'string', default: "'Fira Code', monospace", scope: 'user', tags: ['font'] },
    { id: 'terminal.shell', title: 'Default Shell', description: 'The default shell to use in the terminal.', category: 'Terminal', type: 'enum', default: 'bash', enum: ['bash', 'zsh', 'fish', 'powershell', 'sh', 'cmd'], scope: 'user' },
    { id: 'terminal.cursorStyle', title: 'Terminal Cursor Style', description: 'Controls the terminal cursor style.', category: 'Terminal', type: 'enum', default: 'block', enum: ['block', 'underline', 'line'], scope: 'user' },
    { id: 'terminal.scrollback', title: 'Scrollback', description: 'Number of lines of terminal scrollback.', category: 'Terminal', type: 'number', default: 1000, minimum: 100, maximum: 100000, scope: 'user' },

    // Workbench
    { id: 'workbench.colorTheme', title: 'Color Theme', description: 'Specifies the color theme.', category: 'Workbench', type: 'enum', default: 'Azora Dark Pro', enum: ['Azora Dark Pro', 'GitHub Dark', 'One Dark Pro', 'Dracula', 'Tokyo Night', 'Catppuccin Mocha', 'Solarized Dark', 'Nord', 'Material Dark', 'Monokai Pro'], scope: 'user', tags: ['theme'] },
    { id: 'workbench.iconTheme', title: 'Icon Theme', description: 'Specifies the icon theme.', category: 'Workbench', type: 'enum', default: 'material-icon-theme', enum: ['material-icon-theme', 'seti', 'vscode-icons', 'catppuccin-icons', 'none'], scope: 'user', tags: ['theme'] },
    { id: 'workbench.sideBar.location', title: 'Sidebar Location', description: 'Controls the location of the sidebar.', category: 'Workbench', type: 'enum', default: 'left', enum: ['left', 'right'], scope: 'user' },
    { id: 'workbench.activityBar.visible', title: 'Activity Bar Visible', description: 'Controls the visibility of the activity bar.', category: 'Workbench', type: 'boolean', default: true, scope: 'user' },
    { id: 'workbench.statusBar.visible', title: 'Status Bar Visible', description: 'Controls the visibility of the status bar.', category: 'Workbench', type: 'boolean', default: true, scope: 'user' },
    { id: 'workbench.startupEditor', title: 'Startup Editor', description: 'Controls which editor is shown at startup.', category: 'Workbench', type: 'enum', default: 'welcomePage', enum: ['none', 'welcomePage', 'readme', 'newUntitledFile'], scope: 'user' },

    // AI
    { id: 'ai.enabled', title: 'AI Features Enabled', description: 'Enable AI-powered code assistance.', category: 'AI', type: 'boolean', default: true, scope: 'user', tags: ['ai'] },
    { id: 'ai.autocomplete', title: 'AI Autocomplete', description: 'Enable AI-powered code completions.', category: 'AI', type: 'boolean', default: true, scope: 'user', tags: ['ai'] },
    { id: 'ai.inlineChat', title: 'Inline Chat', description: 'Enable inline AI chat in the editor.', category: 'AI', type: 'boolean', default: true, scope: 'user', tags: ['ai'] },
    { id: 'ai.model', title: 'AI Model', description: 'Select the AI model for code assistance.', category: 'AI', type: 'enum', default: 'gpt-4o', enum: ['gpt-4o', 'gpt-4o-mini', 'claude-3.5-sonnet', 'claude-3-opus', 'gemini-pro', 'codellama-70b', 'deepseek-coder'], scope: 'user', tags: ['ai'] },
    { id: 'ai.contextWindow', title: 'Context Window', description: 'Maximum tokens to include in AI context.', category: 'AI', type: 'number', default: 4096, minimum: 512, maximum: 128000, scope: 'user', tags: ['ai'] },

    // Collaboration
    { id: 'collaboration.enabled', title: 'Collaboration Enabled', description: 'Enable real-time collaboration features.', category: 'Collaboration', type: 'boolean', default: true, scope: 'user' },
    { id: 'collaboration.showCursors', title: 'Show Cursors', description: 'Show other users cursors in the editor.', category: 'Collaboration', type: 'boolean', default: true, scope: 'user' },
    { id: 'collaboration.showPresence', title: 'Show Presence', description: 'Show user presence indicators.', category: 'Collaboration', type: 'boolean', default: true, scope: 'user' },
    { id: 'collaboration.notifications', title: 'Collaboration Notifications', description: 'Show notifications for collaboration events.', category: 'Collaboration', type: 'enum', default: 'all', enum: ['all', 'mentions', 'none'], scope: 'user' },

    // Security
    { id: 'security.autoScan', title: 'Auto Security Scan', description: 'Automatically scan code for vulnerabilities.', category: 'Security', type: 'boolean', default: true, scope: 'workspace', tags: ['security'] },
    { id: 'security.policyLevel', title: 'Security Policy', description: 'Set the security policy enforcement level.', category: 'Security', type: 'enum', default: 'standard', enum: ['strict', 'standard', 'relaxed'], scope: 'workspace', tags: ['security'] },

    // Files
    { id: 'files.autoSave', title: 'Auto Save', description: 'Controls auto save of editors.', category: 'Files', type: 'enum', default: 'afterDelay', enum: ['off', 'afterDelay', 'onFocusChange', 'onWindowChange'], scope: 'user' },
    { id: 'files.autoSaveDelay', title: 'Auto Save Delay', description: 'Delay in ms after which an editor is auto-saved.', category: 'Files', type: 'number', default: 1000, minimum: 100, maximum: 60000, scope: 'user' },
    { id: 'files.exclude', title: 'Files Exclude', description: 'Configure glob patterns for excluding files and folders.', category: 'Files', type: 'object', default: { '**/node_modules': true, '**/.git': true, '**/.DS_Store': true }, scope: 'user' },
    { id: 'files.trimTrailingWhitespace', title: 'Trim Trailing Whitespace', description: 'Trim trailing whitespace when saving.', category: 'Files', type: 'boolean', default: true, scope: 'user' },
    { id: 'files.insertFinalNewline', title: 'Insert Final Newline', description: 'Insert a final newline at the end of the file when saving.', category: 'Files', type: 'boolean', default: true, scope: 'user' },
  ]

  private userSettings: UserSettings = {}
  private workspaceSettings: UserSettings = {}
  private keybindings: KeyBinding[] = [
    // File operations
    { id: 'kb-1', command: 'file.save', key: 'Ctrl+S', source: 'default' },
    { id: 'kb-2', command: 'file.saveAll', key: 'Ctrl+Shift+S', source: 'default' },
    { id: 'kb-3', command: 'file.newFile', key: 'Ctrl+N', source: 'default' },
    { id: 'kb-4', command: 'file.openFile', key: 'Ctrl+O', source: 'default' },
    { id: 'kb-5', command: 'file.closeTab', key: 'Ctrl+W', source: 'default' },
    // Edit operations
    { id: 'kb-6', command: 'edit.undo', key: 'Ctrl+Z', source: 'default' },
    { id: 'kb-7', command: 'edit.redo', key: 'Ctrl+Shift+Z', source: 'default' },
    { id: 'kb-8', command: 'edit.cut', key: 'Ctrl+X', source: 'default' },
    { id: 'kb-9', command: 'edit.copy', key: 'Ctrl+C', source: 'default' },
    { id: 'kb-10', command: 'edit.paste', key: 'Ctrl+V', source: 'default' },
    { id: 'kb-11', command: 'edit.selectAll', key: 'Ctrl+A', source: 'default' },
    { id: 'kb-12', command: 'edit.find', key: 'Ctrl+F', source: 'default' },
    { id: 'kb-13', command: 'edit.findReplace', key: 'Ctrl+H', source: 'default' },
    { id: 'kb-14', command: 'edit.toggleComment', key: 'Ctrl+/', source: 'default' },
    { id: 'kb-15', command: 'edit.indentLine', key: 'Tab', when: 'editorTextFocus', source: 'default' },
    { id: 'kb-16', command: 'edit.outdentLine', key: 'Shift+Tab', when: 'editorTextFocus', source: 'default' },
    { id: 'kb-17', command: 'edit.moveLinesUp', key: 'Alt+ArrowUp', when: 'editorTextFocus', source: 'default' },
    { id: 'kb-18', command: 'edit.moveLinesDown', key: 'Alt+ArrowDown', when: 'editorTextFocus', source: 'default' },
    { id: 'kb-19', command: 'edit.duplicateLine', key: 'Shift+Alt+ArrowDown', when: 'editorTextFocus', source: 'default' },
    // View operations
    { id: 'kb-20', command: 'view.commandPalette', key: 'Ctrl+Shift+P', source: 'default' },
    { id: 'kb-21', command: 'view.quickOpen', key: 'Ctrl+P', source: 'default' },
    { id: 'kb-22', command: 'view.toggleSidebar', key: 'Ctrl+B', source: 'default' },
    { id: 'kb-23', command: 'view.togglePanel', key: 'Ctrl+J', source: 'default' },
    { id: 'kb-24', command: 'view.toggleTerminal', key: 'Ctrl+`', source: 'default' },
    { id: 'kb-25', command: 'view.zoomIn', key: 'Ctrl+=', source: 'default' },
    { id: 'kb-26', command: 'view.zoomOut', key: 'Ctrl+-', source: 'default' },
    { id: 'kb-27', command: 'view.explorer', key: 'Ctrl+Shift+E', source: 'default' },
    { id: 'kb-28', command: 'view.search', key: 'Ctrl+Shift+F', source: 'default' },
    { id: 'kb-29', command: 'view.sourceControl', key: 'Ctrl+Shift+G', source: 'default' },
    { id: 'kb-30', command: 'view.extensions', key: 'Ctrl+Shift+X', source: 'default' },
    // Debug
    { id: 'kb-31', command: 'debug.start', key: 'F5', source: 'default' },
    { id: 'kb-32', command: 'debug.stop', key: 'Shift+F5', source: 'default' },
    { id: 'kb-33', command: 'debug.stepOver', key: 'F10', source: 'default' },
    { id: 'kb-34', command: 'debug.stepInto', key: 'F11', source: 'default' },
    { id: 'kb-35', command: 'debug.stepOut', key: 'Shift+F11', source: 'default' },
    { id: 'kb-36', command: 'debug.toggleBreakpoint', key: 'F9', source: 'default' },
    // AI
    { id: 'kb-37', command: 'ai.triggerSuggest', key: 'Ctrl+Space', when: 'editorTextFocus', source: 'default' },
    { id: 'kb-38', command: 'ai.openChat', key: 'Ctrl+Shift+I', source: 'default' },
    { id: 'kb-39', command: 'ai.inlineChat', key: 'Ctrl+I', when: 'editorTextFocus', source: 'default' },
    // Collaboration
    { id: 'kb-40', command: 'collab.openChat', key: 'Ctrl+Shift+A', source: 'default' },
    // Settings
    { id: 'kb-41', command: 'settings.open', key: 'Ctrl+,', source: 'default' },
    { id: 'kb-42', command: 'settings.openJSON', key: 'Ctrl+Shift+,', source: 'default' },
    { id: 'kb-43', command: 'keybindings.open', key: 'Ctrl+K Ctrl+S', source: 'default' },
  ]

  // Settings CRUD
  getCategories(): string[] {
    const cats = new Set(this.definitions.map(d => d.category))
    return Array.from(cats).sort()
  }

  getDefinitions(category?: string): SettingDefinition[] {
    if (category) return this.definitions.filter(d => d.category === category)
    return [...this.definitions]
  }

  getDefinition(id: string): SettingDefinition | undefined {
    return this.definitions.find(d => d.id === id)
  }

  searchSettings(query: string): SettingsSearchResult[] {
    const q = query.toLowerCase()
    const results: SettingsSearchResult[] = []

    for (const setting of this.definitions) {
      let relevance = 0
      let matchType: SettingsSearchResult['matchType'] = 'id'

      if (setting.id.toLowerCase().includes(q)) { relevance = 100; matchType = 'id' }
      else if (setting.title.toLowerCase().includes(q)) { relevance = 90; matchType = 'title' }
      else if (setting.description.toLowerCase().includes(q)) { relevance = 70; matchType = 'description' }
      else if (setting.category.toLowerCase().includes(q)) { relevance = 50; matchType = 'category' }
      else if (setting.tags?.some(t => t.includes(q))) { relevance = 60; matchType = 'title' }

      if (relevance > 0) results.push({ setting, matchType, relevance })
    }

    return results.sort((a, b) => b.relevance - a.relevance)
  }

  getSetting(id: string, scope: 'user' | 'workspace' = 'user'): any {
    const settings = scope === 'workspace' ? this.workspaceSettings : this.userSettings
    if (id in settings) return settings[id]
    const def = this.definitions.find(d => d.id === id)
    return def?.default
  }

  setSetting(id: string, value: any, scope: 'user' | 'workspace' = 'user'): void {
    const settings = scope === 'workspace' ? this.workspaceSettings : this.userSettings
    settings[id] = value
  }

  resetSetting(id: string, scope: 'user' | 'workspace' = 'user'): void {
    const settings = scope === 'workspace' ? this.workspaceSettings : this.userSettings
    delete settings[id]
  }

  getAllSettings(scope: 'user' | 'workspace' = 'user'): UserSettings {
    return scope === 'workspace' ? { ...this.workspaceSettings } : { ...this.userSettings }
  }

  getSettingsJSON(scope: 'user' | 'workspace' = 'user'): string {
    return JSON.stringify(this.getAllSettings(scope), null, 2)
  }

  importSettingsJSON(json: string, scope: 'user' | 'workspace' = 'user'): boolean {
    try {
      const parsed = JSON.parse(json)
      if (scope === 'workspace') {
        this.workspaceSettings = { ...parsed }
      } else {
        this.userSettings = { ...parsed }
      }
      return true
    } catch { return false }
  }

  getModifiedSettings(scope: 'user' | 'workspace' = 'user'): SettingDefinition[] {
    const settings = scope === 'workspace' ? this.workspaceSettings : this.userSettings
    return this.definitions.filter(d => d.id in settings)
  }

  // Keybindings
  getKeybindings(source?: 'default' | 'user' | 'extension'): KeyBinding[] {
    if (source) return this.keybindings.filter(kb => kb.source === source)
    return [...this.keybindings]
  }

  searchKeybindings(query: string): KeyBinding[] {
    const q = query.toLowerCase()
    return this.keybindings.filter(kb =>
      kb.command.toLowerCase().includes(q) ||
      kb.key.toLowerCase().includes(q) ||
      (kb.when && kb.when.toLowerCase().includes(q))
    )
  }

  setKeybinding(command: string, key: string, when?: string): void {
    const existing = this.keybindings.find(kb => kb.command === command && kb.source === 'user')
    if (existing) {
      existing.key = key
      if (when !== undefined) existing.when = when
    } else {
      this.keybindings.push({
        id: `kb-user-${Date.now()}`,
        command,
        key,
        when,
        source: 'user',
      })
    }
  }

  resetKeybinding(command: string): void {
    this.keybindings = this.keybindings.filter(kb => !(kb.command === command && kb.source === 'user'))
  }

  getKeybindingsJSON(): string {
    return JSON.stringify(this.keybindings.filter(kb => kb.source === 'user'), null, 2)
  }
}

export const settingsPreferences = new SettingsPreferencesService()
