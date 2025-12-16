import axios, { AxiosInstance, AxiosResponse } from "axios";
import FormData from "form-data";
import { MFIDs } from "../types/MFIDs";

export interface LoginPayload {
  username: string;
  password: string;
  vaultGuid: string;
}

const HsObjectToProperty: Record<string, { label: string; property: number }> =
  {
    "0-1": {
      label: "Contact property in MFile",
      property: 1038,
    },
    "0-2": {
      label: "Company property in MFile",
      property: 1037,
    }, // à complèter after avc les otres obj huspot
  };

export class MFilesService {
  private readonly http: AxiosInstance;

  constructor(
    baseURL: string = process.env.MFILES_BASE_URL ??
      "http://209.209.40.100:85/REST",
    timeout: number = Number(process.env.MFILES_TIMEOUT ?? 15000)
  ) {
    this.http = axios.create({
      baseURL: baseURL.endsWith("/") ? baseURL : `${baseURL}/`,
      timeout,
    });
  }

  async login(payload: LoginPayload): Promise<{ token: string }> {
    const { data } = await this.http.post<{ Value: string }>(
      "server/authenticationtokens",
      payload
    );
    const token = data.Value;

    await this.http.get("objects", {
      headers: this.authHeaders(token),
    });

    return { token };
  }

  async getObjectByHsIDs(
    token: string,
    hsObjectID: string,
    hsObjItemID: string
  ): Promise<unknown> {
    const { data } = await this.http.get(
      `objects.aspx?p1030=${hsObjItemID}&p1039=${hsObjectID}`,
      {
        headers: this.authHeaders(token),
      }
    );
    return data;
  }

  async getContactByIDs(token: string, hsObjID: string): Promise<unknown> {
    const { data } = await this.http.get(
      `objects/${MFIDs.Obj.Contact}?p1030=${hsObjID}`,
      {
        headers: this.authHeaders(token),
      }
    );
    return data;
  }

