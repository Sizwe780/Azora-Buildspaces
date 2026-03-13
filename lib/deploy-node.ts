// @ts-ignore
import { Client } from 'ssh2';
import { readFileSync } from 'fs';

interface DeploymentResult {
    success: boolean;
    logs: string[];
    error?: string;
}

const USERNAME_PATTERN = /^[a-z_][a-z0-9_-]{0,31}$/i
const HOST_PATTERN = /^(?:[a-zA-Z0-9.-]+|\d{1,3}(?:\.\d{1,3}){3})$/

function escapeShellArg(value: string): string {
    return `'${value.replace(/'/g, `'"'"'`)}'`
}

export async function deployToWorkerNode(
    host: string = '10.0.0.1', // Default to AzVPN X515 IP
    username: string = 'azora',
    privateKeyPath: string = process.env.SSH_KEY_PATH || '/home/azora/.ssh/id_rsa',
    dockerComposeContent: string
): Promise<DeploymentResult> {

    return new Promise((resolve) => {
        const conn = new Client();
        const logs: string[] = [];

        if (!USERNAME_PATTERN.test(username)) {
            return resolve({ success: false, logs, error: 'Invalid SSH username' })
        }

        if (!HOST_PATTERN.test(host)) {
            return resolve({ success: false, logs, error: 'Invalid SSH host' })
        }

        let privateKey: Buffer | undefined
        if (privateKeyPath) {
            try {
                privateKey = readFileSync(privateKeyPath)
            } catch {
                privateKey = undefined
            }
        }

        const password = process.env.SSH_PASSWORD
        if (!privateKey && !password) {
            return resolve({ success: false, logs, error: 'No SSH credential configured (private key or SSH_PASSWORD required)' })
        }

        conn.on('ready', () => {
            logs.push('SSH Connection established.');

            // 1. Create a temporary directory for the deployment
            const deployDir = `/home/${username}/deployments/${Date.now()}`;
            const mkdirCmd = `mkdir -p -- ${escapeShellArg(deployDir)}`;

            conn.exec(mkdirCmd, (err: any, stream: any) => {
                if (err) {
                    conn.end();
                    return resolve({ success: false, logs, error: err.message });
                }

                stream.on('close', (code: any) => {
                    if (code !== 0) {
                        conn.end();
                        return resolve({ success: false, logs, error: `Failed to create directory. Exit code: ${code}` });
                    }

                    // 2. Write docker-compose.yml (Simulated via echo for simplicity, sftp preferred for large files)
                    // Escaping quotes for echo is tricky, so we base64 encode/decode to be safe
                    const base64Content = Buffer.from(dockerComposeContent).toString('base64');
                    const composePath = `${deployDir}/docker-compose.yml`
                    const writeCmd = `printf %s ${escapeShellArg(base64Content)} | base64 -d > ${escapeShellArg(composePath)}`;

                    conn.exec(writeCmd, (err: any, stream: any) => {
                        if (err) {
                            conn.end();
                            return resolve({ success: false, logs, error: err.message });
                        }

                        stream.on('close', (code: any) => {
                            if (code !== 0) {
                                conn.end();
                                return resolve({ success: false, logs, error: `Failed to write compose file. Exit code: ${code}` });
                            }

                            // 3. Run Docker Compose Up
                            const deployCmd = `cd ${escapeShellArg(deployDir)} && docker compose up -d`;
                            logs.push(`Executing: ${deployCmd}`);

                            conn.exec(deployCmd, (err: any, stream: any) => {
                                if (err) {
                                    conn.end();
                                    return resolve({ success: false, logs, error: err.message });
                                }

                                stream.on('data', (data: any) => logs.push(data.toString()));
                                stream.stderr.on('data', (data: any) => logs.push(`ERR: ${data.toString()}`));

                                stream.on('close', (code: any) => {
                                    conn.end();
                                    if (code === 0) {
                                        resolve({ success: true, logs });
                                    } else {
                                        resolve({ success: false, logs, error: `Deployment failed. Exit code: ${code}` });
                                    }
                                });
                            });
                        });
                    });
                });
            });
        }).on('error', (err: any) => {
            resolve({ success: false, logs, error: `SSH Connection Failed: ${err.message}` });
        }).connect({
            host,
            port: 22,
            username,
            privateKey,
            password,
        });
    });
}
