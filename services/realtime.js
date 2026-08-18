const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Complaint = require("../models/Complaint");
const Notification = require("../models/Notification");

const JWT_SECRET = process.env.JWT_SECRET || "ekotro-dev-secret";
let ioInstance = null;
const coordinationRoles = new Set(["officer", "admin", "field_worker"]);

const isNonEmptyString = (value, maxLength = 1500) =>
  typeof value === "string" && value.trim().length > 0 && value.trim().length <= maxLength;

const registerSocketHandlers = (io) => {
  ioInstance = io;

  io.on("connection", (socket) => {
    const token = socket.handshake.auth?.token;

    if (token) {
      try {
        const user = jwt.verify(token, JWT_SECRET);
        socket.data.user = user;
        socket.join(`role:${user.role}`);
        socket.join(`user:${user.id}`);
      } catch (error) {
        socket.emit("coordination:error", {
          message: "Your session could not be verified. Please sign in again.",
        });
      }
    }

    socket.on("complaint:join", ({ complaintId } = {}) => {
      if (complaintId) socket.join(`complaint:${complaintId}`);
    });

    socket.on("complaint:leave", ({ complaintId } = {}) => {
      if (complaintId) socket.leave(`complaint:${complaintId}`);
    });

    const requireCoordinator = (acknowledge) => {
      const user = socket.data.user;
      if (!user || !coordinationRoles.has(user.role)) {
        const error = { ok: false, message: "Only officers and field crews can use internal coordination." };
        if (typeof acknowledge === "function") acknowledge(error);
        else socket.emit("coordination:error", error);
        return null;
      }
      return user;
    };

    socket.on("coordination:join", ({ complaintId } = {}, acknowledge) => {
      const user = requireCoordinator(acknowledge);
      if (!user) return;
      if (!complaintId) {
        return acknowledge?.({ ok: false, message: "A complaint is required." });
      }
      socket.join(`coordination:${complaintId}`);
      acknowledge?.({ ok: true });
    });

    socket.on("coordination:leave", ({ complaintId } = {}) => {
      if (complaintId) socket.leave(`coordination:${complaintId}`);
    });

    socket.on("coordination:message", (data = {}, acknowledge) => {
      const user = requireCoordinator(acknowledge);
      if (!user) return;
      const { complaintId, body } = data;
      if (!complaintId || !isNonEmptyString(body)) {
        return acknowledge?.({ ok: false, message: "Write a message of up to 1,500 characters." });
      }
      const payload = {
        complaintId,
        body: body.trim(),
        senderId: user.id,
        senderName: user.name || "Team member",
        senderRole: user.role,
        timestamp: new Date().toISOString(),
      };
      io.to(`coordination:${complaintId}`).emit("coordination:message", payload);
      acknowledge?.({ ok: true, data: payload });
    });

    socket.on("coordination:assign", async (data = {}, acknowledge) => {
      const user = requireCoordinator(acknowledge);
      if (!user) return;
      if (!["officer", "admin"].includes(user.role)) {
        return acknowledge?.({ ok: false, message: "Only officers can assign field crews." });
      }
      const { complaintId, crewMemberId, taskDescription, estimatedTime } = data;
      if (!complaintId || !crewMemberId || !isNonEmptyString(taskDescription)) {
        return acknowledge?.({ ok: false, message: "Choose a crew member and enter a task description." });
      }
      try {
        const [crewMember, complaint] = await Promise.all([
          User.findById(crewMemberId).select("name role"),
          Complaint.findById(complaintId).select("title"),
        ]);
        if (!complaint) {
          return acknowledge?.({ ok: false, message: "The selected complaint no longer exists." });
        }
        if (!crewMember || crewMember.role !== "field_worker") {
          return acknowledge?.({ ok: false, message: "Assignments can only be sent to registered field crew members." });
        }
        const eta = typeof estimatedTime === "string" ? estimatedTime.trim().slice(0, 120) : "";
        const payload = {
          id: `${socket.id}-${Date.now()}`,
          complaintId: String(complaintId),
          complaintTitle: complaint.title,
          crewMemberId: String(crewMemberId),
          taskDescription: taskDescription.trim(),
          estimatedTime: eta,
          assignedBy: user.id,
          assignedByName: user.name || "Municipal Officer",
          status: "assigned",
          timestamp: new Date().toISOString(),
        };
        const notificationMessage = `${payload.assignedByName} assigned you to “${complaint.title}”. Instruction: ${payload.taskDescription}${eta ? ` Estimated time: ${eta}.` : ""}`;
        await Notification.create({
          user: crewMemberId,
          title: "New maintenance assignment",
          message: notificationMessage,
          type: "case_update",
        });
        io.to(`user:${crewMemberId}`).emit("coordination:assignment", payload);
        io.to(`user:${crewMemberId}`).emit("notification:new", {
          title: "New maintenance assignment",
          message: notificationMessage,
          complaintId: String(complaintId),
          assignment: payload,
        });
        io.to(`coordination:${complaintId}`).emit("coordination:assignment", payload);
        acknowledge?.({ ok: true, data: payload });
      } catch (error) {
        acknowledge?.({
          ok: false,
          message: "The assignment could not be saved. Please try again.",
        });
      }
    });

    socket.on("coordination:assignment_response", (data = {}, acknowledge) => {
      const user = requireCoordinator(acknowledge);
      if (!user) return;
      if (user.role !== "field_worker") {
        return acknowledge?.({ ok: false, message: "Only field crew members can respond to assignments." });
      }
      const { complaintId, assignmentId, status, note } = data;
      if (!complaintId || !assignmentId || !["accepted", "rejected"].includes(status)) {
        return acknowledge?.({ ok: false, message: "Provide a valid assignment response." });
      }
      const payload = {
        complaintId,
        assignmentId,
        status,
        note: typeof note === "string" ? note.trim().slice(0, 1500) : "",
        crewMemberId: user.id,
        crewMemberName: user.name || "Field crew",
        timestamp: new Date().toISOString(),
      };
      io.to(`coordination:${complaintId}`).emit("coordination:assignment_response", payload);
      io.to("role:officer").to("role:admin").emit("coordination:assignment_response", payload);
      acknowledge?.({ ok: true, data: payload });
    });

    socket.on("coordination:progress", (data = {}, acknowledge) => {
      const user = requireCoordinator(acknowledge);
      if (!user) return;
      if (user.role !== "field_worker") {
        return acknowledge?.({ ok: false, message: "Only field crew members can post work progress." });
      }
      const { complaintId, progressPercentage, currentPhase, note } = data;
      const progress = Number(progressPercentage);
      if (!complaintId || !Number.isFinite(progress) || progress < 0 || progress > 100 || !isNonEmptyString(currentPhase, 120)) {
        return acknowledge?.({ ok: false, message: "Provide a phase and progress from 0 to 100." });
      }
      const payload = {
        complaintId,
        progressPercentage: progress,
        currentPhase: currentPhase.trim(),
        note: typeof note === "string" ? note.trim().slice(0, 1500) : "",
        crewMemberId: user.id,
        crewMemberName: user.name || "Field crew",
        timestamp: new Date().toISOString(),
      };
      io.to(`coordination:${complaintId}`).emit("coordination:progress", payload);
      io.to("role:officer").to("role:admin").emit("coordination:progress", payload);
      io.to(`complaint:${complaintId}`).emit("maintenance:progress", {
        complaintId,
        progressPercentage: progress,
        currentPhase: currentPhase.trim(),
        timestamp: payload.timestamp,
      });
      acknowledge?.({ ok: true, data: payload });
    });
  });
};

