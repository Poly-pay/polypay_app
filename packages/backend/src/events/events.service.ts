import { Injectable } from '@nestjs/common';
import { EventsGateway } from './events.gateway';
import { getCommitmentRoom, getWalletRoom } from '@polypay/shared';

@Injectable()
export class EventsService {
  constructor(private readonly eventsGateway: EventsGateway) {}

  /**
   * Emit event to specific user by commitment
   */
  emitToUser(commitment: string, event: string, data: unknown): void {
    const room = getCommitmentRoom(commitment);
    this.eventsGateway.server.to(room).emit(event, data);
  }

  /**
   * Emit event to multiple users by commitments
   */
  emitToCommitments(commitments: string[], event: string, data: unknown): void {
    commitments.forEach((commitment) => {
      this.emitToUser(commitment, event, data);
    });
  }

  /**
   * Emit event to all users in a wallet
   */
  emitToWallet(walletAddress: string, event: string, data: unknown): void {
    const room = getWalletRoom(walletAddress);
    this.eventsGateway.server.to(room).emit(event, data);
  }
}
