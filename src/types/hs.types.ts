export type HubspotFile = {
  id: string;
  url: string;
  name: string;
  size: number;
  type: string; // type générique : 'document', 'image', etc.
  extension: string;
  sourceGroup?: string; // groupe du fichier : CONTENT, CRM_ATTACHMENTS...
  createdAt?: string;
  updatedAt?: string;
};

type File = {
  id: string;
  url: string;
  name: string;
  size: number;
  type: string;
};

export type Files = File[];
