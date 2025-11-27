import { Request, Response } from "express";
import multer from "multer";
import axios from "axios";
import { mFilesService } from "../services/mfiles.service";

const upload = multer({ storage: multer.memoryStorage() });

const handleError = (error: unknown, res: Response) => {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status ?? 500;
    const payload = error.response?.data ?? { message: error.message };
    res.status(status).json(payload);
    return;
  }

  const message = error instanceof Error ? error.message : "Unexpected error";
  res.status(500).json({ message });
};

const requireToken = (req: Request, res: Response): string | undefined => {
  const token = req.header("X-Authentication");
  if (!token) {
    res.status(400).json({ message: "X-Authentication header is required" });
    return undefined;
  }
  return token;
};

const targetedPropertyDef: Record<string, { label:string, property: number}> = {
    "0-1": {
    label: "Contact property in MFile",
    property: 1038,
  },
  "0-2": {
    label: "Company property in MFile",
    property: 1037,
  },
}

export class MFilesController {
  login = async (req: Request, res: Response) => {
    const { username, password, vaultGuid } = req.body ?? {};

    if (!username || !password || !vaultGuid) {
      res
        .status(400)
        .json({ message: "username, password and vaultGuid are required" });
      return;
    }

    try {
      const data = await mFilesService.login({ username, password, vaultGuid });
      res.json(data);
    } catch (error) {
      handleError(error, res);
    }
  };

  getObjectByHsIDs = async (req: Request, res: Response) => {
    const token = requireToken(req, res);
    if (!token) {
      return;
    }

    try {
      const data = await mFilesService.getObjectByHsIDs(token, req.params.hsObjectID, req.params.hsObjItemID );
      res.json(data);
    } catch (error) {
      handleError(error, res);
    }
  };

    getObjectWithDocs = async (req: Request, res: Response) => {
    const token = requireToken(req, res);
    if (!token) {
      return;
    }

    try {
      const data = await mFilesService.getObjectWithDocs(token, req.params.hsObjectID, req.params.hsObjItemID );
      res.json(data);

    } catch (error) {
      handleError(error, res);
    }
  };

    getDocsByMfID = async (req: Request, res: Response) => {
    const token = requireToken(req, res);
    if (!token) {
      return;
    }

    try {
      const data = await mFilesService.getDocsByMfID(token, req.params.mfObjectId);
      res.json(data);
    } catch (error) {
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

  uploadDocument = [
  upload.single("document"),
  async (req: Request, res: Response) => {
    // return res.status(200).json({ message: "MESSAGE" });
    const token = requireToken(req, res);
    if (!token) {
      return;
    }

    const file = req.file;
    const { docTitle } = req.body ?? {};
    const hsObjectID = req.query.hsObjectID as string;
    

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
      const data = await mFilesService.uploadDocument(
        token,
        file,
        docTitle,
        req.params.mfObjectID,
        hsObjectID
      );
      res.json(data);
    } catch (error) {
      handleError(error, res);
    }
  },
];

  downloadDocument = async (req: Request, res: Response) => {
    const token = requireToken(req, res);
    if (!token) {
      return;
    }

    try {
      const upstreamResponse = await mFilesService.downloadDocument(
        token,
        req.params.docId,
        req.params.fileId
      );

      const contentType =
        upstreamResponse.headers["content-type"] ?? "application/octet-stream";
      const contentDisposition =
        upstreamResponse.headers["content-disposition"] ??
        `attachment; filename="document_${req.params.fileId}"`;

      res.setHeader("Content-Type", contentType);
      res.setHeader("Content-Disposition", contentDisposition);

      upstreamResponse.data.pipe(res);
    } catch (error) {
      handleError(error, res);
    }
  };

  getDocumentProps = async (req: Request, res: Response) => {
    const token = requireToken(req, res);
    if (!token) {
      return;
    }

    try {
      const data = await mFilesService.getDocumentProps(
        token,
        req.params.docId
      );
      res.json(data);
    } catch (error) {
      handleError(error, res);
    }
  };
}

export const mFilesController = new MFilesController();