  async getObjectWithDocs(
    token: string,
    hsObjectID: string,
    hsObjItemID: string
  ): Promise<unknown> {
    const result = await this.getObjectByHsIDs(token, hsObjectID, hsObjItemID);

    if (
      !result ||
      typeof result !== "object" ||
      !Array.isArray((result as any).Items) ||
      (result as any).Items.length === 0 ||
      !(result as any).Items[0].ObjVer
    ) {
      throw new Error("Could not find M-Files record for given HS IDs");
    }

    const targetObjectID = (result as any).Items[0].ObjVer.ID;
    const targetProperty = HsObjectToProperty[hsObjectID].property;
    //http://209.209.40.100:85/REST/objects/0?p1038=2&P100=4 le contact(class 4) de ID 2 | j'avais oublié
    const { data } = await this.http.get(
      `objects/0?p${targetProperty}=${targetObjectID}`,
      {
        headers: this.authHeaders(token),
      }
    );

    const clean = data.Items
      ? data.Items.map((item: any) => ({
          title: item.Title,
          displayId: item.DisplayID,
          objectId: item.ObjVer.ID,
          files: item.Files.map((file: any) => ({
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

  async getDocsByMfID(token: string, ID: string): Promise<unknown> {
    const { data } = await this.http.get(`objects/0/${ID}`, {
      headers: this.authHeaders(token),
    });
    return data;
  }

  async uploadDocument(
    token: string,
    file: Express.Multer.File,
    docTitle: string,
    targetObjetID: string,
    hsObjectID: string
  ): Promise<unknown> {
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

    const { data } = await this.http.post(
      "objects/0.aspx",
      objectCreationInfo,
      {
        headers: {
          ...this.authHeaders(token),
          "Content-Type": "application/json",
        },
      }
    );

    return data;
  }

  async downloadDocument(
    token: string,
    docId: string,
    fileId: string
  ): Promise<AxiosResponse<NodeJS.ReadableStream>> {
    return this.http.get(`objects/0/${docId}/files/${fileId}/content`, {
      headers: this.authHeaders(token),
      responseType: "stream",
    });
  }

  async getDocumentProps(token: string, docId: string): Promise<unknown> {
    const { data } = await this.http.get(`objects/0/${docId}/properties`, {
      headers: this.authHeaders(token),
    });
    return data;
  }

  private async uploadFileToVault(token: string, file: Express.Multer.File) {
    const formData = new FormData();
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

  async deleteDocument(token: string, docId: string): Promise<unknown> {
    const { data } = await this.http.post(
      `objects/0/${docId}/latest.aspx?_method=DELETE&allVersions=true`,
      {},
      {
        headers: this.authHeaders(token),
      }
    );
    return data;
  }

  private extractExtension(filename: string): string {
    const parts = filename.split(".");
    return parts.length > 1 ? (parts.pop() ?? "") : "";
  }

  private authHeaders(token: string) {
    return { "X-Authentication": token };
  }

  async updateCompany(
    token: string,
    mfCompanyId: string,
    company: {
      name?: string;
      domain?: string;
      phone?: string;
      address?: string;
      // hsObjectId: string;
    }
  ): Promise<number> {
    const properties = [
      {
        PropertyDef: MFIDs.Prop.nomOuTitre,
        TypedValue: {
          DataType: 1,
          Value: company.name || company.domain || "Unknown",
        },
      },
      // {
      //   PropertyDef: MFIDs.Prop.hsObjectId,
      //   TypedValue: {
      //     DataType: 1,
      //     Value: company.hsObjectId,
      //   },
      // },
      // {
      //   PropertyDef: MFIDs.Prop.hsObjectType,
      //   TypedValue: {
      //     DataType: 1,
      //     Value: "0-2", // HubSpot Company
      //   },
      // },
      {
        PropertyDef: MFIDs.Prop.adresse,
        TypedValue: {
          DataType: 1,
          Value: company.address || "",
        },
      },
      {
        PropertyDef: MFIDs.Prop.domain,
        TypedValue: {
          DataType: 1,
          Value: company.domain || "Unknown",
        },
      },
      {
        PropertyDef: MFIDs.Prop.phone,
        TypedValue: {
          DataType: 1,
          Value: company.phone || "",
        },
      },
    ];

    const { data } = await this.http.post(
      `objects/${MFIDs.Obj.Company}/${mfCompanyId}/latest/properties.aspx`,
      properties,
      {
        headers: this.authHeaders(token),
      }
    );

    return data.ObjVer.ID;
  }

  //--------------------------------------- COMPANY -----------------------------------------
  async checkIfCompanyExists(
    token: string,
    hsObjectId: string
  ): Promise<{ exists: boolean; mfId?: number }> {
    const { data } = await this.http.get(
      `objects/${MFIDs.Obj.Company}?p${MFIDs.Prop.hsObjectId}=${hsObjectId}&p${MFIDs.Prop.hsObjectType}=0-2`,
      {
        headers: this.authHeaders(token),
      }
    );

    const exists =
      data?.Items && Array.isArray(data.Items) && data.Items.length > 0;

    if (!exists) {
      return { exists: false };
    }

    return {
      exists: true,
      mfId: data.Items[0].ObjVer.ID,
    };
  }

  async createCompany(
    token: string,
    company: {
      name?: string;
      domain?: string;
      phone?: string;
      address?: string;
      hs_object_id?: string;
    }
  ): Promise<number> {
    const objectCreationInfo = {
      PropertyValues: [
        {
          PropertyDef: MFIDs.Prop.nomOuTitre,
          TypedValue: {
            DataType: 1,
            Value: company.name || company.domain || "Unknown",
          },
        },
        {
          PropertyDef: MFIDs.Prop.hsObjectId,
          TypedValue: {
            DataType: 1,
            Value: company.hs_object_id,
          },
        },
        {
          PropertyDef: MFIDs.Prop.hsObjectType,
          TypedValue: {
            DataType: 1,
            Value: "0-2",
          },
        },
        {
          PropertyDef: MFIDs.Prop.adresse,
          TypedValue: {
            DataType: 1,
            Value: company.address || "",
          },
        },
        {
          PropertyDef: MFIDs.Prop.domain,
          TypedValue: {
            DataType: 1,
            Value: company.domain || "Unknown",
          },
        },
        {
          PropertyDef: MFIDs.Prop.phone,
          TypedValue: {
            DataType: 1,
            Value: company.phone || "",
          },
        },
        {
          // CLASS
          PropertyDef: 100,
          TypedValue: {
            DataType: 9,
            Lookup: {
              Item: MFIDs.Class.Company,
            },
          },
        },
      ],
    };

    const { data } = await this.http.post(
      `objects/${MFIDs.Obj.Company}`,
      objectCreationInfo,
      {
        headers: {
          ...this.authHeaders(token),
          "Content-Type": "application/json",
        },
      }
    );

    return data.ObjVer.ID;
  }

  //----------------------------- CONTACT TRANSACTIONS ----------------------------
  async checkIfContactExists(
    token: string,
    hsContactId: string
  ): Promise<{ exists: boolean; mfId?: number }> {
    const { data } = await this.http.get(
      `objects/${MFIDs.Obj.Contact}?p${MFIDs.Prop.hsObjectId}=${hsContactId}&p${MFIDs.Prop.hsObjectType}=0-1`,
      { headers: this.authHeaders(token) }
    );

    const exists = Array.isArray(data?.Items) && data.Items.length > 0;

    return exists
      ? { exists: true, mfId: data.Items[0].ObjVer.ID }
      : { exists: false };
  }

  async createContact(
    token: string,
    contact: {
      firstname?: string;
      lastname?: string;
      email?: string;
      phone?: string;
      hs_object_id: string;
    },
    mfCompanyId: number
  ): Promise<number> {
    const objectCreationInfo = {
      PropertyValues: [
        {
          PropertyDef: MFIDs.Prop.hsObjectId,
          TypedValue: { DataType: 1, Value: contact.hs_object_id },
        },
        {
          PropertyDef: MFIDs.Prop.hsObjectType,
          TypedValue: { DataType: 1, Value: "0-1" },
        },
        {
          PropertyDef: MFIDs.Prop.firstName,
          TypedValue: { DataType: 1, Value: contact.firstname ?? "" },
        },
        {
          PropertyDef: MFIDs.Prop.lastName,
          TypedValue: { DataType: 1, Value: contact.lastname ?? "" },
        },
        {
          PropertyDef: MFIDs.Prop.email,
          TypedValue: { DataType: 1, Value: contact.email ?? "" },
        },
        {
          PropertyDef: MFIDs.Prop.phone,
          TypedValue: { DataType: 1, Value: contact.phone ?? "" },
        },
        {
          // Association à la company
          PropertyDef: MFIDs.Prop.Companies,
          TypedValue: {
            DataType: 10,
            Lookups: [{ Item: mfCompanyId }],
          },
        },
        {
          PropertyDef: 100,
          TypedValue: {
            DataType: 9,
            Lookup: { Item: MFIDs.Class.Contact },
          },
        },
      ],
    };

    const { data } = await this.http.post(
      `objects/${MFIDs.Obj.Contact}`,
      objectCreationInfo,
      { headers: this.authHeaders(token) }
    );

    return data.ObjVer.ID;
  }

  async updateContact(
    token: string,
    mfContactId: number,
    contact: any,
    mfCompanyId: number
  ): Promise<number> {
    const properties = [
      {
        PropertyDef: MFIDs.Prop.firstName,
        TypedValue: { DataType: 1, Value: contact.firstname ?? "" },
      },
      {
        PropertyDef: MFIDs.Prop.lastName,
        TypedValue: { DataType: 1, Value: contact.lastname ?? "" },
      },
      {
        PropertyDef: MFIDs.Prop.email,
        TypedValue: { DataType: 1, Value: contact.email ?? "" },
      },
      {
        PropertyDef: MFIDs.Prop.phone,
        TypedValue: { DataType: 1, Value: contact.phone ?? "" },
      },
      {
        PropertyDef: MFIDs.Prop.Companies,
        TypedValue: {
          DataType: 10,
          Lookups: [{ Item: mfCompanyId }],
        },
      },
    ];

    const { data } = await this.http.post(
      `objects/${MFIDs.Obj.Contact}/${mfContactId}/latest/properties.aspx`,
      properties,
      { headers: this.authHeaders(token) }
    );

    return data.ObjVer.ID;
  }

  async removeContactFromCompany(
    token: string,
    mfContactId: number,
    mfCompanyId: number
  ): Promise<number> {
    const { data } = await this.http.get(
      `objects/${MFIDs.Obj.Contact}/${mfContactId}/properties`,
      { headers: this.authHeaders(token) }
    );

    // Filtrer les associations pour retirer cette company
    const currentCompanies =
      data?.PropertyValues?.find(
        (p: any) => p.PropertyDef === MFIDs.Prop.Companies
      )?.TypedValue?.Lookups ?? [];

    const updatedCompanies = currentCompanies.filter(
      (c: any) => c.Item !== mfCompanyId
    );

    const properties = [
      {
        PropertyDef: MFIDs.Prop.Companies,
        TypedValue: { DataType: 10, Lookups: updatedCompanies },
      },
    ];

    const { data: update } = await this.http.post(
      `objects/${MFIDs.Obj.Contact}/${mfContactId}/latest/properties.aspx`,
      properties,
      { headers: this.authHeaders(token) }
    );

    return update?.ObjVer.ID;
  }

  async getContactsLinkedToCompany(
    token: string,
    mfCompanyId: string
  ): Promise<number[]> {
    const searchConditions = [
      {
        Expression: {
          DataPropertyValuePropertyDef: MFIDs.Prop.Companies,
        },
        ConditionType: 5, // contains
        TypedValue: {
          DataType: 9,
          Lookup: { Item: mfCompanyId },
        },
      },
    ];

    const { data } = await this.http.post(
      `objects/${MFIDs.Obj.Contact}/search.aspx`,
      searchConditions,
      { headers: this.authHeaders(token) }
    );

    return data?.Items?.map((i: any) => i.ObjVer.ID) ?? [];
  }
}

export const mFilesService = new MFilesService();
