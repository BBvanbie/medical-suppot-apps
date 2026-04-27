#!/usr/bin/env python3
import argparse
import json
import random
import statistics
import subprocess
import sys
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any

from PIL import Image, ImageDraw, ImageFilter, ImageFont

PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))
OCR_VENV_PYTHON = PROJECT_ROOT / ".venv-ocr" / "Scripts" / "python.exe"

import scripts.ocr.patient_identity_ocr as ocr_mod


OUT_ROOT = Path("tmp/ocr-cycle-runs")
FONT_PATH = Path(r"C:\Windows\Fonts\BIZ-UDGothicR.ttc")
BOLD_FONT_PATH = Path(r"C:\Windows\Fonts\BIZ-UDGothicB.ttc")
DOC_TYPES = ("drivers_license", "my_number_card", "insurance_card", "eligibility_certificate")
VARIANTS = ("plain", "spaced", "mixed", "noisy", "angled")
FIRST_NAMES = ("太郎", "花子", "一郎", "由美", "健司", "美咲", "直人", "恵", "拓海", "彩乃")
LAST_NAMES = ("佐藤", "鈴木", "高橋", "田中", "伊藤", "渡辺", "山本", "中村", "小林", "加藤")
ADDRESSES = (
    "東京都港区芝公園4-2-8",
    "東京都新宿区西新宿2-8-1",
    "東京都千代田区丸の内1-1-1",
    "東京都三鷹市下連雀4丁目15番28号 下連雀寮",
    "東京都立川市羽衣町1-5-11 エミ・アミティI立川羽衣102",
    "神奈川県横浜市中区本町6-50-10",
    "埼玉県さいたま市大宮区桜木町1-7-5",
    "千葉県千葉市美浜区中瀬1-3",
)
INSURERS = ("○○健康保険組合", "東京電子健保", "都民健保組合", "協会けんぽ", "北関東健康保険組合")
PUBLIC_SAFETY = ("東京都公安委員会", "神奈川県公安委員会", "千葉県公安委員会", "埼玉県公安委員会")


@dataclass
class Truth:
    document_type: str
    filename: str
    variant: str
    name: str
    address: str | None
    birth: dict[str, str]


def compact_spaces(value: str | None) -> str:
    return " ".join((value or "").replace("\u3000", " ").split())


def normalize_name(value: str | None) -> str:
    return compact_spaces(value).replace(" ", "")


def normalize_address(value: str | None) -> str:
    return compact_spaces(value).replace(" ", "")


def make_truth(document_type: str, seed_index: int) -> Truth:
    name = f"{LAST_NAMES[seed_index % len(LAST_NAMES)]} {FIRST_NAMES[(seed_index * 3) % len(FIRST_NAMES)]}"
    address = ADDRESSES[(seed_index * 5) % len(ADDRESSES)]
    if document_type == "eligibility_certificate" and seed_index % 4 == 0:
        address = None

    birth = {
        "westernYear": str(1975 + (seed_index % 25)),
        "month": f"{(seed_index % 12) + 1:02d}",
        "day": f"{((seed_index * 2) % 28) + 1:02d}",
    }
    return Truth(
        document_type=document_type,
        filename="",
        variant="",
        name=name,
        address=address,
        birth=birth,
    )


def make_canvas() -> Image.Image:
    image = Image.new("RGB", (980, 620), (240, 243, 246))
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((60, 60, 920, 560), radius=22, fill=(253, 253, 250), outline=(93, 108, 130), width=3)
    draw.rounded_rectangle((84, 84, 896, 136), radius=16, fill=(229, 236, 245))
    return image


def apply_label_style(label: str, variant: str) -> str:
    if variant == "spaced":
        return " ".join(label)
    if variant == "mixed":
        return "  ".join(label[i : i + 1] for i in range(len(label)))
    return label


def to_era_text(birth: dict[str, str], prefer_era: bool) -> str:
    year = int(birth["westernYear"])
    month = int(birth["month"])
    day = int(birth["day"])
    if not prefer_era:
        return f"{year}年{month}月{day}日"
    if year >= 2019:
        era = "令和"
        era_year = year - 2018
    elif year >= 1989:
        era = "平成"
        era_year = year - 1988
    else:
        era = "昭和"
        era_year = year - 1925
    return f"{era}{era_year}年{month}月{day}日"


