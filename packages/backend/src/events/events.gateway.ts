import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import {
  getCommitmentRoom,
  getAccountRoom,
  JOIN_ACCOUNT_ROOM,
  ROOM_PREFIX,
} from '@polypay/shared';

interface ConnectionQuery {
  accountAddress?: string;
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
    const { accountAddress, commitment } = client.handshake
      .query as ConnectionQuery;

    // Join commitment room for personal notifications
    if (commitment) {
      const commitmentRoom = getCommitmentRoom(commitment);
      client.join(commitmentRoom);
      this.logger.log(`Client ${client.id} joined ${commitmentRoom}`);
    }

    // Join account room if provided
    if (accountAddress) {
      const accountRoom = getAccountRoom(accountAddress);
      client.join(accountRoom);
      this.logger.log(`Client ${client.id} joined ${accountRoom}`);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client ${client.id} disconnected`);
  }

  @SubscribeMessage(JOIN_ACCOUNT_ROOM)
  handleJoinAccount(client: Socket, accountAddress: string): void {
    // Leave all existing account rooms
    client.rooms.forEach((room) => {
      if (room.startsWith(`${ROOM_PREFIX.ACCOUNT}:`)) {
        client.leave(room);
        this.logger.log(`Client ${client.id} left ${room}`);
      }
    });

    // Join new account room
    const accountRoom = getAccountRoom(accountAddress);
    client.join(accountRoom);
    this.logger.log(`Client ${client.id} joined ${accountRoom}`);
  }
}
