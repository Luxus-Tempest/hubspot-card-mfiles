type CompanyAssociation = {
    id: string;
    type: string;
  };
  
  type CompanyAssociations = {
    contacts: {
      results: CompanyAssociation[];
    };
  };
  
  type CompanyProperties = {
    address: string | null;
    createdate: string;
    domain: string;
    hs_lastmodifieddate: string;
    hs_object_id: string;
    name: string;
    phone: string | null;
  };
  
  type Company = {
    associations: CompanyAssociations;
    createdAt: string;
    archived: boolean;
    id: string;
    properties: CompanyProperties;
    updatedAt: string;
  };