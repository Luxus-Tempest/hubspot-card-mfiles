"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mFilesService = exports.MFilesService = void 0;
const axios_1 = __importDefault(require("axios"));
const form_data_1 = __importDefault(require("form-data"));
const HsObjectToProperty = {
    "0-1": {
        label: "Contact property in MFile",
        property: 1038,
    },
    "0-2": {
        label: "Company property in MFile",
        property: 1037,
    }, // à complèter after avc les otres obj huspot
};
class MFilesService {
    constructor(baseURL = process.env.MFILES_BASE_URL ??
        "http://209.209.40.100:85/REST", timeout = Number(process.env.MFILES_TIMEOUT ?? 15000)) {
        this.http = axios_1.default.create({
            baseURL: baseURL.endsWith("/") ? baseURL : `${baseURL}/`,
            timeout,
        });
    }
    async login(payload) {
        const { data } = await this.http.post("server/authenticationtokens", payload);
        const token = data.Value;
        await this.http.get("objects", {
            headers: this.authHeaders(token),
        });
        return { token };
    }
    async getObjectByHsIDs(token, hsObjectID, hsObjItemID) {
        const { data } = await this.http.get(`objects.aspx?p1030=${hsObjItemID}&p1039=${hsObjectID}`, {
            headers: this.authHeaders(token),
        });
        return data;
    }
    async getObjectWithDocs(token, hsObjectID, hsObjItemID) {
        const result = await this.getObjectByHsIDs(token, hsObjectID, hsObjItemID);
        if (!result ||
            typeof result !== "object" ||
            !Array.isArray(result.Items) ||
            result.Items.length === 0 ||
            !result.Items[0].ObjVer) {
            throw new Error("Could not find M-Files record for given HS IDs");
        }
        const targetObjectID = result.Items[0].ObjVer.ID;
        const targetProperty = HsObjectToProperty[hsObjectID].property;
        //http://209.209.40.100:85/REST/objects/0?p1038=2&P100=4 le contact(class 4) de ID 2 | j'avais oublié
        const { data } = await this.http.get(`objects/0?p${targetProperty}=${targetObjectID}`, {
            headers: this.authHeaders(token),
        });
        const clean = data.Items
            ? data.Items.map((item) => ({
                title: item.Title,
                displayId: item.DisplayID,
                objectId: item.ObjVer.ID,
                files: item.Files.map((file) => ({
                    name: file.Name,
                    extension: file.Extension,
                    size: file.Size,
                    id: file.ID,
                    lastAccessedByMe: item.LastAccessedByMe,
                })),
            }))
            : [];
        return {
            mfId: targetObjectID,
            documents: clean,
        };
    }
    async getDocsByMfID(token, ID) {
        const { data } = await this.http.get(`objects/0/${ID}`, {
            headers: this.authHeaders(token),
        });
        return data;
    }
    async uploadDocument(token, file, docTitle, targetObjetID, hsObjectID) {
        const uploadInfo = await this.uploadFileToVault(token, file);
        const extension = this.extractExtension(file.originalname);
        const objectCreationInfo = {
            PropertyValues: [
                {
                    PropertyDef: 100,
                    TypedValue: {
                        DataType: 9,
                        Lookup: { Item: 5, Version: -1 },
                    },
                },
                {
                    PropertyDef: HsObjectToProperty[hsObjectID].property, // contact 1038 - company 1037
                    TypedValue: {
                        DataType: 9,
                        Lookup: { Item: Number(targetObjetID) },
                        Value: Number(targetObjetID),
                    },
                },
                {
                    PropertyDef: 0,
                    TypedValue: {
                        DataType: 1,
                        Value: docTitle,
                    },
                },
            ],
            Files: [
                {
                    ...uploadInfo,
                    Extension: extension,
                },
            ],
        };
        const { data } = await this.http.post("objects/0.aspx", objectCreationInfo, {
            headers: {
                ...this.authHeaders(token),
                "Content-Type": "application/json",
            },
        });
        return data;
    }
    async downloadDocument(token, docId, fileId) {
        return this.http.get(`objects/0/${docId}/files/${fileId}/content`, {
            headers: this.authHeaders(token),
            responseType: "stream",
        });
    }
    async getDocumentProps(token, docId) {
        const { data } = await this.http.get(`objects/0/${docId}/properties`, {
            headers: this.authHeaders(token),
        });
        return data;
    }
    async uploadFileToVault(token, file) {
        const formData = new form_data_1.default();
        formData.append("file", file.buffer, {
            filename: file.originalname,
            contentType: file.mimetype,
            knownLength: file.size,
        });
        const { data } = await this.http.post("files.aspx", formData, {
            headers: {
                ...formData.getHeaders(),
                ...this.authHeaders(token),
            },
        });
        return data;
    }
    async deleteDocument(token, docId) {
        const { data } = await this.http.post(`objects/0/${docId}/latest.aspx?_method=DELETE&allVersions=true`, {}, {
            headers: this.authHeaders(token),
        });
        return data;
    }
    extractExtension(filename) {
        const parts = filename.split(".");
        return parts.length > 1 ? (parts.pop() ?? "") : "";
    }
    authHeaders(token) {
        return { "X-Authentication": token };
    }
}
exports.MFilesService = MFilesService;
exports.mFilesService = new MFilesService();
