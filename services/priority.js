const PRIORITY_WEIGHTS = {
  Low: 1,
  Medium: 2,
  High: 3,
  Critical: 4,
};

const calculateComplaintPriority = (complaint = {}) => {
  const priorityWeight = PRIORITY_WEIGHTS[complaint.priorityLevel] || PRIORITY_WEIGHTS.Medium;
  const upvoteWeight = Number(complaint.upvotes || 0) * 8;
  const severityWeight = Number(complaint.severityCoefficient || 1) * 12;
  const createdAt = complaint.createdAt ? new Date(complaint.createdAt).getTime() : Date.now();
  const ageHours = Math.max((Date.now() - createdAt) / 3600000, 0);
  const ageBoost = Math.min(ageHours * 1.5, 36);
  const holdPenalty = complaint.holdState === "HELD_PENDING" ? -12 : 0;
  const statusPenalty = ["Resolved", "Closed"].includes(complaint.status) ? -18 : 0;

  return Math.max(
    0,
    Math.round(priorityWeight * 20 + upvoteWeight + severityWeight + ageBoost + holdPenalty + statusPenalty)
  );
};

const getPriorityLabel = (score = 0) => {
  if (score >= 110) {
    return "Critical";
  }

  if (score >= 80) {
    return "High";
  }

  if (score >= 45) {
    return "Medium";
  }

  return "Low";
};

module.exports = {
  calculateComplaintPriority,
  getPriorityLabel,
};