export const testUsers = {
  emsA: {
    username: "e2e_ems_a",
    password: "Passw0rd!",
  },
  emsB: {
    username: "e2e_ems_b",
    password: "Passw0rd!",
  },
  dispatch: {
    username: "e2e_dispatch",
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
  hospitalB: {
    username: "e2e_hospital_b",
    password: "Passw0rd!",
  },
} as const;

export const testCases = {
  teamAVisible: "E2E-CASE-EMS-A",
  teamAVisibleUid: "case-e2e-ems-a",
  teamBHidden: "E2E-CASE-EMS-B",
  teamBHiddenUid: "case-e2e-ems-b",
} as const;

export const testHospitals = {
  hospitalA: "E2E 中央病院",
  hospitalB: "E2E 西病院",
} as const;

export const testTeams = {
  teamA: {
    code: "E2E-TEAM-A",
    name: "E2E 本部機動第1",
  },
  teamB: {
    code: "E2E-TEAM-B",
    name: "E2E 本部機動第2",
  },
} as const;
