#!/usr/bin/env python3
import csv
import json
import re
import subprocess
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
HOSPITAL_CSV_PATH = ROOT / "kyukyumeiboR70801.csv"
TEAMS_CSV_PATH = ROOT / "Teams.csv"
ENV_PATH = ROOT / ".env.local"
SQL_PATH = ROOT / "scripts" / "seed_neon.sql"


def read_env_var(key: str) -> str:
    pattern = re.compile(rf"^{re.escape(key)}\s*=\s*\"?(.*?)\"?\s*$")
    for line in ENV_PATH.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or line.startswith("//"):
            continue
        match = pattern.match(line)
        if match:
            return match.group(1)
    return ""


def decode_file(path: Path) -> str:
    raw = path.read_bytes()
    for enc in ("utf-8-sig", "cp932", "utf-8"):
        try:
            return raw.decode(enc)
        except UnicodeDecodeError:
            continue
    raise RuntimeError(f"Could not decode file: {path}")


def read_hospitals() -> list[dict]:
    decoded = decode_file(HOSPITAL_CSV_PATH)
    rows: list[dict] = []
    reader = csv.reader(decoded.splitlines())
    for row in reader:
        if not row or len(row) < 6:
            continue
        no = row[0].strip()
        if not no.isdigit():
            continue
        rows.append(
            {
                "no": int(no),
                "municipality": row[1].strip(),
                "name": row[2].replace("\n", " ").strip(),
                "postal_code": row[3].strip(),
                "address": row[4].strip().lstrip(".． ").strip(),
                "phone": row[5].strip(),
            }
        )
    return rows


def read_teams() -> list[dict]:
    decoded = decode_file(TEAMS_CSV_PATH)
    teams: list[dict] = []
    for idx, line in enumerate(decoded.splitlines(), start=1):
        team_name = line.strip().strip('"')
        if not team_name:
            continue
        division = f"{((len(teams)) % 3) + 1}部"
        teams.append(
            {
                "team_code": f"EMS-{idx:03d}",
                "team_name": team_name,
                "division": division,
            }
        )
    return teams


def geocode_address(
    address: str, municipality: str, cache: dict[str, tuple[float | None, float | None]]
) -> tuple[float | None, float | None]:
    cache_key = f"{municipality}|{address}"
    if cache_key in cache:
        return cache[cache_key]

    lat: float | None = None
    lon: float | None = None
    for q in (address, f"{municipality}{address}"):
        query = urllib.parse.urlencode({"q": q})
        url = f"https://msearch.gsi.go.jp/address-search/AddressSearch?{query}"
        try:
            with urllib.request.urlopen(url, timeout=12) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                if isinstance(data, list) and data:
                    coords = data[0].get("geometry", {}).get("coordinates", [])
                    if isinstance(coords, list) and len(coords) == 2:
                        lon = float(coords[0])
                        lat = float(coords[1])
                        break
        except Exception:
            continue

    cache[cache_key] = (lat, lon)
    time.sleep(0.08)
    return lat, lon


def sql_escape(value: str) -> str:
    return value.replace("'", "''")


