#!/usr/bin/env python3
import json
import random
import statistics
import sys
import argparse
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any

from PIL import Image, ImageDraw, ImageFilter, ImageFont

PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import scripts.ocr.patient_identity_ocr as ocr_mod


OUT_ROOT = Path("tmp/ocr-synth")
FONT_PATH = r"C:\Windows\Fonts\BIZ-UDGothicR.ttc"
BOLD_FONT_PATH = r"C:\Windows\Fonts\BIZ-UDGothicB.ttc"
DOC_TYPES = ("insurance_card", "eligibility_certificate")
FIRST_NAMES = ("太郎", "花子", "一郎", "由美", "健司", "美咲", "直人", "恵", "拓海", "彩乃")
LAST_NAMES = ("佐藤", "鈴木", "高橋", "田中", "伊藤", "渡辺", "山本", "中村", "小林", "加藤")
PREF_CITIES = (
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


@dataclass
class Truth:
    document_type: str
    name: str
    address: str | None
    birth: dict[str, str]
    filename: str
    variant: str


def compact_spaces(value: str | None) -> str:
    return " ".join((value or "").replace("\u3000", " ").split())


def normalize_name(value: str | None) -> str:
    return compact_spaces(value).replace(" ", "")


def normalize_address(value: str | None) -> str:
    return compact_spaces(value).replace(" ", "")


def make_canvas() -> Image.Image:
    image = Image.new("RGB", (1200, 760), (241, 243, 246))
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((80, 80, 1120, 680), radius=24, fill=(252, 252, 248), outline=(102, 115, 135), width=4)
    return image


def spaced_label(label: str, mode: str) -> str:
    if mode == "spaced":
        return " ".join(label)
    if mode == "mixed":
        return "  ".join(label[i : i + 1] for i in range(len(label)))
    return label


def distort(image: Image.Image, *, rotate: float, blur_radius: float, noise_strength: int, downscale_ratio: float) -> Image.Image:
    rotated = image.rotate(rotate, resample=Image.Resampling.BICUBIC, expand=True, fillcolor=(241, 243, 246))
    bbox = rotated.getbbox()
    cropped = rotated.crop(bbox) if bbox else rotated
    width, height = cropped.size
    resized = cropped.resize((max(1, int(width * downscale_ratio)), max(1, int(height * downscale_ratio))), Image.Resampling.BILINEAR)
    restored = resized.resize((width, height), Image.Resampling.BILINEAR)
    blurred = restored.filter(ImageFilter.GaussianBlur(radius=blur_radius))
    if noise_strength <= 0:
        return blurred

    noisy = blurred.copy()
    pixels = noisy.load()
    for y in range(noisy.height):
        for x in range(noisy.width):
            r, g, b = pixels[x, y]
            delta = random.randint(-noise_strength, noise_strength)
            pixels[x, y] = (
                max(0, min(255, r + delta)),
                max(0, min(255, g + delta)),
                max(0, min(255, b + delta)),
            )
    return noisy


def birth_to_text(birth: dict[str, str], era_mode: bool) -> str:
    if not era_mode:
        return f"{birth['westernYear']}年{birth['month']}月{birth['day']}日"

    year = int(birth["westernYear"])
    month = int(birth["month"])
    day = int(birth["day"])
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


def draw_case(image: Image.Image, title: str, lines: list[str]) -> Image.Image:
    draw = ImageDraw.Draw(image)
    title_font = ImageFont.truetype(BOLD_FONT_PATH, 38)
    body_font = ImageFont.truetype(FONT_PATH, 28)
    draw.text((140, 135), title, font=title_font, fill=(25, 32, 44))
    y = 220
    for line in lines:
        draw.text((145, y), line, font=body_font, fill=(25, 32, 44))
        y += 62
    return image


def generate_truth(document_type: str, index: int) -> Truth:
    name = f"{LAST_NAMES[index % len(LAST_NAMES)]} {FIRST_NAMES[(index * 3) % len(FIRST_NAMES)]}"
    address = PREF_CITIES[(index * 5) % len(PREF_CITIES)]
    birth = {
        "westernYear": str(1975 + (index % 25)),
        "month": f"{(index % 12) + 1:02d}",
        "day": f"{((index * 2) % 28) + 1:02d}",
    }
    if document_type == "eligibility_certificate" and index % 4 == 0:
        address = None
    return Truth(document_type=document_type, name=name, address=address, birth=birth, filename="", variant="")


def build_lines(truth: Truth, variant: str, index: int) -> tuple[str, list[str]]:
    label_mode = "plain"
    if variant in {"split", "noisy"}:
        label_mode = "spaced"
    if variant == "mixed":
        label_mode = "mixed"

    if truth.document_type == "insurance_card":
        title = spaced_label("健康保険被保険者証", label_mode)
        lines = [
            f"{spaced_label('被保険者氏名', label_mode)}  {truth.name}",
            f"{spaced_label('生年月日', label_mode)}  {birth_to_text(truth.birth, era_mode=index % 2 == 0)}",
        ]
        if truth.address:
            lines.append(f"{spaced_label('住所', label_mode)}  {truth.address}")
        lines.extend(
            [
                f"{spaced_label('記号', label_mode)}  {10 + index}  {spaced_label('番号', label_mode)}  {3000 + index}  {spaced_label('枝番', label_mode)}  {index % 9:02d}",
                f"{spaced_label('保険者番号', label_mode)}  {12000000 + index}",
                f"{spaced_label('保険者名称', label_mode)}  {INSURERS[index % len(INSURERS)]}",
            ]
        )
        return title, lines

    title = spaced_label("健康保険資格確認書", label_mode)
    lines = [
        f"{spaced_label('被保険者（本人）', label_mode)}  令和7年10月1日交付",
        f"{spaced_label('氏名', label_mode)}  {truth.name}",
        f"{spaced_label('生年月日', label_mode)}  {birth_to_text(truth.birth, era_mode=index % 2 == 1)}",
        f"{spaced_label('資格取得年月日', label_mode)}  2024年04月01日",
        f"{spaced_label('保険者番号', label_mode)}  {80000000 + index}",
        f"{spaced_label('保険者名称', label_mode)}  {INSURERS[(index + 1) % len(INSURERS)]}",
    ]
    if truth.address:
        address_label = "住所又は居所" if index % 2 else "保険者所在地"
        lines.append(f"{spaced_label(address_label, label_mode)}  {truth.address}")
    return title, lines


def generate_case(round_dir: Path, document_type: str, index: int) -> Truth:
    truth = generate_truth(document_type, index)
    variants = ("plain", "split", "mixed", "noisy")
    variant = variants[index % len(variants)]
    title, lines = build_lines(truth, variant, index)
    image = make_canvas()
    image = draw_case(image, title, lines)

    distortion = {
        "plain": dict(rotate=0.0, blur_radius=0.0, noise_strength=0, downscale_ratio=1.0),
        "split": dict(rotate=-0.8, blur_radius=0.4, noise_strength=5, downscale_ratio=0.82),
        "mixed": dict(rotate=1.2, blur_radius=0.7, noise_strength=8, downscale_ratio=0.74),
        "noisy": dict(rotate=random.uniform(-2.0, 2.0), blur_radius=1.2, noise_strength=14, downscale_ratio=0.64),
    }[variant]
    image = distort(image, **distortion)

    filename = f"{index:02d}-{document_type}-{variant}.jpg"
    image.save(round_dir / filename, quality=90)
    truth.filename = filename
    truth.variant = variant
    return truth


def run_single_ocr(ocr: Any, image_path: Path, document_type: str) -> dict[str, Any]:
    processed_images = ocr_mod.preprocess_image(image_path, document_type)
    processed_images = processed_images[:1]
    best_payload: dict[str, Any] | None = None
    best_lines: list[str] = []
    best_score = -10**9
    last_error: str | None = None
    for processed in processed_images:
        lines, err = ocr_mod.predict_with_retries(ocr, processed)
        if err:
            last_error = err
        if not lines:
            continue
        payload = ocr_mod.extract_fields_from_lines(lines, document_type)
        score = ocr_mod.score_extracted_payload(payload)
        if score > best_score:
            best_payload = payload
            best_lines = lines
            best_score = score
        if ocr_mod.is_confident_payload(payload):
            return {"payload": payload, "lines": lines, "error": err}
    return {"payload": best_payload, "lines": best_lines, "error": last_error}


def compare_field(document_type: str, field: str, truth: Truth, predicted: dict[str, Any] | None) -> bool:
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


def summarize_round(records: list[dict[str, Any]]) -> dict[str, Any]:
    total = len(records)
    metrics: dict[str, Any] = {"total": total}
    for field in ("name", "address", "birth"):
        correct = sum(1 for record in records if record["matches"][field])
        metrics[field] = {"correct": correct, "accuracy": round(correct / total, 4)}
    metrics["full_match"] = {
        "correct": sum(1 for record in records if all(record["matches"].values())),
        "accuracy": round(sum(1 for record in records if all(record["matches"].values())) / total, 4),
    }
    metrics["score_avg"] = round(statistics.mean(record.get("score", 0) for record in records), 2)
    return metrics


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--rounds", type=int, default=10)
    parser.add_argument("--cases-per-round", type=int, default=20)
    args = parser.parse_args()

    random.seed(42)
    OUT_ROOT.mkdir(parents=True, exist_ok=True)
    ocr = ocr_mod.create_paddle_ocr()
    all_rounds: list[dict[str, Any]] = []

    for round_index in range(1, args.rounds + 1):
        round_dir = OUT_ROOT / f"round-{round_index:02d}"
        round_dir.mkdir(parents=True, exist_ok=True)
        records: list[dict[str, Any]] = []
        truths: list[Truth] = []

        for case_index in range(args.cases_per_round):
            document_type = DOC_TYPES[case_index % len(DOC_TYPES)]
            truth = generate_case(round_dir, document_type, case_index + (round_index - 1) * args.cases_per_round)
            truths.append(truth)

        for truth in truths:
            result = run_single_ocr(ocr, round_dir / truth.filename, truth.document_type)
            payload = result["payload"]
            record = {
                "truth": asdict(truth),
                "predicted": payload,
                "lines": result["lines"],
                "error": result["error"],
                "score": ocr_mod.score_extracted_payload(payload) if payload else None,
                "matches": {
                    "name": compare_field(truth.document_type, "name", truth, payload),
                    "address": compare_field(truth.document_type, "address", truth, payload),
                    "birth": compare_field(truth.document_type, "birth", truth, payload),
                },
            }
            records.append(record)

        summary = summarize_round(records)
        round_payload = {"round": round_index, "summary": summary, "records": records}
        (round_dir / "results.json").write_text(json.dumps(round_payload, ensure_ascii=False, indent=2), encoding="utf-8")
        all_rounds.append({"round": round_index, "summary": summary})
        print(json.dumps({"round": round_index, "summary": summary}, ensure_ascii=False), flush=True)

    (OUT_ROOT / "summary.json").write_text(json.dumps(all_rounds, ensure_ascii=False, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
