CREATE TABLE IF NOT EXISTS medical_departments (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  short_name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hospital_departments (
  hospital_id INTEGER NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  department_id INTEGER NOT NULL REFERENCES medical_departments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (hospital_id, department_id)
);

INSERT INTO medical_departments (name, short_name) VALUES
  ('救急科', '救急'),
  ('内科', '内科'),
  ('循環器内科', '循内'),
  ('呼吸器内科', '呼内'),
  ('消化器内科', '消内'),
  ('神経内科', '神経内科'),
  ('外科', '外科'),
  ('整形外科', '整形'),
  ('脳神経外科', '脳外'),
  ('形成外科', '形成'),
  ('心臓血管外科', '心血外科'),
  ('口腔外科', '口腔外科'),
  ('泌尿器科', '泌尿器'),
  ('皮膚科', '皮膚'),
  ('肛門科', '肛門'),
  ('脳卒中S', '脳S'),
  ('脳卒中A', '脳A'),
  ('脳卒中B', '脳B'),
  ('小児科', '小児'),
  ('小児外科', '小児外科'),
  ('新生児科', '新生児'),
  ('婦人科', '婦人'),
  ('産科', '産科'),
  ('眼科', '眼科'),
  ('耳鼻咽喉科', '耳鼻科'),
  ('精神科（心療内科）', '精神'),
  ('救命', '救命'),
  ('大動脈ネットワーク', '大動脈ネ'),
  ('CCUネットワーク', 'CCUネ'),
  ('熱傷ネットワーク', '熱傷ネ'),
  ('ICU', 'ICU'),
  ('MFICU', 'MFICU'),
  ('NICU', 'NICU'),
  ('GCU', 'GCU'),
  ('消化器内視鏡', '内視鏡'),
  ('透析', '透析'),
  ('結核', '結核'),
  ('DMAT', 'DMAT')
ON CONFLICT (name) DO UPDATE
SET short_name = EXCLUDED.short_name;
