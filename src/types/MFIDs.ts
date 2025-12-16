export const MFIDs = {
  Obj: {
    Contact: 101,
    Company: 102,
    Document: 0,
  },
  Class: {
    Contact: 2,
    Company: 3,
    CompaniesDocs: 4,
    ContactsDocs: 5,
    Document: 1, // Autres documents
  },
  ValueLists: {
    // Pour l'instant vide comme dans ton code C#
    // Type_Identite: 104,
    // Nationnality: 124,
    // Type_Mandat: 125,
    // Type_Taux_Guaranti: 126,
    // Type_Remu: 127,
    // Frequence: 128,
    // Familles_Client: 129,
    // Devises: 130,
    // Bareme: 131,
  },
  // Etape: {
  //   Nouveau: 101,
  // },
  Prop: {
    // Company (Client) + Contact
    nomOuTitre: 0,
    phone: 1029,
    lastName: 1027,
    firstName: 1026,
    adresse: 1035,
    email: 1028,
    domain: 1040,
    hsObjectType: 1039,
    hsObjectId: 1030,
    monoFile: 22,

    // Document Autres
    motCle: 26,

    // Relationship
    Contact: 1038,
    Company: 1037,
    Contacts: 1032,
    Companies: 1034,
  },
};
