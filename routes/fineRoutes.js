const express = require("express");
const router = express.Router();

const fineController = require("../controllers/fineController");
const authMiddleware = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

console.log("========== FINE DEBUG ==========");

console.log("fineController:", fineController);

console.log("authMiddleware:", authMiddleware);

console.log("upload:", upload);

console.log("upload.single:", upload.single);

console.log("================================");

router.post(
  "/",
  authMiddleware.protect,
  authMiddleware.authorize("police"),
  upload.single("evidence"),
  fineController.createFine,
);

router.get(
  "/issued",
  authMiddleware.protect,
  authMiddleware.authorize("police"),
  fineController.getMyIssuedFines,
);

router.get(
  "/my",
  authMiddleware.protect,
  authMiddleware.authorize("citizen"),
  fineController.getMyFines,
);

router.post("/:id/dispute", authMiddleware.protect, authMiddleware.authorize("citizen"), upload.single("evidence"), fineController.disputeFine);
router.patch("/:id/dispute", authMiddleware.protect, authMiddleware.authorize("police"), fineController.reviewDispute);

module.exports = router;
