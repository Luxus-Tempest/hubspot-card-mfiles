"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mFilesController = exports.MFilesController = void 0;
const multer_1 = __importDefault(require("multer"));
const axios_1 = __importDefault(require("axios"));
const mfiles_service_1 = require("../services/mfiles.service");
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage() });
const handleError = (error, res) => {
    if (axios_1.default.isAxiosError(error)) {
        const status = error.response?.status ?? 500;
        const payload = error.response?.data ?? { message: error.message };
        res.status(status).json(payload);
        return;
    }
    const message = error instanceof Error ? error.message : "Unexpected error";
    res.status(500).json({ message });
};
const requireToken = (req, res) => {
    const token = req.header("X-Authentication");
    if (!token) {
        res.status(400).json({ message: "X-Authentication header is required" });
        return undefined;
    }
    return token;
};
const targetedPropertyDef = {
    "0-1": {
        label: "Contact property in MFile",
        property: 1038,
    },
    "0-2": {
        label: "Company property in MFile",
        property: 1037,
    },
};
class MFilesController {
    constructor() {
        this.login = async (req, res) => {
            const { username, password, vaultGuid } = req.body ?? {};
            if (!username || !password || !vaultGuid) {
                res
                    .status(400)
                    .json({ message: "username, password and vaultGuid are required" });
                return;
            }
            try {
                const data = await mfiles_service_1.mFilesService.login({ username, password, vaultGuid });
                res.json(data);
            }
            catch (error) {
                handleError(error, res);
            }
        };
        this.getObjectByHsIDs = async (req, res) => {
            const token = requireToken(req, res);
            if (!token) {
                return;
            }
            try {
                const data = await mfiles_service_1.mFilesService.getObjectByHsIDs(token, req.params.hsObjectID, req.params.hsObjItemID);
                res.json(data);
            }
            catch (error) {
                handleError(error, res);
            }
        };
        this.getObjectWithDocs = async (req, res) => {
            const token = requireToken(req, res);
            if (!token) {
                return;
            }
            try {
                const data = await mfiles_service_1.mFilesService.getObjectWithDocs(token, req.params.hsObjectID, req.params.hsObjItemID);
                res.json(data);
            }
            catch (error) {
                handleError(error, res);
            }
        };
        this.getDocsByMfID = async (req, res) => {
            const token = requireToken(req, res);
            if (!token) {
                return;
            }
            try {
                const data = await mfiles_service_1.mFilesService.getDocsByMfID(token, req.params.mfObjectId);
                res.json(data);
            }
            catch (error) {
                handleError(error, res);
            }
        };
        // uploadDocument = [
        //   upload.single("document"),
        //   async (req: Request, res: Response) => {
        //     const token = requireToken(req, res);
        //     if (!token) {
        //       return;
        //     }
        //     const file = req.file;
        //     const { docTitle, targetObjectID } = req.body ?? {};
        //     if (!file) {
        //       res.status(400).json({ message: "document file is required" });
        //       return;
        //     }
        //     if (!docTitle || req.params.hsObjectID ) {
        //       res.status(400).json({ message: "docTitle and hsObjectID and mfObjectID are required" });
        //       return;
        //     }
        //     try {
        //       const data = await mFilesService.uploadDocument(
        //         token,
        //         file,
        //         docTitle,
        //         targetObjectID,
        //         req.params.hsObjectID
        //       );
        //       res.json(data);
        //     } catch (error) {
        //       handleError(error, res);
        //     }
        //   },
        // ];
        this.uploadDocument = [
            upload.single("document"),
            async (req, res) => {
                // return res.status(200).json({ message: "MESSAGE" });
                const token = requireToken(req, res);
                if (!token) {
                    return;
                }
                const file = req.file;
                const { docTitle } = req.body ?? {};
                const hsObjectID = req.query.hsObjectID;
                if (!file) {
                    res.status(400).json({ message: "document file is required" });
                    return;
                }
                if (!docTitle || !hsObjectID || !req.params.mfObjectID) {
                    res.status(400).json({
                        message: "docTitle, hsObjectID and mfObjectID are required"
                    });
                    return;
                }
                try {
                    const data = await mfiles_service_1.mFilesService.uploadDocument(token, file, docTitle, req.params.mfObjectID, hsObjectID);
                    res.json(data);
                }
                catch (error) {
                    handleError(error, res);
                }
            },
        ];
        this.downloadDocument = async (req, res) => {
            const token = requireToken(req, res);
            if (!token) {
                return;
            }
            try {
                const upstreamResponse = await mfiles_service_1.mFilesService.downloadDocument(token, req.params.docId, req.params.fileId);
                const contentType = upstreamResponse.headers["content-type"] ?? "application/octet-stream";
                const contentDisposition = upstreamResponse.headers["content-disposition"] ??
                    `attachment; filename="document_${req.params.fileId}"`;
                res.setHeader("Content-Type", contentType);
                res.setHeader("Content-Disposition", contentDisposition);
                upstreamResponse.data.pipe(res);
            }
            catch (error) {
                handleError(error, res);
            }
        };
        this.getDocumentProps = async (req, res) => {
            const token = requireToken(req, res);
            if (!token) {
                return;
            }
            try {
                const data = await mfiles_service_1.mFilesService.getDocumentProps(token, req.params.docId);
                res.json(data);
            }
            catch (error) {
                handleError(error, res);
            }
        };
    }
}
exports.MFilesController = MFilesController;
exports.mFilesController = new MFilesController();
