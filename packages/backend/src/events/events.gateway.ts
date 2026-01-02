import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { getCommitmentRoom, getWalletRoom } from '@polypay/shared';

interface ConnectionQuery {
  walletAddress?: string;
  commitment?: string;
}

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);

  handleConnection(client: Socket) {
    const { walletAddress, commitment } = client.handshake
      .query as ConnectionQuery;

    // Join commitment room for personal notifications
    if (commitment) {
      const commitmentRoom = getCommitmentRoom(commitment);
      client.join(commitmentRoom);
      this.logger.log(`Client ${client.id} joined ${commitmentRoom}`);
    }

    // Join wallet room if provided
    if (walletAddress) {
      const walletRoom = getWalletRoom(walletAddress);
      client.join(walletRoom);
      this.logger.log(`Client ${client.id} joined ${walletRoom}`);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client ${client.id} disconnected`);
  }

  @SubscribeMessage('join:wallet')
  handleJoinWallet(client: Socket, walletAddress: string): void {
    // Leave all existing wallet rooms
    client.rooms.forEach((room) => {
      if (room.startsWith('wallet:')) {
        client.leave(room);
        this.logger.log(`Client ${client.id} left ${room}`);
      }
    });

    // Join new wallet room
    const walletRoom = getWalletRoom(walletAddress);
    client.join(walletRoom);
    this.logger.log(`Client ${client.id} joined ${walletRoom}`);
  }
}
