import { containerOrchestration, type ContainerConfig } from '@/lib/services/container-orchestration';
import { devContainerParser, type DevContainerConfig } from '@/lib/services/devcontainer-parser';
import { type ExecutionEnvironment, type EnvironmentConfig } from '@/types/execution-environments';

class ExecutionEnvironmentService {
  public async createEnvironment(
    type: 'devcontainer' | 'docker' | 'vm',
    config: string,
    userId: string
  ): Promise<ExecutionEnvironment> {
    switch (type) {
      case 'devcontainer':
        return this.createDevContainerEnvironment(config, userId);
      default:
        throw new Error(`Unsupported environment type: ${type}`);
    }
  }

  private async createDevContainerEnvironment(
    jsonContent: string,
    userId: string
  ): Promise<ExecutionEnvironment> {
    const devContainerConfig = await devContainerParser.parse(jsonContent);

    const containerConfig = this.transformToContainerConfig(devContainerConfig);

    const containerId = await containerOrchestration.createContainer(
      containerConfig,
      userId
    );

    return {
      id: containerId,
      type: 'devcontainer',
      status: 'creating',
      config: devContainerConfig as unknown as EnvironmentConfig,
      userId,
      createdAt: Date.now(),
      ports: [],
      resources: { cpu: 2, memory: 4096, storage: 20, tier: 'basic' as const },
    };
  }

  private transformToContainerConfig(
    devContainerConfig: DevContainerConfig
  ): ContainerConfig {
    return {
      id: '', // Will be set by the orchestration service
      name: devContainerConfig.name,
      image: devContainerConfig.image || '',
      tag: 'latest',
      ports: (devContainerConfig.forwardPorts || []).map(p => ({
        internal: typeof p === 'string' ? parseInt(p.split(':')[0]) : p,
        external: typeof p === 'string' ? parseInt(p.split(':')[1] || p.split(':')[0]) : p,
        protocol: 'tcp' as const,
        visibility: 'private' as const,
      })),
      environment: devContainerConfig.environment || {},
      volumes: (devContainerConfig.mounts || []).map(m => {
        const parts = m.split(',');
        const volume: { host: string; container: string; readonly: boolean; type: 'bind' | 'volume' | 'tmpfs' } = {
            host: '',
            container: '',
            readonly: false,
            type: 'bind',
        };
        parts.forEach(part => {
            if (part.startsWith('source=')) volume.host = part.substring('source='.length);
            if (part.startsWith('target=')) volume.container = part.substring('target='.length);
            if (part.startsWith('type=')) volume.type = part.substring('type='.length) as 'bind' | 'volume' | 'tmpfs';
            if (part === 'readonly') volume.readonly = true;
        });
        return volume;
      }),
      workingDir: '/workspace',
      networkMode: 'bridge',
      labels: {},
      securityOptions: [],
      resources: {
        memory: '2g',
        cpu: '1',
        storage: '10g',
      },
      runtime: 'docker',
      extensions: devContainerConfig.customizations?.vscode?.extensions || [],
    } as ContainerConfig;
  }
}

export const executionEnvironmentService = new ExecutionEnvironmentService();
