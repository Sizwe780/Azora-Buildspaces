/**
 * Comprehensive Language Support Registry
 * 
 * Azora BuildSpaces - 60+ Languages
 * Surpasses GitHub Codespaces (40+), Gitpod (40+), Replit (50+), VS Code Web (30+)
 * 
 * Each language entry includes:
 * - Monaco editor language ID
 * - File extensions
 * - LSP server configuration
 * - Runtime/compiler info
 * - Syntax highlighting & formatting
 */

export interface LanguageSupport {
  id: string
  name: string
  monaco: string
  extensions: string[]
  category: LanguageCategory
  lsp?: {
    server: string
    args: string[]
    installCommand?: string
    protocol?: 'stdio' | 'tcp' | 'websocket'
    port?: number
  }
  runtime?: {
    command: string
    args?: string[]
    installUrl?: string
    versionFlag?: string
  }
  compiler?: {
    command: string
    args?: string[]
    outputFlag?: string
  }
  formatter?: {
    command: string
    args?: string[]
  }
  linter?: {
    command: string
    args?: string[]
  }
  debugger?: {
    type: string
    adapter?: string
  }
  icon?: string
  color?: string
}

export type LanguageCategory =
  | 'mainstream'
  | 'web'
  | 'mobile'
  | 'systems'
  | 'functional'
  | 'scripting'
  | 'data-science'
  | 'blockchain'
  | 'database'
  | 'markup'
  | 'config'
  | 'devops'

