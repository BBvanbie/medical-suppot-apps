TRUNCATE TABLE hospital_departments;

WITH dept AS (
  SELECT id, short_name
  FROM medical_departments
),
assignment AS (
  SELECT
    h.id AS hospital_id,
    CASE (h.source_no % 6)
      WHEN 0 THEN ARRAY['救急', '内科', '外科']
      WHEN 1 THEN ARRAY['救急', '循内', '脳外']
      WHEN 2 THEN ARRAY['救急', '整形', 'ICU']
      WHEN 3 THEN ARRAY['救急', '小児', '小児外科']
      WHEN 4 THEN ARRAY['救急', '消内', '内視鏡']
      ELSE ARRAY['救急', '呼内', 'CCUネ']
    END AS department_short_names
  FROM hospitals h
)
INSERT INTO hospital_departments (hospital_id, department_id)
SELECT
  a.hospital_id,
  d.id
FROM assignment a
CROSS JOIN LATERAL unnest(a.department_short_names) AS s(short_name)
JOIN dept d ON d.short_name = s.short_name;
