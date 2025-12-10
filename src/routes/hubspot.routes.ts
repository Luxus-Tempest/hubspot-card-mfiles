import axios from "axios";
import { Router } from "express";
import { hsFilesController } from "../controllers/hubspot.controller";

const router = Router();

router.get("/api/files", async (req, res) => {
  try {
    const accessToken = process.env.HUBSPOT_PRIVATE_APP_TOKEN;

    if (!accessToken) {
      return res.status(500).json({
        success: false,
        error: "HUBSPOT_PRIVATE_APP_TOKEN not configured",
      });
    }

    let allFiles = [];
    let hasMore = true;
    let after = undefined;
    const limit = 100;

    // Pagination pour récupérer tous les fichiers
    while (hasMore) {
      try {
        // Construire l'URL avec pagination
        let url = `https://api.hubapi.com/files/v3/files/search?limit=${limit}`;
        if (after) {
          url += `&after=${after}`;
        }

        const response = await axios.get(url, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        });

        const data = response.data;
        const results = data.results || [];

        allFiles = [...allFiles, ...results];

        // Vérifier s'il y a plus de résultats
        if (data.paging?.next?.after) {
          after = data.paging.next.after;
        } else {
          hasMore = false;
        }
      } catch (paginationError) {
        console.error("Erreur lors de la pagination:", paginationError.message);
        hasMore = false;
      }
    }

    res.json({
      success: true,
      data: allFiles,
      total: allFiles.length,
    });
  } catch (error) {
    console.error(
      "Erreur lors de la récupération des fichiers:",
      error.message
    );
    res.status(500).json({
      success: false,
      error: error.message || "Erreur lors de la récupération des fichiers",
    });
  }
});

router.get("/files", hsFilesController.getAllFiles);
// router.get("/company/:companyID", hsFilesController.getCompanyById);
router.get("/company/:companyID", hsFilesController.getSynchronizedCompanyById);
router.put("/company/:companyID", hsFilesController.updateCompany);

/**
 * Simuler une synchro au cas un fichier est supprimé dans Files manager, il doit l'être aussi dans le l'association
 */
router.use(
  "/sync-company-files/:companyID",
  hsFilesController.syncCompanyFilesWithFilesManger
);

export default router;
