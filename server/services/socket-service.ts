const actions = require('../../src/socket/socket-events');

module.exports = (io: any) => {
  const getRooms = () => {
    logger.info('getting current rooms sessions');
    return Array.from(io.sockets.adapter.rooms.keys());
  };

  const shareRooms = () => {
    io.emit(actions.share, { rooms: getRooms() });
    logger.info('sending open rooms sessions');
  };

  const leaveRoom = (socket: any) => {
    const { rooms } = socket;

    rooms.forEach((roomID: string) => {
      Array.from(io.sockets.adapter.rooms.get(roomID) || []).forEach((clientID) => {
        io.to(clientID).emit(actions.removePeer, {
          peerID: socket.id
        });
        socket.emit(actions.removePeer, {
          peerID: clientID
        });
      });
      logger.info(`the user: ${socket.id} has left the room: ${roomID}`);
      socket.leave(roomID);
    });
    shareRooms();
  };

  io.on('connection', (socket: any) => {
    logger.info(`the user: ${socket.id} has connected`);
    shareRooms();

    socket.on(actions.join, (config: any) => {
      const { rooms: joinedRooms } = socket;
      const { room: roomID } = config;

      if (!Array.from(joinedRooms).includes(roomID)) {
        Array.from(io.sockets.adapter.rooms.get(roomID) || []).forEach((clientID) => {
          io.to(clientID).emit(actions.addPeer, {
            peerID: socket.id,
            createOffer: false
          });
          socket.emit(actions.addPeer, {
            peerID: clientID,
            createOffer: true
          });
        });
        socket.join(roomID);
        logger.info(`the user: ${socket.id} has join the room: ${roomID}`);
        getRooms();
      };
    });

    socket.on(actions.leave, () => leaveRoom(socket));
    socket.on('disconnect', () => {
      leaveRoom(socket);
      logger.info(`the user: ${socket.id} has disconnecting`);
    });
  });
};