const emitComplaintEvent = (eventName, payload = {}) => {
  if (!ioInstance) return;
  ioInstance.emit(eventName, payload);
  if (payload.complaintId) ioInstance.to(`complaint:${payload.complaintId}`).emit(eventName, payload);
};

const emitAdminAlert = (payload = {}) => emitComplaintEvent("dashboard:alert", payload);

const emitOfficialNotification = (payload = {}) => {
  if (!ioInstance) return;
  ioInstance.to("role:citizen").emit("official:announcement", payload);
  ioInstance.emit("announcement:published", payload);
};

const emitUserNotification = (userId, payload = {}) => {
  if (ioInstance && userId) ioInstance.to(`user:${userId}`).emit("notification:new", payload);
};

const emitCrewChatMessage = (complaintId, message) => {
  if (!ioInstance || !complaintId) return;
  ioInstance.to(`coordination:${complaintId}`).emit("crew-chat:message", {
    complaintId: String(complaintId),
    message,
  });
};

const emitCrewAssignment = (complaintId, crewMemberId, assignment) => {
  if (!ioInstance || !complaintId || !crewMemberId) return;
  ioInstance.to(`user:${crewMemberId}`).emit("coordination:assignment", assignment);
  ioInstance.to(`coordination:${complaintId}`).emit("coordination:assignment", assignment);
};

module.exports = { registerSocketHandlers, emitComplaintEvent, emitAdminAlert, emitOfficialNotification, emitUserNotification, emitCrewChatMessage, emitCrewAssignment };
