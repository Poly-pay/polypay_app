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
    const commitment = client.handshake.query.commitment as string;

    if (!commitment) {
      this.logger.warn(
        `Client ${client.id} connected without commitment, disconnecting`,
      );
      client.disconnect();
      return;
    }

    // Join room by commitment
    client.join(commitment);
    this.logger.log(`Client ${client.id} joined room: ${commitment}...`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client ${client.id} disconnected`);
  }
}
