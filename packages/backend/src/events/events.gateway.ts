import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

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
    // const commitment = client.handshake.query.commitment as string;
    const walletAddress = client.handshake.query.walletAddress as string;

    // if (!commitment) {
    //   this.logger.warn(`Client ${client.id} connected without commitment, disconnecting`);
    //   client.disconnect();
    //   return;
    // }

    // Join room by commitment (for personal notifications)
    // client.join(commitment);
    // this.logger.log(`Client ${client.id} joined room: ${commitment.slice(0, 10)}...`);

    // Join room by wallet address (for transaction updates)
    if (walletAddress) {
      client.join(walletAddress);
      this.logger.log(
        `Client ${client.id} joined wallet room: ${walletAddress}`,
      );
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client ${client.id} disconnected`);
  }
}
