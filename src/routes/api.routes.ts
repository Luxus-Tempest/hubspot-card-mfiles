import { Router } from "express";
import { mFilesController } from "../controllers/mfiles.controller";

const router = Router();

router.post("/login", mFilesController.login);
router.get("/object/:hsObjectID/:hsObjItemID", mFilesController.getObjectByHsIDs);
router.get("/object-with-docs/:hsObjectID/:hsObjItemID", mFilesController.getObjectWithDocs);
router.post("/docs/upload/:mfObjectID", mFilesController.uploadDocument);
router.get("/docs/:mfObjectId", mFilesController.getDocsByMfID);
// router.post("/docs/upload/:hsObjectID/:mfObjectID", mFilesController.uploadDocument);
router.get("/docs/download/:docId/:fileId", mFilesController.downloadDocument);
router.get("/docs/:docId/props", mFilesController.getDocumentProps);

export default router;