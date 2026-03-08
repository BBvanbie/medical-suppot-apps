export const testUsers = {
  emsA: {
    username: "e2e_ems_a",
    password: "Passw0rd!",
  },
  admin: {
    username: "e2e_admin",
    password: "Passw0rd!",
  },
  hospitalA: {
    username: "e2e_hospital_a",
    password: "Passw0rd!",
  },
} as const;

export const testCases = {
  teamAVisible: "E2E-CASE-EMS-A",
  teamBHidden: "E2E-CASE-EMS-B",
} as const;

export const testHospitals = {
  hospitalA: "E2E 中央病院",
  hospitalB: "E2E 西病院",
} as const;
