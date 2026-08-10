let ioInstance = null;

const registerSocketHandlers = (io) => {
  ioInstance = io;

  io.on("connection", (socket) => {
    socket.on("complaint:join", ({ complaintId }) => {
      if (complaintId) {
        socket.join(`complaint:${complaintId}`);
      }
    });

    socket.on("complaint:leave", ({ complaintId }) => {
      if (complaintId) {
        socket.leave(`complaint:${complaintId}`);
      }
    });

    socket.on("disconnect", () => {});
  });
};

const emitComplaintEvent = (eventName, payload = {}) => {
  if (!ioInstance) {
    return;
  }

  ioInstance.emit(eventName, payload);

  if (payload.complaintId) {
    ioInstance.to(`complaint:${payload.complaintId}`).emit(eventName, payload);
  }
};

const emitAdminAlert = (payload = {}) => {
  emitComplaintEvent("dashboard:alert", payload);
};

module.exports = {
  registerSocketHandlers,
  emitComplaintEvent,
  emitAdminAlert,
};