import { Response } from 'express';
import { Transport } from './types.js';

export class SSEServerTransport implements Transport {
  private messageEndpoint: string;
  private res: Response;
  private messageHandler?: (data: any) => Promise<void>;

  constructor(messageEndpoint: string, res: Response) {
    this.messageEndpoint = messageEndpoint;
    this.res = res;
  }

  async send(data: any): Promise<void> {
    this.res.write(`event: message\n`);
    this.res.write(`data: ${JSON.stringify(data)}\n\n`);
  }

  onMessage(handler: (data: any) => Promise<void>): void {
    this.messageHandler = handler;
  }

  async handlePostMessage(req: any, res: Response): Promise<void> {
    if (!this.messageHandler) {
      res.status(500).json({ error: 'No message handler registered' });
      return;
    }

    try {
      const result = await this.messageHandler(req.body);
      await this.send(result);
      res.json({ status: 'ok' });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.send({ error: errorMessage });
      res.status(500).json({ error: errorMessage });
    }
  }

  async close(): Promise<void> {
    this.res.end();
  }
}
