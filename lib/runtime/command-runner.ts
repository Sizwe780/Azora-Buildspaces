/**
 * Command Runner - Execute real commands safely
 * 
 * Supports:
 * - JavaScript/TypeScript execution (WebContainer)
 * - Python execution (subprocess)
 * - Bash/Shell execution
 * - Deployment commands (K8s, Vercel)
 * 
 * Constitutional: Real execution, proper error handling
 */

import { exec, spawn } from 'child_process';
import { promisify } from 'util';

// WebContainer is a browser-only API. During Node tests it may not be installed.
// Resolve it at runtime without static module references so server bundling does not
// require '@webcontainer/api' to be installed.
function resolveOptionalModule(moduleName: string): any {
  try {
    const runtimeRequire =
      typeof (globalThis as { require?: unknown }).require === 'function'
        ? (globalThis as { require: (name: string) => unknown }).require
        : Function('return require')()
    return runtimeRequire(moduleName)
  } catch {
    return undefined
  }
}

const WebContainer = resolveOptionalModule('@webcontainer/api')?.WebContainer

const execAsync = promisify(exec);
const BLOCKED_SHELL_PATTERNS = [
  /(^|\s)rm\s+-rf\s+\//i,
  /(^|\s)mkfs(\s|$)/i,
  /(^|\s)dd\s+if=/i,
  /(^|\s)shutdown(\s|$)/i,
  /(^|\s)reboot(\s|$)/i,
  /(^|\s)format(\s|$)/i,
  /:\(\)\s*\{\s*:\|:&\s*\};:/,
]

function isBlockedShellCommand(command: string): boolean {
  const normalized = command.trim()
  if (!normalized || normalized.length > 4000) return true
  return BLOCKED_SHELL_PATTERNS.some((pattern) => pattern.test(normalized))
}

export interface CommandConfig {
  type: 'javascript' | 'typescript' | 'python' | 'bash' | 'shell';
  code?: string;
  command?: string;
  cwd?: string;
  timeout?: number;
  env?: Record<string, string>;
}

export interface CommandResult {
  success: boolean;
  output?: string;
  error?: string;
  exitCode?: number;
  duration: number;
}

/**
 * Execute JavaScript/TypeScript code in WebContainer (browser-safe)
 */
async function executeJavaScript(config: CommandConfig): Promise<CommandResult> {
  const startTime = Date.now();
  
  try {
    if (!config.code) {
      throw new Error('No code provided');
    }

    // Try to use WebContainer if available
    try {
      const container = await WebContainer.boot();
      const result = await container.fs.writeFile(
        '/tmp/run.js',
        config.code
      );
      
      const process = await container.spawn('node', ['/tmp/run.js'], {
        env: config.env || {},
      });

      let output = '';
      process.output.pipeTo(
        new WritableStream({
          write(chunk) {
            output += chunk;
          },
        })
      );

      const exitCode = await process.exit;

      return {
        success: exitCode === 0,
        output,
        exitCode,
        duration: Date.now() - startTime,
      };
    } catch (containerError) {
      return {
        success: false,
        error: 'JavaScript/TypeScript execution requires WebContainer runtime',
        duration: Date.now() - startTime,
      }
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Execute Python code
 */
async function executePython(config: CommandConfig): Promise<CommandResult> {
  const startTime = Date.now();
  
  try {
    if (!config.code) {
      throw new Error('No code provided');
    }

    const pythonExecutable = process.platform === 'win32' ? 'python' : (process.env.PYTHON_BIN || 'python3')
    const { stdout, stderr, exitCode } = await runSpawnCommand(
      pythonExecutable,
      ['-c', config.code],
      {
        cwd: config.cwd || process.cwd(),
        timeout: config.timeout || 30000,
        env: { ...process.env, ...config.env },
      }
    )

    if (exitCode !== 0) {
      throw Object.assign(new Error(stderr || `Python exited with code ${exitCode}`), {
        code: exitCode,
        stderr,
      })
    }

    return {
      success: true,
      output: stdout || stderr,
      duration: Date.now() - startTime,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.stderr || error.message,
      exitCode: error.code,
      duration: Date.now() - startTime,
    };
  }
}

function runSpawnCommand(
  command: string,
  args: string[],
  options: {
    cwd: string
    timeout: number
    env: NodeJS.ProcessEnv
  }
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env,
      shell: false,
    })

    let stdout = ''
    let stderr = ''

    const timeoutHandle = setTimeout(() => {
      child.kill()
    }, Math.max(1000, options.timeout))

    child.stdout?.on('data', (chunk) => {
      stdout += chunk.toString()
    })

    child.stderr?.on('data', (chunk) => {
      stderr += chunk.toString()
    })

    child.on('error', (error) => {
      clearTimeout(timeoutHandle)
      reject(error)
    })

    child.on('close', (code) => {
      clearTimeout(timeoutHandle)
      resolve({ stdout, stderr, exitCode: code ?? 1 })
    })
  })
}

/**
 * Execute shell command
 */
async function executeShell(config: CommandConfig): Promise<CommandResult> {
  const startTime = Date.now();
  
  try {
    if (!config.command) {
      throw new Error('No command provided');
    }

    if (isBlockedShellCommand(config.command)) {
      throw new Error('Command blocked by security policy')
    }

    const { stdout, stderr } = await execAsync(config.command, {
      cwd: config.cwd || process.cwd(),
      timeout: config.timeout || 30000,
      env: { ...process.env, ...config.env },
    });

    return {
      success: true,
      output: stdout || stderr,
      duration: Date.now() - startTime,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.stderr || error.message || error.toString(),
      exitCode: error.code,
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Execute deployment command (K8s or Vercel)
 */
async function executeDeploy(config: CommandConfig): Promise<CommandResult> {
  const startTime = Date.now();
  
  try {
    if (!config.command) {
      throw new Error('No deployment command provided');
    }

    // Sanitize command to prevent injection
    const allowedCommands = ['kubectl apply', 'kubectl delete', 'vercel deploy', 'vercel --prod'];
    const isAllowed = allowedCommands.some(allowed => config.command?.startsWith(allowed));

    if (!isAllowed) {
      throw new Error(`Deployment command not allowed: ${config.command}`);
    }

    const { stdout, stderr } = await execAsync(config.command, {
      cwd: config.cwd || process.cwd(),
      timeout: config.timeout || 120000, // 2 min for deployments
      env: { ...process.env, ...config.env },
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large outputs
    });

    return {
      success: true,
      output: stdout || stderr,
      duration: Date.now() - startTime,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.stderr || error.message,
      exitCode: error.code,
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Main execution router
 */
export async function runCommand(config: CommandConfig): Promise<CommandResult> {
  // Log execution (for audit)
  console.log(`[CommandRunner] Executing ${config.type}:`, {
    timeout: config.timeout,
    cwd: config.cwd,
  });

  try {
    switch (config.type) {
      case 'javascript':
      case 'typescript':
        return await executeJavaScript(config);
      case 'python':
        return await executePython(config);
      case 'bash':
      case 'shell':
        return await executeShell(config);
      default:
        return {
          success: false,
          error: `Unknown command type: ${config.type}`,
          duration: 0,
        };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      duration: 0,
    };
  }
}
