import { Client } from "@hubspot/api-client";
import {
  SimplePublicObjectInput,
  SimplePublicObjectWithAssociations,
} from "@hubspot/api-client/lib/codegen/crm/companies";
import dotenv from "dotenv";
import { Files } from "../types/hs.types";
import { mFilesService } from "./mfiles.service";

dotenv.config();

if (!process.env.HUBSPOT_PRIVATE_APP_TOKEN) {
  throw new Error(
    "HUBSPOT_PRIVATE_APP_TOKEN is not defined in your environment variables"
  );
}

const hs = new Client({
  accessToken: process.env.HUBSPOT_PRIVATE_APP_TOKEN,
});

class HsService {
  async getAllFiles() {
    const files = await hs.files.filesApi.doSearch();
    return files;
  }

  async updateCompany(companyId: string, files: string) {
    const filesToStored: SimplePublicObjectInput = {
      properties: { files: files },
    };
    const company = await hs.crm.companies.basicApi.update(
      companyId,
      filesToStored
    );
    return company;
  }

  async syncCompanyFilesWithFilesManger(companyId: string) {
    const company = await this.getCompanyById(companyId);

    if (!company) {
      return { success: false, message: "Company not found" };
    }

    let filesList: Files = [];

    if (company.properties.files) {
      try {
        filesList = JSON.parse(company.properties.files);
      } catch (e) {
        filesList = [];
      }
    }

    // 3. Pull actual files from HubSpot
    const hsFiles = await this.getAllFiles();
    const fileManagerIds = hsFiles.results.map((f: any) => f.id);

    // 4. Keep only files that still exist in HubSpot File Manager
    const filteredFiles = filesList.filter((f) =>
      fileManagerIds.includes(f.id)
    );
    // 5. Save updated list
    return await this.updateCompany(companyId, JSON.stringify(filteredFiles));
  }

  async getCompanyById(id: string) {
    const company = await hs.crm.companies.basicApi.getById(id, ["files"]);
    return company;
  }
  async getSynchronizedCompanyById(id: string) {
    const results = await this.syncCompanyFilesWithFilesManger(id);
    return results;
  }

  async synchronizeCompany(companyId: string, mfToken: string) {
    let company: SimplePublicObjectWithAssociations;

    try {
      company = await hs.crm.companies.basicApi.getById(
        companyId,
        ["name", "domain", "phone", "address"],
        undefined,
        ["0-1"]
      );
      console.log(company);
    } catch (err: any) {
      if (err?.code === 404 || err?.response?.status === 404) {
        return {
          success: false,
          message: "Company not found in HubSpot",
        };
      }

      // Autre erreur HubSpot = vraie erreur
      // throw err;
    }

    if (!company) {
      return { success: false, message: "Company not found" };
    }
    const checkedCompany = await mFilesService.checkIfCompanyExists(
      mfToken,
      company.id
    );

    let mfId: number;

    if (!checkedCompany.exists) {
      mfId = await mFilesService.createCompany(mfToken, company.properties);
    } else {
      mfId = await mFilesService.updateCompany(
        mfToken,
        checkedCompany.mfId!.toString(),
        company.properties
      );
    }

    const mfCompanyId = mfId;

    //hubspot company's contacts ids
    const contactIds =
      company.associations?.contacts?.results
        ?.map((c) => c.id)
        ?.filter((v, i, a) => a.indexOf(v) === i) ?? [];

    if (contactIds.length > 0) {
      for (const hsContactId of contactIds) {
        let contact: SimplePublicObjectWithAssociations;
        try {
          contact = await hs.crm.contacts.basicApi.getById(hsContactId);
        } catch (err) {
          console.log("ERROR : ", err);
        }
        const check = await mFilesService.checkIfContactExists(
          mfToken,
          contact.id
        );
        // return { "check contact : ": check };

        if (!check.exists) {
          await mFilesService.createContact(
            mfToken,
            {
              ...contact.properties,
              hs_object_id: contact.id,
            },
            mfCompanyId
          );
        } else {
          await mFilesService.updateContact(
            mfToken,
            check.mfId!,
            contact.properties,
            mfCompanyId
          );
        }
      }
    }

    return {
      success: true,
      action: checkedCompany.exists ? "updated" : "created",
      mfId,
      linkedContacts: contactIds.length,
    };
  }
}

export const hsService = new HsService();