def build_document_lines(truth: Truth, variant: str, seed_index: int) -> tuple[str, list[str]]:
    label = lambda text: apply_label_style(text, variant)
    title = {
        "drivers_license": "運転免許証 OCR TRAINING SAMPLE",
        "my_number_card": "マイナンバーカード OCR TRAINING SAMPLE",
        "insurance_card": "健康保険証 OCR TRAINING SAMPLE",
        "eligibility_certificate": "資格確認書 OCR TRAINING SAMPLE",
    }[truth.document_type]

    if truth.document_type == "drivers_license":
        lines = [
            f"{label('氏名')}  {truth.name}  {to_era_text(truth.birth, True)}生",
            f"{label('住所')}  {truth.address}",
            f"{label('交付')}  令和6年6月4日",
            f"{label('有効')}  2029年4月29日まで有効",
        ]
        return title, lines

    if truth.document_type == "my_number_card":
        lines = [
            f"{label('氏名')}  {truth.name}",
            f"{label('住所')}  {truth.address}",
            f"{label('生年月日')}  {to_era_text(truth.birth, True)}生",
            f"{label('有効')}  2031年3月29日まで有効",
        ]
        return title, lines

    if truth.document_type == "insurance_card":
        lines = [
            f"{label('被保険者氏名')}  {truth.name}",
            f"{label('生年月日')}  {to_era_text(truth.birth, seed_index % 2 == 0)}",
            f"{label('住所')}  {truth.address}",
            f"{label('保険者番号')}  {12000000 + seed_index}",
        ]
        return title, lines

    lines = [
        f"{label('被保険者（本人）')}  令和7年10月1日交付",
        f"{label('氏名')}  {truth.name}",
        f"{label('生年月日')}  {to_era_text(truth.birth, seed_index % 2 == 1)}",
        f"{label('保険者番号')}  {80000000 + seed_index}",
    ]
    if truth.address:
        address_label = "住所又は居所" if seed_index % 2 else "被保険者住所"
        lines.append(f"{label(address_label)}  {truth.address}")
    return title, lines


def draw_document(title: str, lines: list[str], variant: str) -> Image.Image:
    image = make_canvas()
    draw = ImageDraw.Draw(image)
    title_font = ImageFont.truetype(str(BOLD_FONT_PATH), 24)
    body_font = ImageFont.truetype(str(FONT_PATH), 22)
    note_font = ImageFont.truetype(str(FONT_PATH), 16)

    draw.text((110, 99), title, font=title_font, fill=(25, 34, 48))
    draw.text((730, 101), "SYNTHETIC", font=note_font, fill=(146, 64, 64))
    draw.text((735, 123), "OCR TEST", font=note_font, fill=(146, 64, 64))

    y = 178
    for index, line in enumerate(lines):
        if variant == "mixed" and index % 2 == 1:
            x = 126
        elif variant == "angled" and index % 3 == 0:
            x = 142
        else:
            x = 118
        draw.text((x, y), line, font=body_font, fill=(25, 34, 48))
        y += 54
    return image


def distort_image(image: Image.Image, variant: str, seed: int) -> Image.Image:
    random.seed(seed)
    settings = {
        "plain": dict(rotate=0.0, blur=0.0, noise=0, downscale=1.0),
        "spaced": dict(rotate=-0.8, blur=0.4, noise=4, downscale=0.84),
        "mixed": dict(rotate=1.1, blur=0.8, noise=8, downscale=0.76),
        "noisy": dict(rotate=random.uniform(-1.6, 1.6), blur=1.2, noise=14, downscale=0.66),
        "angled": dict(rotate=random.uniform(-2.4, 2.4), blur=0.7, noise=9, downscale=0.71),
    }[variant]

    rotated = image.rotate(
        settings["rotate"],
        resample=Image.Resampling.BICUBIC,
        expand=True,
        fillcolor=(233, 237, 243),
    )
    bbox = rotated.getbbox()
    cropped = rotated.crop(bbox) if bbox else rotated
    width, height = cropped.size
    resized = cropped.resize(
        (max(1, int(width * settings["downscale"])), max(1, int(height * settings["downscale"]))),
        Image.Resampling.BILINEAR,
    )
    restored = resized.resize((width, height), Image.Resampling.BILINEAR)
    blurred = restored.filter(ImageFilter.GaussianBlur(radius=settings["blur"]))
    if settings["noise"] <= 0:
        return blurred

    noisy = blurred.copy()
    pixels = noisy.load()
    for y in range(noisy.height):
        for x in range(noisy.width):
            r, g, b = pixels[x, y]
            delta = random.randint(-settings["noise"], settings["noise"])
            pixels[x, y] = (
                max(0, min(255, r + delta)),
                max(0, min(255, g + delta)),
                max(0, min(255, b + delta)),
            )
    return noisy


