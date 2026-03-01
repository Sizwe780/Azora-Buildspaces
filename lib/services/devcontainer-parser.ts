/**
 * DevContainer Parser Service
 *
 * This service is responsible for parsing devcontainer.json files and extracting
 * the necessary configuration to create a development environment.
 */

export interface DevContainerConfig {
  name: string;
  image?: string;
  build?: {
    dockerfile: string;
    context: string;
  };
  forwardPorts?: (number | string)[];
  portsAttributes?: Record<string, any>;
  postCreateCommand?: string;
  customizations?: Record<string, any>;
  remoteUser?: string;
  mounts?: string[];
  runArgs?: string[];
  environment?: Record<string, string>;
}

class DevContainerParserService {
  public async parse(jsonContent: string): Promise<DevContainerConfig> {
    try {
      const config: DevContainerConfig = JSON.parse(jsonContent);
      return config;
    } catch (error) {
      console.error('Error parsing devcontainer.json:', error);
      throw new Error('Invalid devcontainer.json format');
    }
  }
}

export const devContainerParser = new DevContainerParserService();
