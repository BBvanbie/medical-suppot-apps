TRUNCATE TABLE hospital_departments;

INSERT INTO hospital_departments (hospital_id, department_id)
SELECT
  h.id AS hospital_id,
  d.id AS department_id
FROM hospitals h
CROSS JOIN medical_departments d
WHERE MOD((h.source_no * 131 + d.id * 17), 100) < 70;