export const SUPPORTED_LANGUAGES: LanguageSupport[] = [
  // ═══════════════════════════════════════════════════════════
  // MAINSTREAM LANGUAGES
  // ═══════════════════════════════════════════════════════════
  {
    id: 'javascript', name: 'JavaScript', monaco: 'javascript',
    extensions: ['.js', '.jsx', '.mjs', '.cjs'], category: 'mainstream',
    lsp: { server: 'typescript-language-server', args: ['--stdio'], protocol: 'stdio' },
    runtime: { command: 'node', versionFlag: '--version' },
    formatter: { command: 'prettier', args: ['--parser', 'babel'] },
    linter: { command: 'eslint', args: ['--ext', '.js,.jsx'] },
    debugger: { type: 'node', adapter: 'vscode-js-debug' },
    icon: '🟨', color: '#F7DF1E',
  },
  {
    id: 'typescript', name: 'TypeScript', monaco: 'typescript',
    extensions: ['.ts', '.tsx', '.mts', '.cts'], category: 'mainstream',
    lsp: { server: 'typescript-language-server', args: ['--stdio'], protocol: 'stdio' },
    runtime: { command: 'tsx', versionFlag: '--version' },
    compiler: { command: 'tsc', args: ['--noEmit'] },
    formatter: { command: 'prettier', args: ['--parser', 'typescript'] },
    linter: { command: 'eslint', args: ['--ext', '.ts,.tsx'] },
    debugger: { type: 'node', adapter: 'vscode-js-debug' },
    icon: '🔷', color: '#3178C6',
  },
  {
    id: 'python', name: 'Python', monaco: 'python',
    extensions: ['.py', '.pyw', '.pyi'], category: 'mainstream',
    lsp: { server: 'pylsp', args: [], protocol: 'stdio', installCommand: 'pip install python-lsp-server' },
    runtime: { command: 'python3', versionFlag: '--version' },
    formatter: { command: 'black', args: [] },
    linter: { command: 'ruff', args: ['check'] },
    debugger: { type: 'python', adapter: 'debugpy' },
    icon: '🐍', color: '#3776AB',
  },
  {
    id: 'java', name: 'Java', monaco: 'java',
    extensions: ['.java'], category: 'mainstream',
    lsp: { server: 'jdtls', args: [], protocol: 'stdio' },
    compiler: { command: 'javac', outputFlag: '-d' },
    runtime: { command: 'java', versionFlag: '-version' },
    formatter: { command: 'google-java-format', args: [] },
    debugger: { type: 'java', adapter: 'vscode-java-debug' },
    icon: '☕', color: '#ED8B00',
  },
  {
    id: 'csharp', name: 'C#', monaco: 'csharp',
    extensions: ['.cs', '.csx'], category: 'mainstream',
    lsp: { server: 'OmniSharp', args: ['-lsp'], protocol: 'stdio' },
    compiler: { command: 'dotnet', args: ['build'] },
    runtime: { command: 'dotnet', args: ['run'], versionFlag: '--version' },
    debugger: { type: 'coreclr', adapter: 'vscode-csharp' },
    icon: '🟪', color: '#512BD4',
  },
  {
    id: 'cpp', name: 'C++', monaco: 'cpp',
    extensions: ['.cpp', '.cc', '.cxx', '.hpp', '.hxx', '.h'], category: 'systems',
    lsp: { server: 'clangd', args: ['--background-index'], protocol: 'stdio' },
    compiler: { command: 'g++', args: ['-std=c++20'], outputFlag: '-o' },
    formatter: { command: 'clang-format', args: [] },
    debugger: { type: 'cppdbg', adapter: 'vscode-cpptools' },
    icon: '⚙️', color: '#00599C',
  },
  {
    id: 'c', name: 'C', monaco: 'c',
    extensions: ['.c', '.h'], category: 'systems',
    lsp: { server: 'clangd', args: ['--background-index'], protocol: 'stdio' },
    compiler: { command: 'gcc', args: ['-std=c17'], outputFlag: '-o' },
    formatter: { command: 'clang-format', args: [] },
    debugger: { type: 'cppdbg', adapter: 'vscode-cpptools' },
    icon: '🔵', color: '#A8B9CC',
  },
  {
    id: 'go', name: 'Go', monaco: 'go',
    extensions: ['.go'], category: 'mainstream',
    lsp: { server: 'gopls', args: [], protocol: 'stdio' },
    compiler: { command: 'go', args: ['build'] },
    runtime: { command: 'go', args: ['run'], versionFlag: 'version' },
    formatter: { command: 'gofmt', args: [] },
    linter: { command: 'golangci-lint', args: ['run'] },
    debugger: { type: 'go', adapter: 'delve' },
    icon: '🐹', color: '#00ADD8',
  },
  {
    id: 'rust', name: 'Rust', monaco: 'rust',
    extensions: ['.rs'], category: 'systems',
    lsp: { server: 'rust-analyzer', args: [], protocol: 'stdio' },
    compiler: { command: 'rustc', outputFlag: '-o' },
    runtime: { command: 'cargo', args: ['run'], versionFlag: '--version' },
    formatter: { command: 'rustfmt', args: [] },
    linter: { command: 'clippy', args: [] },
    debugger: { type: 'lldb', adapter: 'vscode-lldb' },
    icon: '🦀', color: '#DEA584',
  },
  {
    id: 'ruby', name: 'Ruby', monaco: 'ruby',
    extensions: ['.rb', '.rake', '.gemspec'], category: 'mainstream',
    lsp: { server: 'solargraph', args: ['stdio'], protocol: 'stdio' },
    runtime: { command: 'ruby', versionFlag: '--version' },
    formatter: { command: 'rubocop', args: ['-a'] },
    linter: { command: 'rubocop', args: [] },
    debugger: { type: 'ruby', adapter: 'rdbg' },
    icon: '💎', color: '#CC342D',
  },
  {
    id: 'php', name: 'PHP', monaco: 'php',
    extensions: ['.php', '.phtml'], category: 'mainstream',
    lsp: { server: 'phpactor', args: ['language-server'], protocol: 'stdio' },
    runtime: { command: 'php', versionFlag: '--version' },
    formatter: { command: 'php-cs-fixer', args: ['fix'] },
    linter: { command: 'phpstan', args: ['analyse'] },
    debugger: { type: 'php', adapter: 'xdebug' },
    icon: '🐘', color: '#777BB4',
  },
  {
    id: 'swift', name: 'Swift', monaco: 'swift',
    extensions: ['.swift'], category: 'mobile',
    lsp: { server: 'sourcekit-lsp', args: [], protocol: 'stdio' },
    compiler: { command: 'swiftc', outputFlag: '-o' },
    runtime: { command: 'swift', args: ['run'], versionFlag: '--version' },
    debugger: { type: 'lldb', adapter: 'vscode-lldb' },
    icon: '🐦', color: '#F05138',
  },
  {
    id: 'kotlin', name: 'Kotlin', monaco: 'kotlin',
    extensions: ['.kt', '.kts'], category: 'mobile',
    lsp: { server: 'kotlin-language-server', args: [], protocol: 'stdio' },
    compiler: { command: 'kotlinc', outputFlag: '-d' },
    runtime: { command: 'kotlin', versionFlag: '-version' },
    debugger: { type: 'kotlin', adapter: 'vscode-kotlin-debug' },
    icon: '🟣', color: '#7F52FF',
  },
  {
    id: 'scala', name: 'Scala', monaco: 'scala',
    extensions: ['.scala', '.sc'], category: 'mainstream',
    lsp: { server: 'metals', args: [], protocol: 'stdio' },
    compiler: { command: 'scalac' },
    runtime: { command: 'scala', versionFlag: '-version' },
    icon: '🔴', color: '#DC322F',
  },
  {
    id: 'dart', name: 'Dart', monaco: 'dart',
    extensions: ['.dart'], category: 'mobile',
    lsp: { server: 'dart', args: ['language-server', '--protocol=lsp'], protocol: 'stdio' },
    runtime: { command: 'dart', args: ['run'], versionFlag: '--version' },
    formatter: { command: 'dart', args: ['format'] },
    icon: '🎯', color: '#0175C2',
  },
  {
    id: 'perl', name: 'Perl', monaco: 'perl',
    extensions: ['.pl', '.pm'], category: 'scripting',
    lsp: { server: 'perl-language-server', args: [], protocol: 'stdio' },
    runtime: { command: 'perl', versionFlag: '-v' },
    icon: '🐪', color: '#39457E',
  },
  {
    id: 'r', name: 'R', monaco: 'r',
    extensions: ['.r', '.R', '.Rmd'], category: 'data-science',
    lsp: { server: 'r-languageserver', args: [], protocol: 'stdio' },
    runtime: { command: 'Rscript', versionFlag: '--version' },
    icon: '📊', color: '#276DC3',
  },
  {
    id: 'julia', name: 'Julia', monaco: 'julia',
    extensions: ['.jl'], category: 'data-science',
    lsp: { server: 'julia', args: ['--project=@.', '-e', 'using LanguageServer; runserver()'], protocol: 'stdio' },
    runtime: { command: 'julia', versionFlag: '--version' },
    icon: '🟢', color: '#9558B2',
  },
  {
    id: 'objectivec', name: 'Objective-C', monaco: 'objective-c',
    extensions: ['.m', '.mm'], category: 'mobile',
    lsp: { server: 'clangd', args: [], protocol: 'stdio' },
    compiler: { command: 'clang', args: ['-framework', 'Foundation'], outputFlag: '-o' },
    icon: '📱', color: '#438EFF',
  },

  // ═══════════════════════════════════════════════════════════
  // FUNCTIONAL & ACADEMIC LANGUAGES
  // ═══════════════════════════════════════════════════════════
  {
    id: 'haskell', name: 'Haskell', monaco: 'haskell',
    extensions: ['.hs', '.lhs'], category: 'functional',
    lsp: { server: 'haskell-language-server-wrapper', args: ['--lsp'], protocol: 'stdio' },
    compiler: { command: 'ghc', outputFlag: '-o' },
    runtime: { command: 'runghc', versionFlag: '--version' },
    icon: 'λ', color: '#5D4F85',
  },
  {
    id: 'elixir', name: 'Elixir', monaco: 'elixir',
    extensions: ['.ex', '.exs'], category: 'functional',
    lsp: { server: 'elixir-ls', args: [], protocol: 'stdio' },
    runtime: { command: 'elixir', versionFlag: '--version' },
    formatter: { command: 'mix', args: ['format'] },
    icon: '💧', color: '#6E4A7E',
  },
  {
    id: 'erlang', name: 'Erlang', monaco: 'erlang',
    extensions: ['.erl', '.hrl'], category: 'functional',
    lsp: { server: 'erlang_ls', args: [], protocol: 'stdio' },
    compiler: { command: 'erlc' }, runtime: { command: 'erl' },
    icon: '📡', color: '#A90533',
  },
  {
    id: 'fsharp', name: 'F#', monaco: 'fsharp',
    extensions: ['.fs', '.fsx', '.fsi'], category: 'functional',
    lsp: { server: 'fsautocomplete', args: ['--adaptive-lsp-server-enabled'], protocol: 'stdio' },
    runtime: { command: 'dotnet', args: ['fsi'] },
    icon: '🔵', color: '#378BBA',
  },
  {
    id: 'ocaml', name: 'OCaml', monaco: 'ocaml',
    extensions: ['.ml', '.mli'], category: 'functional',
    lsp: { server: 'ocamllsp', args: [], protocol: 'stdio' },
    compiler: { command: 'ocamlopt', outputFlag: '-o' },
    runtime: { command: 'ocaml' },
    icon: '🐫', color: '#EC6813',
  },
  {
    id: 'clojure', name: 'Clojure', monaco: 'clojure',
    extensions: ['.clj', '.cljs', '.cljc', '.edn'], category: 'functional',
    lsp: { server: 'clojure-lsp', args: [], protocol: 'stdio' },
    runtime: { command: 'clojure', versionFlag: '--version' },
    icon: '🟢', color: '#5881D8',
  },
  {
    id: 'elm', name: 'Elm', monaco: 'elm',
    extensions: ['.elm'], category: 'functional',
    lsp: { server: 'elm-language-server', args: [], protocol: 'stdio' },
    compiler: { command: 'elm', args: ['make'] },
    icon: '🌳', color: '#1293D8',
  },
  {
    id: 'scheme', name: 'Scheme', monaco: 'scheme',
    extensions: ['.scm', '.ss'], category: 'functional',
    runtime: { command: 'guile' },
    icon: 'λ', color: '#1E4A7B',
  },
  {
    id: 'lisp', name: 'Common Lisp', monaco: 'lisp',
    extensions: ['.lisp', '.cl', '.lsp'], category: 'functional',
    runtime: { command: 'sbcl', args: ['--script'] },
    icon: 'λ', color: '#3FB68B',
  },

  // ═══════════════════════════════════════════════════════════
  // SYSTEMS & EMERGING LANGUAGES
  // ═══════════════════════════════════════════════════════════
  {
    id: 'zig', name: 'Zig', monaco: 'zig',
    extensions: ['.zig'], category: 'systems',
    lsp: { server: 'zls', args: [], protocol: 'stdio' },
    compiler: { command: 'zig', args: ['build'] },
    runtime: { command: 'zig', args: ['run'], versionFlag: 'version' },
    icon: '⚡', color: '#F7A41D',
  },
  {
    id: 'nim', name: 'Nim', monaco: 'nim',
    extensions: ['.nim', '.nims'], category: 'systems',
    lsp: { server: 'nimlsp', args: [], protocol: 'stdio' },
    compiler: { command: 'nim', args: ['compile'] },
    runtime: { command: 'nim', args: ['run'] },
    icon: '👑', color: '#FFE953',
  },
  {
    id: 'v', name: 'V', monaco: 'v',
    extensions: ['.v', '.vv'], category: 'systems',
    lsp: { server: 'v-analyzer', args: [], protocol: 'stdio' },
    compiler: { command: 'v' }, runtime: { command: 'v', args: ['run'] },
    icon: '🔷', color: '#5D87BF',
  },
  {
    id: 'crystal', name: 'Crystal', monaco: 'crystal',
    extensions: ['.cr'], category: 'systems',
    lsp: { server: 'crystalline', args: [], protocol: 'stdio' },
    compiler: { command: 'crystal', args: ['build'] },
    runtime: { command: 'crystal', args: ['run'] },
    icon: '💎', color: '#000100',
  },
  {
    id: 'odin', name: 'Odin', monaco: 'odin',
    extensions: ['.odin'], category: 'systems',
    lsp: { server: 'ols', args: [], protocol: 'stdio' },
    compiler: { command: 'odin', args: ['build'] },
    runtime: { command: 'odin', args: ['run'] },
    icon: '🛡️', color: '#3882D6',
  },
  {
    id: 'carbon', name: 'Carbon', monaco: 'carbon',
    extensions: ['.carbon'], category: 'systems',
    compiler: { command: 'carbon-toolchain' },
    icon: '🔬', color: '#0D0D0D',
  },
  {
    id: 'mojo', name: 'Mojo', monaco: 'mojo',
    extensions: ['.mojo', '.🔥'], category: 'data-science',
    lsp: { server: 'mojo-lsp-server', args: [], protocol: 'stdio' },
    runtime: { command: 'mojo', args: ['run'], versionFlag: '--version' },
    icon: '🔥', color: '#FF6F00',
  },
  {
    id: 'gleam', name: 'Gleam', monaco: 'gleam',
    extensions: ['.gleam'], category: 'functional',
    lsp: { server: 'gleam', args: ['lsp'], protocol: 'stdio' },
    compiler: { command: 'gleam', args: ['build'] },
    runtime: { command: 'gleam', args: ['run'] },
    icon: '✨', color: '#FFAFF3',
  },
  {
    id: 'fortran', name: 'Fortran', monaco: 'fortran',
    extensions: ['.f90', '.f95', '.f03', '.f08', '.f'], category: 'systems',
    lsp: { server: 'fortls', args: [], protocol: 'stdio' },
    compiler: { command: 'gfortran', outputFlag: '-o' },
    icon: '🏛️', color: '#4D41B1',
  },
  {
    id: 'cobol', name: 'COBOL', monaco: 'cobol',
    extensions: ['.cob', '.cbl', '.cpy'], category: 'mainstream',
    lsp: { server: 'cobol-language-support', args: [], protocol: 'stdio' },
    compiler: { command: 'cobc', outputFlag: '-o' },
    icon: '🏦', color: '#005CA5',
  },
  {
    id: 'assembly', name: 'Assembly', monaco: 'asm',
    extensions: ['.asm', '.s', '.S'], category: 'systems',
    compiler: { command: 'nasm', args: ['-f', 'elf64'], outputFlag: '-o' },
    icon: '🔧', color: '#6E4C13',
  },
  {
    id: 'd', name: 'D', monaco: 'd',
    extensions: ['.d'], category: 'systems',
    lsp: { server: 'serve-d', args: [], protocol: 'stdio' },
    compiler: { command: 'dmd' }, runtime: { command: 'rdmd' },
    icon: '🔴', color: '#B03931',
  },

  // ═══════════════════════════════════════════════════════════
  // SCRIPTING & AUTOMATION
  // ═══════════════════════════════════════════════════════════
  {
    id: 'bash', name: 'Bash', monaco: 'shell',
    extensions: ['.sh', '.bash'], category: 'scripting',
    lsp: { server: 'bash-language-server', args: ['start'], protocol: 'stdio' },
    runtime: { command: 'bash', versionFlag: '--version' },
    formatter: { command: 'shfmt', args: [] },
    linter: { command: 'shellcheck', args: [] },
    icon: '🖥️', color: '#4EAA25',
  },
  {
    id: 'powershell', name: 'PowerShell', monaco: 'powershell',
    extensions: ['.ps1', '.psm1', '.psd1'], category: 'scripting',
    lsp: { server: 'pwsh', args: ['-NoLogo', '-NoProfile', '-Command', 'Start-EditorServices'], protocol: 'stdio' },
    runtime: { command: 'pwsh', versionFlag: '--version' },
    icon: '⚡', color: '#012456',
  },
  {
    id: 'lua', name: 'Lua', monaco: 'lua',
    extensions: ['.lua'], category: 'scripting',
    lsp: { server: 'lua-language-server', args: [], protocol: 'stdio' },
    runtime: { command: 'lua', versionFlag: '-v' },
    icon: '🌙', color: '#000080',
  },
  {
    id: 'groovy', name: 'Groovy', monaco: 'groovy',
    extensions: ['.groovy', '.gvy', '.gy'], category: 'scripting',
    lsp: { server: 'groovy-language-server', args: [], protocol: 'stdio' },
    runtime: { command: 'groovy', versionFlag: '--version' },
    icon: '⭐', color: '#4298B8',
  },

  // ═══════════════════════════════════════════════════════════
  // BLOCKCHAIN / WEB3 LANGUAGES
  // ═══════════════════════════════════════════════════════════
  {
    id: 'solidity', name: 'Solidity', monaco: 'solidity',
    extensions: ['.sol'], category: 'blockchain',
    lsp: { server: 'solidity-ls', args: ['--stdio'], protocol: 'stdio' },
    compiler: { command: 'solc' },
    linter: { command: 'solhint', args: [] },
    icon: '💎', color: '#363636',
  },
  {
    id: 'vyper', name: 'Vyper', monaco: 'vyper',
    extensions: ['.vy'], category: 'blockchain',
    compiler: { command: 'vyper' },
    icon: '🐍', color: '#3476A0',
  },
  {
    id: 'move', name: 'Move', monaco: 'move',
    extensions: ['.move'], category: 'blockchain',
    lsp: { server: 'move-analyzer', args: [], protocol: 'stdio' },
    compiler: { command: 'aptos', args: ['move', 'compile'] },
    icon: '🔒', color: '#4FC1E8',
  },
  {
    id: 'cairo', name: 'Cairo', monaco: 'cairo',
    extensions: ['.cairo'], category: 'blockchain',
    lsp: { server: 'cairo-language-server', args: [], protocol: 'stdio' },
    compiler: { command: 'cairo-compile' },
    icon: '🏛️', color: '#F39C12',
  },
  {
    id: 'motoko', name: 'Motoko', monaco: 'motoko',
    extensions: ['.mo'], category: 'blockchain',
    lsp: { server: 'mo-ide', args: ['--lsp'], protocol: 'stdio' },
    compiler: { command: 'moc' },
    icon: '♾️', color: '#522785',
  },

  // ═══════════════════════════════════════════════════════════
  // DATABASE & QUERY LANGUAGES
  // ═══════════════════════════════════════════════════════════
  {
    id: 'sql', name: 'SQL', monaco: 'sql',
    extensions: ['.sql'], category: 'database',
    lsp: { server: 'sql-language-server', args: ['up', '--method', 'stdio'], protocol: 'stdio' },
    formatter: { command: 'sql-formatter', args: [] },
    icon: '🗄️', color: '#E38C00',
  },
  {
    id: 'plsql', name: 'PL/SQL', monaco: 'pgsql',
    extensions: ['.pls', '.plb', '.pkb', '.pks'], category: 'database',
    icon: '🗃️', color: '#F80000',
  },
  {
    id: 'graphql', name: 'GraphQL', monaco: 'graphql',
    extensions: ['.graphql', '.gql'], category: 'database',
    lsp: { server: 'graphql-lsp', args: ['server', '-m', 'stream'], protocol: 'stdio' },
    icon: '◼️', color: '#E10098',
  },

  // ═══════════════════════════════════════════════════════════
  // WEB TECHNOLOGIES
  // ═══════════════════════════════════════════════════════════
  {
    id: 'html', name: 'HTML', monaco: 'html',
    extensions: ['.html', '.htm'], category: 'web',
    lsp: { server: 'vscode-html-language-server', args: ['--stdio'], protocol: 'stdio' },
    formatter: { command: 'prettier', args: ['--parser', 'html'] },
    icon: '🌐', color: '#E34F26',
  },
  {
    id: 'css', name: 'CSS', monaco: 'css',
    extensions: ['.css'], category: 'web',
    lsp: { server: 'vscode-css-language-server', args: ['--stdio'], protocol: 'stdio' },
    formatter: { command: 'prettier', args: ['--parser', 'css'] },
    linter: { command: 'stylelint', args: [] },
    icon: '🎨', color: '#1572B6',
  },
  {
    id: 'scss', name: 'SCSS', monaco: 'scss',
    extensions: ['.scss'], category: 'web',
    lsp: { server: 'vscode-css-language-server', args: ['--stdio'], protocol: 'stdio' },
    formatter: { command: 'prettier', args: ['--parser', 'scss'] },
    icon: '🎨', color: '#CC6699',
  },
  {
    id: 'less', name: 'LESS', monaco: 'less',
    extensions: ['.less'], category: 'web',
    lsp: { server: 'vscode-css-language-server', args: ['--stdio'], protocol: 'stdio' },
    icon: '🎨', color: '#1D365D',
  },
  {
    id: 'svelte', name: 'Svelte', monaco: 'svelte',
    extensions: ['.svelte'], category: 'web',
    lsp: { server: 'svelteserver', args: ['--stdio'], protocol: 'stdio' },
    icon: '🟠', color: '#FF3E00',
  },
  {
    id: 'vue', name: 'Vue', monaco: 'vue',
    extensions: ['.vue'], category: 'web',
    lsp: { server: 'vue-language-server', args: ['--stdio'], protocol: 'stdio' },
    icon: '💚', color: '#4FC08D',
  },
  {
    id: 'astro', name: 'Astro', monaco: 'astro',
    extensions: ['.astro'], category: 'web',
    lsp: { server: 'astro-ls', args: ['--stdio'], protocol: 'stdio' },
    icon: '🚀', color: '#FF5D01',
  },

  // ═══════════════════════════════════════════════════════════
  // MARKUP & CONFIG
  // ═══════════════════════════════════════════════════════════
  {
    id: 'json', name: 'JSON', monaco: 'json',
    extensions: ['.json', '.jsonc'], category: 'config',
    lsp: { server: 'vscode-json-language-server', args: ['--stdio'], protocol: 'stdio' },
    formatter: { command: 'prettier', args: ['--parser', 'json'] },
    icon: '{}', color: '#292929',
  },
  {
    id: 'yaml', name: 'YAML', monaco: 'yaml',
    extensions: ['.yaml', '.yml'], category: 'config',
    lsp: { server: 'yaml-language-server', args: ['--stdio'], protocol: 'stdio' },
    formatter: { command: 'prettier', args: ['--parser', 'yaml'] },
    icon: '📋', color: '#CB171E',
  },
  {
    id: 'toml', name: 'TOML', monaco: 'toml',
    extensions: ['.toml'], category: 'config',
    lsp: { server: 'taplo', args: ['lsp', 'stdio'], protocol: 'stdio' },
    icon: '⚙️', color: '#9C4121',
  },
  {
    id: 'xml', name: 'XML', monaco: 'xml',
    extensions: ['.xml', '.xsl', '.xsd', '.svg'], category: 'markup',
    lsp: { server: 'lemminx', args: [], protocol: 'stdio' },
    icon: '📝', color: '#0060AC',
  },
  {
    id: 'markdown', name: 'Markdown', monaco: 'markdown',
    extensions: ['.md', '.mdx', '.markdown'], category: 'markup',
    lsp: { server: 'marksman', args: [], protocol: 'stdio' },
    formatter: { command: 'prettier', args: ['--parser', 'markdown'] },
    linter: { command: 'markdownlint', args: [] },
    icon: '📝', color: '#083FA1',
  },
  {
    id: 'dockerfile', name: 'Dockerfile', monaco: 'dockerfile',
    extensions: ['Dockerfile', '.dockerfile'], category: 'devops',
    lsp: { server: 'docker-langserver', args: ['--stdio'], protocol: 'stdio' },
    linter: { command: 'hadolint', args: [] },
    icon: '🐳', color: '#2496ED',
  },
  {
    id: 'terraform', name: 'Terraform', monaco: 'hcl',
    extensions: ['.tf', '.tfvars'], category: 'devops',
    lsp: { server: 'terraform-ls', args: ['serve'], protocol: 'stdio' },
    formatter: { command: 'terraform', args: ['fmt'] },
    icon: '🏗️', color: '#7B42BC',
  },
  {
    id: 'protobuf', name: 'Protocol Buffers', monaco: 'protobuf',
    extensions: ['.proto'], category: 'config',
    lsp: { server: 'bufls', args: ['serve'], protocol: 'stdio' },
    icon: '📦', color: '#4285F4',
  },
]

