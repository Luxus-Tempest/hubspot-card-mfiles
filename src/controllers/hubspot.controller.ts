import { hsService } from "../services/hubspot.service";

class HsFilesController {
  getAllFiles = async (req, res, next) => {
    try {
      const files = await hsService.getAllFiles();
      res.json(files);
    } catch (error) {
      next(error);
    }
  };

  getCompanyById = async (req, res, next) => {
    try {
      const ID = req.params.companyID;
      const company = await hsService.getCompanyById(ID);
      res.json(company);
    } catch (error) {
      next(error);
    }
  };
  getSynchronizedCompanyById = async (req, res, next) => {
    try {
      const ID = req.params.companyID;
      const company = await hsService.getSynchronizedCompanyById(ID);
      res.json(company);
    } catch (error) {
      next(error);
    }
  };

  updateCompany = async (req, res, next) => {
    try {
      const companyId = req.params.companyID;
      const { files } = req.body;
      const company = await hsService.updateCompany(
        companyId,
        JSON.stringify(files)
      );
      res.json(company);
    } catch (error) {
      next(error);
    }
  };

  syncCompanyFilesWithFilesManger = async (req, res, next) => {
    try {
      const companyId = req.params.companyID;
      const company =
        await hsService.syncCompanyFilesWithFilesManger(companyId);
      res.json(company);
    } catch (error) {
      next(error);
    }
  };

  synchronizeCompany = async (req, res, next) => {
    const mfToken = req.query.mfToken;
    try {
      const companyId = req.params.companyID;
      const company = await hsService.synchronizeCompany(companyId, mfToken);
      res.json(company);
    } catch (error) {
      next(error);
    }
  };
}

export const hsFilesController = new HsFilesController();
