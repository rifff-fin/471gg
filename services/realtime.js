const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "ekotro-dev-secret";
let ioInstance = null;

const registerSocketHandlers = (io) => {
  ioInstance = io;

  io.on("connection", (socket) => {
    const token = socket.handshake.auth?.token;

    if (token) {
      try {
        const user = jwt.verify(token, JWT_SECRET);
        socket.join(`role:${user.role}`);
      } catch (error) {
        // Unauthenticated visitors can receive public complaint events only.
      }
    }

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

const emitOfficialNotification = (payload = {}) => {
  if (!ioInstance) return;

  ioInstance.to("role:citizen").emit("official:announcement", payload);
  ioInstance.emit("announcement:published", payload);
};

module.exports = {
  registerSocketHandlers,
  emitComplaintEvent,
  emitAdminAlert,
  emitOfficialNotification,
};