def save_truth_image(round_dir: Path, truth: Truth, seed_index: int) -> Truth:
    variant = VARIANTS[seed_index % len(VARIANTS)]
    title, lines = build_document_lines(truth, variant, seed_index)
    image = draw_document(title, lines, variant)
    image = distort_image(image, variant, seed_index)
    filename = f"{seed_index:03d}-{truth.document_type}-{variant}.jpg"
    image.save(round_dir / filename, quality=90)
    truth.filename = filename
    truth.variant = variant
    print(json.dumps({"stage": "generated", "file": filename, "documentType": truth.document_type, "variant": variant}, ensure_ascii=False), flush=True)
    return truth


def run_single_ocr(image_path: Path, document_type: str, timeout_seconds: int = 20) -> dict[str, Any]:
    python_executable = str(OCR_VENV_PYTHON if OCR_VENV_PYTHON.exists() else Path(sys.executable))
    command = [
        python_executable,
        str(PROJECT_ROOT / "scripts" / "ocr" / "patient_identity_ocr.py"),
        "--document-type",
        document_type,
        "--image",
        str(image_path),
    ]
    env = dict(**__import__("os").environ)
    env["PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK"] = "True"
    try:
        completed = subprocess.run(
            command,
            cwd=PROJECT_ROOT,
            env=env,
            capture_output=True,
            text=True,
            encoding="utf-8",
            timeout=timeout_seconds,
            check=False,
        )
    except subprocess.TimeoutExpired:
        return {"payload": None, "lines": [], "error": f"timeout>{timeout_seconds}s", "score": None}

    stdout = (completed.stdout or "").strip().splitlines()
    stderr = (completed.stderr or "").strip()
    payload: dict[str, Any] | None = None
    for line in reversed(stdout):
        line = line.strip()
        if not line.startswith("{"):
            continue
        try:
            payload = json.loads(line)
            break
        except json.JSONDecodeError:
            continue

    if not payload:
        return {"payload": None, "lines": [], "error": stderr or f"exit={completed.returncode}", "score": None}

    lines = payload.get("debugLines") or []
    score = ocr_mod.score_extracted_payload(payload) if payload.get("ok") else None
    error = None if payload.get("ok") else (payload.get("message") or stderr or f"exit={completed.returncode}")
    return {"payload": payload, "lines": lines, "error": error, "score": score}


def compare_field(field: str, truth: Truth, predicted: dict[str, Any] | None) -> bool:
    if predicted is None:
        return False
    fields = predicted.get("fields", {})
    if field == "name":
        return normalize_name(fields.get("name")) == normalize_name(truth.name)
    if field == "address":
        return normalize_address(fields.get("address")) == normalize_address(truth.address)
    if field == "birth":
        return fields.get("birth") == truth.birth
    raise ValueError(field)


def summarize_records(records: list[dict[str, Any]]) -> dict[str, Any]:
    summary: dict[str, Any] = {"total": len(records), "byDocumentType": {}}
    score_values = [record["score"] for record in records if isinstance(record["score"], (int, float))]
    summary["scoreAvg"] = round(statistics.mean(score_values), 2) if score_values else None

    for document_type in DOC_TYPES:
        typed_records = [record for record in records if record["truth"]["document_type"] == document_type]
        if not typed_records:
            continue
        summary["byDocumentType"][document_type] = {
            "total": len(typed_records),
            "nameAccuracy": round(sum(1 for record in typed_records if record["matches"]["name"]) / len(typed_records), 4),
            "addressAccuracy": round(sum(1 for record in typed_records if record["matches"]["address"]) / len(typed_records), 4),
            "birthAccuracy": round(sum(1 for record in typed_records if record["matches"]["birth"]) / len(typed_records), 4),
            "fullMatchAccuracy": round(sum(1 for record in typed_records if all(record["matches"].values())) / len(typed_records), 4),
        }

    summary["fullMatchAccuracy"] = round(sum(1 for record in records if all(record["matches"].values())) / len(records), 4)
    summary["nameAccuracy"] = round(sum(1 for record in records if record["matches"]["name"]) / len(records), 4)
    summary["addressAccuracy"] = round(sum(1 for record in records if record["matches"]["address"]) / len(records), 4)
    summary["birthAccuracy"] = round(sum(1 for record in records if record["matches"]["birth"]) / len(records), 4)
    return summary


