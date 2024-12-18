export interface Request {
  id: string;
  type: string;
  params: {
    name: string;
    arguments: any;
  };
}

export interface Response {
  id: string;
  content: Array<{
    type: string;
    text: string;
  }>;
}

export interface ServerInfo {
  name: string;
  version: string;
}

export interface ServerConfig {
  capabilities: {
    tools: Record<string, unknown>;
  };
}

export interface Transport {
  send(data: any): Promise<void>;
  onMessage(handler: (data: any) => Promise<void>): void;
  close(): Promise<void>;
}
