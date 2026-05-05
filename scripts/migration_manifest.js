/* eslint-disable @typescript-eslint/no-require-imports */
const path = require("path");

const MIGRATIONS = [
  {
    id: "20260419_0001_setup_auth",
    name: "setup auth tables",
    file: path.join(__dirname, "migrations", "20260419_0001_setup_auth.sql"),
    legacyRecords: [{ fileName: "setup_auth.sql", checksum: "1ebad7ab518d443d4d5b949972ce1e7f6eea1aa78744196d8e4ef6e4b31a82d2" }],
  },
  {
    id: "20260419_0002_setup_admin_management",
    name: "setup admin management tables",
    file: path.join(__dirname, "migrations", "20260419_0002_setup_admin_management.sql"),
    legacyRecords: [
      { fileName: "setup_admin_management.sql", checksum: "fe0afb545b9c5e9b45fedf9a078be3df7a5054d73b97693eb99e1b3480803a8b" },
    ],
  },
  {
    id: "20260419_0003_setup_security_auth",
    name: "setup security auth tables",
    file: path.join(__dirname, "migrations", "20260419_0003_setup_security_auth.sql"),
    legacyRecords: [{ fileName: "setup_security_auth.sql", checksum: "568178c3154ae48fd9a1b4d3fd9b3226cbf3324a50816f0de49e92ae50fb5ba2" }],
  },
  {
    id: "20260419_0004_setup_cases_schema",
    name: "setup cases schema",
    file: path.join(__dirname, "migrations", "20260419_0004_setup_cases_schema.sql"),
    legacyRecords: [{ fileName: "setup_cases_schema.sql", checksum: "4c5ddb92eefb1eed61813a0302862d5bd83302abe8163a3a677409b110a0aaa9" }],
  },
  {
    id: "20260419_0005_setup_hospital_requests",
    name: "setup hospital request schema",
    file: path.join(__dirname, "migrations", "20260419_0005_setup_hospital_requests.sql"),
    legacyRecords: [
      { fileName: "setup_hospital_requests.sql", checksum: "e657584b111d2c113c01f398aae5774e099399aa18805e6015bc24e3d516dd69" },
    ],
  },
  {
    id: "20260419_0006_setup_settings",
    name: "setup settings tables",
    file: path.join(__dirname, "migrations", "20260419_0006_setup_settings.sql"),
    legacyRecords: [{ fileName: "setup_settings.sql", checksum: "c80f7505eacd5e7aa75df0473ffa47eb076469b40e1cabefcffe1d9e698d3145" }],
  },
  {
    id: "20260419_0007_setup_system_monitor",
    name: "setup system monitor tables",
    file: path.join(__dirname, "migrations", "20260419_0007_setup_system_monitor.sql"),
    legacyRecords: [
      { fileName: "setup_system_monitor.sql", checksum: "0479c6de4d82dea5f044332557b75565afec0a9076e954f03044cb87955095f3" },
    ],
  },
  {
    id: "20260419_0008_setup_departments",
    name: "setup departments",
    file: path.join(__dirname, "migrations", "20260419_0008_setup_departments.sql"),
    legacyRecords: [{ fileName: "setup_departments.sql", checksum: "3caa83db6a907bddbe7ceacf7837653ddb4159e470a17e91467c54b1bfee8638" }],
  },
  {
    id: "20260419_0009_hospital_request_fk_hardening",
    name: "harden hospital request foreign keys",
    file: path.join(__dirname, "migration_20260419_0009_hospital_request_fk_hardening.sql"),
  },
  {
    id: "20260419_0010_search_trgm_indexes",
    name: "add trigram indexes for search-heavy case and admin queries",
    file: path.join(__dirname, "migration_20260419_0010_search_trgm_indexes.sql"),
  },
  {
    id: "20260419_0011_short_keyword_prefix_indexes",
    name: "add prefix indexes for short keyword case search",
    file: path.join(__dirname, "migration_20260419_0011_short_keyword_prefix_indexes.sql"),
  },
  {
    id: "20260422_0012_compliance_operation_runs",
    name: "add compliance operation ledger",
    file: path.join(__dirname, "migration_20260422_0012_compliance_operation_runs.sql"),
  },
  {
    id: "20260422_0013_compliance_operation_run_expansion",
    name: "expand compliance operation ledger for scoped retention and evidence",
    file: path.join(__dirname, "migration_20260422_0013_compliance_operation_run_expansion.sql"),
  },
  {
    id: "20260422_0014_compliance_scope_id_rules",
    name: "enforce scope-specific organization id rules for compliance ledger",
    file: path.join(__dirname, "migration_20260422_0014_compliance_scope_id_rules.sql"),
  },
  {
    id: "20260422_0015_compliance_organization_registry",
    name: "add compliance organization registry and source sync",
    file: path.join(__dirname, "migration_20260422_0015_compliance_organization_registry.sql"),
  },
  {
    id: "20260422_0016_compliance_operating_units",
    name: "add compliance operating units and registry-backed scope options",
    file: path.join(__dirname, "migration_20260422_0016_compliance_operating_units.sql"),
  },
  {
    id: "20260422_0017_ems_operational_mode",
    name: "add EMS operational mode setting",
    file: path.join(__dirname, "migration_20260422_0017_ems_operational_mode.sql"),
  },
  {
    id: "20260427_0018_triage_dispatch_acceptance",
    name: "add triage dispatch acceptance capacity",
    file: path.join(__dirname, "migration_20260427_0018_triage_dispatch_acceptance.sql"),
  },
  {
    id: "20260427_0019_triage_capacity_constraint",
    name: "tighten triage accepted capacity constraint",
    file: path.join(__dirname, "migration_20260427_0019_triage_capacity_constraint.sql"),
  },
  {
    id: "20260427_0020_mci_triage_incidents",
    name: "add mass casualty triage incident command tables",
    file: path.join(__dirname, "migration_20260427_0020_mci_triage_incidents.sql"),
  },
  {
    id: "20260505_0021_mci_triage_p0_foundations",
    name: "add mass casualty triage P0 safety foundations",
    file: path.join(__dirname, "migration_20260505_0021_mci_triage_p0_foundations.sql"),
  },
];

module.exports = {
  MIGRATIONS,
};