def build_sql(hospitals: list[dict], teams: list[dict]) -> str:
    lines: list[str] = []
    lines.append("-- Reset and rebuild tables")
    lines.append("DROP TABLE IF EXISTS cases CASCADE;")
    lines.append("DROP TABLE IF EXISTS hospitals CASCADE;")
    lines.append("DROP TABLE IF EXISTS emergency_teams CASCADE;")
    lines.append("")
    lines.append("CREATE TABLE emergency_teams (")
    lines.append("  id SERIAL PRIMARY KEY,")
    lines.append("  team_code TEXT NOT NULL UNIQUE,")
    lines.append("  team_name TEXT NOT NULL,")
    lines.append("  division TEXT NOT NULL CHECK (division IN ('1部', '2部', '3部')),")
    lines.append("  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()")
    lines.append(");")
    lines.append("")
    lines.append("CREATE TABLE hospitals (")
    lines.append("  id SERIAL PRIMARY KEY,")
    lines.append("  source_no INTEGER NOT NULL UNIQUE,")
    lines.append("  municipality TEXT NOT NULL,")
    lines.append("  name TEXT NOT NULL,")
    lines.append("  postal_code TEXT,")
    lines.append("  address TEXT NOT NULL,")
    lines.append("  phone TEXT,")
    lines.append("  latitude DOUBLE PRECISION,")
    lines.append("  longitude DOUBLE PRECISION,")
    lines.append("  geocoded BOOLEAN NOT NULL DEFAULT FALSE,")
    lines.append("  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()")
    lines.append(");")
    lines.append("")
    lines.append("CREATE TABLE cases (")
    lines.append("  id SERIAL PRIMARY KEY,")
    lines.append("  case_id TEXT NOT NULL UNIQUE,")
    lines.append("  division TEXT NOT NULL CHECK (division IN ('1部', '2部', '3部')),")
    lines.append("  aware_date TEXT NOT NULL,")
    lines.append("  aware_time TEXT NOT NULL,")
    lines.append("  patient_name TEXT NOT NULL,")
    lines.append("  age INTEGER NOT NULL,")
    lines.append("  address TEXT NOT NULL,")
    lines.append("  symptom TEXT,")
    lines.append("  destination TEXT,")
    lines.append("  note TEXT,")
    lines.append("  team_id INTEGER REFERENCES emergency_teams(id),")
    lines.append("  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()")
    lines.append(");")
    lines.append("")

    lines.append("INSERT INTO emergency_teams (team_code, team_name, division) VALUES")
    lines.append(
        ",\n".join(
            [
                f"  ('{sql_escape(team['team_code'])}', '{sql_escape(team['team_name'])}', '{sql_escape(team['division'])}')"
                for team in teams
            ]
        )
        + ";"
    )
    lines.append("")

    lines.append(
        "INSERT INTO cases (case_id, division, aware_date, aware_time, patient_name, age, address, symptom, destination, note, team_id) VALUES"
    )
    lines.append(
        "  ('C-260225-001', '1部', '2/23', '8:14', '山田 太郎', 74, '世田谷区三軒茶屋2-5-1', '胸痛', '都立広域医療センター', '現場で酸素投与を開始。', 1),"
    )
    lines.append(
        "  ('C-260225-002', '2部', '2/23', '9:42', '佐藤 花子', 63, '大田区蒲田4-10-6', '呼吸困難', '蒲田総合病院', '家族へ現場で説明済み。', 2),"
    )
    lines.append(
        "  ('C-260225-003', '3部', '2/23', '11:07', '伊藤 健', 58, '品川区南大井6-18-3', 'めまい', NULL, '搬送中バイタル安定。', 3);"
    )
    lines.append("")

    lines.append(
        "INSERT INTO hospitals (source_no, municipality, name, postal_code, address, phone, latitude, longitude, geocoded) VALUES"
    )
    hospital_values = []
    for h in hospitals:
        lat = "NULL" if h["latitude"] is None else f"{h['latitude']:.8f}"
        lon = "NULL" if h["longitude"] is None else f"{h['longitude']:.8f}"
        geocoded = "TRUE" if h["latitude"] is not None and h["longitude"] is not None else "FALSE"
        hospital_values.append(
            "  ({no}, '{municipality}', '{name}', '{postal}', '{address}', '{phone}', {lat}, {lon}, {geocoded})".format(
                no=h["no"],
                municipality=sql_escape(h["municipality"]),
                name=sql_escape(h["name"]),
                postal=sql_escape(h["postal_code"]),
                address=sql_escape(h["address"]),
                phone=sql_escape(h["phone"]),
                lat=lat,
                lon=lon,
                geocoded=geocoded,
            )
        )
    lines.append(",\n".join(hospital_values) + ";")
    lines.append("")
    return "\n".join(lines)


def run_sql_execute() -> None:
    cmd = ["node", "scripts/execute_sql.js", str(SQL_PATH)]
    subprocess.run(cmd, cwd=str(ROOT), check=True)


def main() -> int:
    database_url = read_env_var("DATABASE_URL")
    if not database_url:
        print("DATABASE_URL not found in .env.local", file=sys.stderr)
        return 1

    hospitals = read_hospitals()
    if not hospitals:
        print("No hospital rows found in CSV.", file=sys.stderr)
        return 1

    teams = read_teams()
    if not teams:
        print("No team rows found in Teams.csv.", file=sys.stderr)
        return 1

    cache: dict[str, tuple[float | None, float | None]] = {}
    geocoded_count = 0
    for idx, row in enumerate(hospitals, start=1):
        lat, lon = geocode_address(row["address"], row["municipality"], cache)
        row["latitude"] = lat
        row["longitude"] = lon
        if lat is not None and lon is not None:
            geocoded_count += 1
        if idx % 25 == 0:
            print(f"Geocoding progress: {idx}/{len(hospitals)}")

    SQL_PATH.write_text(build_sql(hospitals, teams), encoding="utf-8")
    run_sql_execute()

    print(f"Hospitals loaded: {len(hospitals)}")
    print(f"Hospitals geocoded: {geocoded_count}")
    print(f"Emergency teams loaded: {len(teams)}")
    print("Cases loaded: 3")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
