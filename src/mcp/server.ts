import { Request, Response, ServerInfo, ServerConfig, Transport } from './types.js';

export class Server {
  private info: ServerInfo;
  private config: ServerConfig;
  private transport?: Transport;
  private requestHandlers: Map<string, (request: Request) => Promise<any>> = new Map();

  constructor(info: ServerInfo, config: ServerConfig) {
    this.info = info;
    this.config = config;
  }

  async connect(transport: Transport): Promise<void> {
    this.transport = transport;
    this.transport.onMessage(async (data) => {
      try {
        const request = data as Request;
        const handler = this.requestHandlers.get(request.type);
        if (!handler) {
          throw new Error(`Unknown request type: ${request.type}`);
        }
        const result = await handler(request);
        await this.transport?.send({
          id: request.id,
          ...result,
        });
      } catch (error) {
        await this.transport?.send({
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });
  }

  setRequestHandler(type: string, handler: (request: Request) => Promise<any>): void {
    this.requestHandlers.set(type, handler);
  }

  async close(): Promise<void> {
    await this.transport?.close();
    this.transport = undefined;
  }

  set onerror(handler: (error: Error) => void) {
    // Error handling callback
    this._errorHandler = handler;
  }

  set onclose(handler: () => Promise<void>) {
    // Close handling callback
    this._closeHandler = handler;
  }

  private _errorHandler: ((error: Error) => void) = console.error;
  private _closeHandler: (() => Promise<void>) = async () => {};
}