def build_round_markdown(round_index: int, summary: dict[str, Any], records: list[dict[str, Any]]) -> str:
    failing_records = [record for record in records if not all(record["matches"].values())]
    lines = [
        f"# OCR synthetic cycle {round_index:02d}",
        "",
        "## conclusion",
        "",
        f"- total: {summary['total']}",
        f"- full match accuracy: {summary['fullMatchAccuracy']:.4f}",
        f"- name accuracy: {summary['nameAccuracy']:.4f}",
        f"- address accuracy: {summary['addressAccuracy']:.4f}",
        f"- birth accuracy: {summary['birthAccuracy']:.4f}",
        "",
        "## per document",
        "",
    ]

    for document_type in DOC_TYPES:
        typed = summary["byDocumentType"][document_type]
        lines.extend(
            [
                f"### {document_type}",
                "",
                f"- total: {typed['total']}",
                f"- full match accuracy: {typed['fullMatchAccuracy']:.4f}",
                f"- name accuracy: {typed['nameAccuracy']:.4f}",
                f"- address accuracy: {typed['addressAccuracy']:.4f}",
                f"- birth accuracy: {typed['birthAccuracy']:.4f}",
                "",
            ]
        )

    lines.extend(["## failures", ""])
    if not failing_records:
        lines.append("- no failures")
        return "\n".join(lines) + "\n"

    for record in failing_records[:8]:
        truth = record["truth"]
        predicted = (record["predicted"] or {}).get("fields", {})
        lines.extend(
            [
                f"- {truth['filename']} / {truth['document_type']} / {truth['variant']}",
                f"  truth: name={truth['name']} address={truth['address']} birth={truth['birth']}",
                f"  predicted: name={predicted.get('name')} address={predicted.get('address')} birth={predicted.get('birth')}",
                f"  matches: {record['matches']}",
                f"  error: {record['error']}",
            ]
        )
    return "\n".join(lines) + "\n"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--rounds", type=int, default=10)
    parser.add_argument("--cases-per-document", type=int, default=10)
    parser.add_argument("--output-root", default=str(OUT_ROOT))
    args = parser.parse_args()

    if not FONT_PATH.exists() or not BOLD_FONT_PATH.exists():
        raise RuntimeError("Required Japanese fonts were not found in C:\\Windows\\Fonts.")

    output_root = Path(args.output_root)
    output_root.mkdir(parents=True, exist_ok=True)
    random.seed(42)
    all_rounds: list[dict[str, Any]] = []

    for round_index in range(1, args.rounds + 1):
        round_dir = output_root / f"cycle-{round_index:02d}"
        round_dir.mkdir(parents=True, exist_ok=True)
        truths: list[Truth] = []
        records: list[dict[str, Any]] = []

        for document_type in DOC_TYPES:
            for case_index in range(args.cases_per_document):
                seed_index = ((round_index - 1) * len(DOC_TYPES) * args.cases_per_document) + (DOC_TYPES.index(document_type) * args.cases_per_document) + case_index
                truth = make_truth(document_type, seed_index)
                truths.append(save_truth_image(round_dir, truth, seed_index))

        for truth in truths:
            result = run_single_ocr(round_dir / truth.filename, truth.document_type)
            payload = result["payload"]
            record = {
                "truth": asdict(truth),
                "predicted": payload,
                "lines": result["lines"],
                "error": result["error"],
                "score": result["score"],
                "matches": {
                    "name": compare_field("name", truth, payload),
                    "address": compare_field("address", truth, payload),
                    "birth": compare_field("birth", truth, payload),
                },
            }
            records.append(record)
            print(
                json.dumps(
                    {
                        "stage": "ocr-complete",
                        "file": truth.filename,
                        "documentType": truth.document_type,
                        "matches": record["matches"],
                        "score": record["score"],
                        "error": record["error"],
                    },
                    ensure_ascii=False,
                ),
                flush=True,
            )

        summary = summarize_records(records)
        round_payload = {"round": round_index, "summary": summary, "records": records}
        (round_dir / "results.json").write_text(json.dumps(round_payload, ensure_ascii=False, indent=2), encoding="utf-8")
        (round_dir / "report.md").write_text(build_round_markdown(round_index, summary, records), encoding="utf-8")
        all_rounds.append({"round": round_index, "summary": summary})
        print(json.dumps({"round": round_index, "summary": summary}, ensure_ascii=False), flush=True)

    (output_root / "summary.json").write_text(json.dumps(all_rounds, ensure_ascii=False, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
