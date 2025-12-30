import { Injectable } from '@nestjs/common';
import { EventsGateway } from './events.gateway';

@Injectable()
export class EventsService {
  constructor(private readonly eventsGateway: EventsGateway) {}

  /**
   * Emit event to specific user by commitment
   */
  emitToUser(commitment: string, event: string, data: any) {
    this.eventsGateway.server.to(commitment).emit(event, data);
  }

  /**
   * Emit event to all users in a wallet
   */
  emitToWallet(walletAddress: string, event: string, data: any) {
    this.eventsGateway.server.to(walletAddress).emit(event, data);
  }
}