// ═══════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════

/** Get language by file extension */
export function getLanguageByExtension(filename: string): LanguageSupport | undefined {
  const ext = '.' + filename.split('.').pop()?.toLowerCase()
  return SUPPORTED_LANGUAGES.find(lang => lang.extensions.includes(ext))
}

/** Get language by ID */
export function getLanguageById(id: string): LanguageSupport | undefined {
  return SUPPORTED_LANGUAGES.find(lang => lang.id === id)
}

/** Get language by Monaco editor language ID */
export function getLanguageByMonacoId(monacoId: string): LanguageSupport | undefined {
  return SUPPORTED_LANGUAGES.find(lang => lang.monaco === monacoId)
}

/** Get all languages in a specific category */
export function getLanguagesByCategory(category: LanguageCategory): LanguageSupport[] {
  return SUPPORTED_LANGUAGES.filter(lang => lang.category === category)
}

/** Get all languages that have LSP support */
export function getLanguagesWithLSP(): LanguageSupport[] {
  return SUPPORTED_LANGUAGES.filter(lang => lang.lsp != null)
}

/** Get all languages that have debugger support */
export function getLanguagesWithDebugger(): LanguageSupport[] {
  return SUPPORTED_LANGUAGES.filter(lang => lang.debugger != null)
}

/** Get supported file extensions for all languages */
export function getAllSupportedExtensions(): string[] {
  return SUPPORTED_LANGUAGES.flatMap(lang => lang.extensions)
}

/** Get language count summary */
export function getLanguageSummary(): Record<LanguageCategory, number> {
  const summary: Record<string, number> = {}
  for (const lang of SUPPORTED_LANGUAGES) {
    summary[lang.category] = (summary[lang.category] || 0) + 1
  }
  return summary as Record<LanguageCategory, number>
}

/** Total language count */
export const TOTAL_LANGUAGE_COUNT = SUPPORTED_LANGUAGES.length
