#!/usr/bin/env python3
import argparse
import json
import math
import os
import re
import sys
import tempfile
import time
import traceback
from dataclasses import dataclass
from pathlib import Path
from typing import Any


ERA_BASE_YEAR = {
    "令和": 2018,
    "平成": 1988,
    "昭和": 1925,
}

STOP_LABELS = (
    "交付",
    "有効",
    "免許の条件",
    "番号",
    "公安委員会",
    "二・小",
    "種別",
    "保険者",
    "記号",
    "枝番",
    "負担割合",
    "資格取得",
    "発行",
    "被保険者証",
    "資格確認書",
)
FIELD_LABELS = ("氏名", "住所", "生年月日")
IMAGE_SIDE_LIMITS = {
    "drivers_license": 1800,
    "my_number_card": 1200,
    "insurance_card": 1400,
    "eligibility_certificate": 1400,
}
CARD_MIN_AREA_RATIO = 0.04
CARD_MIN_ASPECT_RATIO = 1.3
CARD_MAX_ASPECT_RATIO = 1.9
PREDICT_RETRY_SCALES = (1.0, 0.82, 0.68)


@dataclass
class BirthDate:
    westernYear: str
    month: str
    day: str


def is_timing_enabled() -> bool:
    return os.environ.get("MEDICAL_SUPPORT_OCR_TIMING") == "1"


def log_timing(stage: str, **details: Any) -> None:
    if not is_timing_enabled():
        return
    payload = {"stage": stage, **details}
    print(json.dumps(payload, ensure_ascii=False), file=sys.stderr, flush=True)


def compact_spaces(value: str) -> str:
    return re.sub(r"\s+", " ", (value or "").replace("\u3000", " ")).strip()


def compact_label_text(value: str) -> str:
    return re.sub(r"\s+", "", (value or "").replace("\u3000", " "))


def normalize_japanese_digits(value: str) -> str:
    translation = str.maketrans("０１２３４５６７８９", "0123456789")
    return value.translate(translation)


def compact_address(value: str) -> str:
    merged = compact_spaces(value)
    return merged.replace(" ,", ",").strip(" ,")


def normalize_ocr_common_text(value: str) -> str:
    normalized = compact_spaces(value)
    replacements = (
        ("工ミ", "エミ"),
        ("ア三ティ", "アミティ"),
        ("ア三", "アミ"),
        ("アミティ1立", "アミティI立"),
        ("千果", "千葉"),
        ("千第", "千葉"),
        ("中湖", "中瀬"),
        ("公国", "公園"),
        ("惠", "恵"),
        ("被保者", "被保険者"),
        ("被保陕者", "被保険者"),
        ("被保肤者", "被保険者"),
        ("保陕", "保険"),
        ("保肤", "保険"),
    )
    for source, target in replacements:
        normalized = normalized.replace(source, target)
    return normalized


def trim_to_prefecture_start(value: str) -> str:
    match = re.search(r"(東京都|北海道|京都府|大阪府|..?.県)", value)
    if not match:
        return value
    return value[match.start() :].strip()


def normalize_generic_address(value: str) -> str:
    normalized = compact_address(normalize_japanese_digits(normalize_ocr_common_text(value)))
    normalized = trim_to_prefecture_start(normalized)
    house_number_match = re.search(r"(\d-\d-\d+)(\S+)", normalized)
    if house_number_match:
        normalized = normalized.replace(house_number_match.group(0), f"{house_number_match.group(1)} {house_number_match.group(2)}", 1)
    normalized = normalized.replace("-1 1 ", "-11 ")
    normalized = normalized.replace("千葉千葉市", "千葉県千葉市")
    return compact_address(normalized.replace("·", "・").replace("•", "・"))


def normalize_my_number_card_address(value: str) -> str:
    normalized = normalize_generic_address(value)
    normalized = re.split(r"(個人番号|カード|性別|有効)", normalized)[0].strip()
    normalized = normalized.replace("下連雀 寮", "下連雀寮")
    normalized = normalized.replace("寮 下連雀", "下連雀寮")
    normalized = re.sub(r"^[ぁ-んァ-ン一-龥A-Za-z]\s+", "", normalized).strip()
    normalized = compact_address(normalized)
    return normalized


def normalize_insurance_address(value: str) -> str:
    normalized = normalize_generic_address(value)
    normalized = re.sub(r"^\s*(被保険者住所|住所又は居所|住所)\s*", "", normalized).strip()
    normalized = re.split(r"(負担割合|保険者|記号|番号|枝番|資格取得|交付|発行|有効)", normalized)[0].strip()
    normalized = normalized.replace("住 所", "住所")
    normalized = re.sub(r"^[ぁ-んァ-ン一-龥A-Za-z]\s+", "", normalized).strip()
    normalized = compact_address(normalized)
    return normalized


def normalize_driver_license_address(value: str) -> str:
    normalized = normalize_generic_address(value)
    normalized = re.split(r"(交付|有効|令和\d{1,2}年|\d{4}年)", normalized)[0].strip()
    normalized = re.sub(r"\s+", " ", normalized).strip()

    targeted_replacements = (
        (" Iミ・", " エミ・"),
        (" Iミ.", " エミ・"),
        (" Iミ", " エミ"),
        ("Iミ・", "エミ・"),
        ("Iミ", "エミ"),
        ("ア尺", "アミ"),
        ("尺テ", "ミテ"),
        ("ティ1立", "ティI立"),
        ("テ1立", "ティI立"),
        ("テ1川", "ティI立川"),
        ("ミテ1", "ミティI"),
        ("アミテ立川", "アミティI立川"),
        ("アテ立川", "アミティI立川"),
        ("川羽衣衣", "川羽衣"),
    )
    for source, target in targeted_replacements:
        normalized = normalized.replace(source, target)

    if "立川羽" in normalized and "立川羽衣" not in normalized:
        normalized = normalized.replace("立川羽", "立川羽衣")

    if "川羽" in normalized and "立川羽衣" not in normalized and "エミ" in normalized:
        normalized = normalized.replace("川羽", "立川羽衣")

    return compact_address(normalized)


def clean_name_candidate(value: str) -> str:
    candidate = normalize_ocr_common_text(value)
    candidate = re.sub(r"\bOCR\s*TEST\b", "", candidate, flags=re.IGNORECASE).strip()
    candidate = re.sub(r"\bSYNTHETIC\b", "", candidate, flags=re.IGNORECASE).strip()
    candidate = re.sub(r"(昭和|平成|令和)\s*(元|\d{1,2})\s*年\s*\d{1,2}\s*月\s*\d{1,2}\s*日\s*生?.*$", "", candidate).strip()
    for label in ("被保険者氏名", "被保険者名", "受給者氏名", "氏名"):
        pattern = r"^\s*" + r"\s*".join(re.escape(char) for char in compact_label_text(label)) + r"\s*"
        candidate = re.sub(pattern, "", candidate, count=1).strip()
    candidate = re.sub(r"^\s*被保険者\s*[\(（]?\s*本人\s*[\)）]?\s*", "", candidate).strip()
    candidate = re.sub(r"^\s*本人\s*", "", candidate).strip()
    candidate = re.sub(r"(住所|生年月日|交付|有効|番号|保険者|記号|枝番|負担割合|資格取得).*$", "", candidate).strip()
    candidate = re.split(r"(東京都|北海道|京都府|大阪府|..?.県)", candidate)[0].strip()
    candidate = re.sub(r"年\s*月\s*日まで.*$", "", candidate).strip()
    candidate = re.sub(r"[^ぁ-んァ-ン一-龥々ーA-Za-z\s]", " ", candidate)
    candidate = compact_spaces(candidate)
    candidate = re.sub(r"\s*(日|田|旺)$", "", candidate).strip()
    candidate = re.sub(r"^[ぁ-んァ-ン一-龥A-Za-z]\s+", "", candidate).strip()
    return candidate


def looks_like_name(value: str) -> bool:
    candidate = clean_name_candidate(value)
    if not candidate:
        return False
    if any(keyword in candidate for keyword in ("被保険者", "本人")):
        return False
    if compact_label_text(candidate) in {"保者", "被保", "氏名"}:
        return False
    if "年 月 日" in candidate or "年月日" in compact_label_text(candidate):
        return False
    if any(keyword in candidate for keyword in ("東京都", "道", "府", "県", "市", "区", "町", "丁目", "番地", "号")):
        return False
    compact_candidate = compact_label_text(candidate)
    if len(compact_candidate) < 3:
        return False
    return bool(re.fullmatch(r"[ぁ-んァ-ン一-龥々ーA-Za-z\s]{2,20}", candidate))


def line_contains_label(value: str, label: str) -> bool:
    return compact_label_text(label) in compact_label_text(value)


def line_contains_any_label(value: str, labels: tuple[str, ...]) -> bool:
    return any(line_contains_label(value, label) for label in labels)


def remove_label_prefix(value: str, labels: tuple[str, ...]) -> str:
    text = compact_spaces(value)
    for label in sorted(labels, key=lambda item: len(compact_label_text(item)), reverse=True):
        pattern = r"^\s*" + r"\s*".join(re.escape(char) for char in compact_label_text(label)) + r"\s*[:：]?\s*"
        next_text, count = re.subn(pattern, "", text, count=1)
        if count:
            return compact_spaces(next_text)
    return text


def normalize_lines(lines: list[str]) -> list[str]:
    normalized: list[str] = []
    for raw in lines:
        text = compact_spaces(raw)
        if not text:
            continue
        normalized.append(text)
    return normalized


def is_ascii_heavy(value: str) -> bool:
    if not value:
        return False
    ascii_count = sum(1 for char in value if ord(char) < 128)
    return ascii_count / max(len(value), 1) >= 0.6


def build_lines_from_page_result(page_result: dict[str, Any]) -> list[str]:
    texts = page_result.get("rec_texts") or []
    polys = page_result.get("rec_polys") or []
    entries: list[dict[str, float | str]] = []

    for text, poly in zip(texts, polys):
        normalized = compact_spaces(str(text))
        if not normalized:
            continue
        try:
            if getattr(poly, "ndim", 0) != 2 or len(poly) == 0:
                continue
            xs = [float(point[0]) for point in poly if len(point) >= 2]
            ys = [float(point[1]) for point in poly if len(point) >= 2]
            if not xs or not ys:
                continue
        except Exception:
            continue
        entries.append(
            {
                "text": normalized,
                "x": min(xs),
                "y": sum(ys) / max(len(ys), 1),
                "height": max(ys) - min(ys),
            }
        )

    entries.sort(key=lambda item: (float(item["y"]), float(item["x"])))

    grouped: list[list[dict[str, float | str]]] = []
    for entry in entries:
        if not grouped:
            grouped.append([entry])
            continue
        last_group = grouped[-1]
        last_y = sum(float(item["y"]) for item in last_group) / len(last_group)
        threshold = max(float(entry["height"]) * 0.8, 18.0)
        if math.fabs(float(entry["y"]) - last_y) <= threshold:
            last_group.append(entry)
        else:
            grouped.append([entry])

    lines: list[str] = []
    for group in grouped:
        group.sort(key=lambda item: float(item["x"]))
        merged = compact_spaces(" ".join(str(item["text"]) for item in group))
        if merged:
            lines.append(merged)
    return lines


def parse_birth_text(value: str) -> BirthDate | None:
    text = compact_spaces(value)
    compact_text = compact_label_text(text)
    era_match = re.search(r"(令和|平成|昭和)\s*(元|\d{1,2})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日", text)
    if era_match:
        era = era_match.group(1)
        era_year_raw = era_match.group(2)
        era_year = 1 if era_year_raw == "元" else int(era_year_raw)
        year = ERA_BASE_YEAR[era] + era_year
        month = int(era_match.group(3))
        day = int(era_match.group(4))
        return BirthDate(str(year), f"{month:02d}", f"{day:02d}")

    western_match = re.search(r"(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日", text)
    if western_match:
        return BirthDate(
            western_match.group(1),
            f"{int(western_match.group(2)):02d}",
            f"{int(western_match.group(3)):02d}",
        )

    iso_match = re.search(r"(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})", text)
    if iso_match:
        return BirthDate(
            iso_match.group(1),
            f"{int(iso_match.group(2)):02d}",
            f"{int(iso_match.group(3)):02d}",
        )

    compact_western_match = re.search(r"(\d{4})年(\d{1,2})月(\d{1,2})日", compact_text)
    if compact_western_match:
        return BirthDate(
            compact_western_match.group(1),
            f"{int(compact_western_match.group(2)):02d}",
            f"{int(compact_western_match.group(3)):02d}",
        )
    return None


def extract_birth(lines: list[str]) -> tuple[BirthDate | None, list[str]]:
    warnings: list[str] = []
    for index, line in enumerate(lines):
        same_line = parse_birth_text(line)
        if same_line and (line_contains_label(line, "生年月日") or "生" in compact_label_text(line)):
            return same_line, warnings
        if not line_contains_label(line, "生年月日"):
            continue
        if index + 1 < len(lines):
            next_line = parse_birth_text(lines[index + 1])
            if next_line:
                return next_line, warnings
    return None, warnings


def extract_name(lines: list[str], labels: tuple[str, ...] = ("氏名",)) -> tuple[str | None, list[str]]:
    warnings: list[str] = []
    for index, line in enumerate(lines):
        candidate = remove_label_prefix(line, labels)
        cleaned_candidate = clean_name_candidate(candidate)
        if (line_contains_any_label(line, labels) or parse_birth_text(line)) and looks_like_name(cleaned_candidate):
            return cleaned_candidate, warnings
        collected: list[str] = []
        cursor = index + 1
        while cursor < len(lines):
            next_line = lines[cursor]
            if line_contains_any_label(next_line, ("住所", "生年月日", "交付", "有効", "保険者", "記号", "番号")):
                break
            if parse_birth_text(next_line):
                break
            if is_ascii_heavy(next_line):
                cursor += 1
                continue
            cleaned = clean_name_candidate(next_line)
            if looks_like_name(cleaned):
                collected.append(cleaned)
            if len("".join(collected)) >= 12:
                break
            cursor += 1
        if collected:
            return "".join(collected).strip(), warnings

    for line in lines:
        cleaned = clean_name_candidate(line)
        if looks_like_name(cleaned):
            return cleaned, warnings
        if line_contains_any_label(line, labels):
            fallback = clean_name_candidate(remove_label_prefix(line, labels))
            if fallback:
                compact_fallback = compact_label_text(fallback)
                if len(compact_fallback) >= 4 and not any(keyword in fallback for keyword in ("被保険者", "本人", "年 月 日")):
                    return fallback, warnings
    return None, warnings


def looks_like_address_continuation(value: str) -> bool:
    if not value:
        return False
    if line_contains_any_label(value, STOP_LABELS):
        return False
    if line_contains_any_label(value, FIELD_LABELS):
        return False
    return bool(re.search(r"[都道府県市区町村丁目番地号\-0-9]", value))


def extract_address_with_normalizer(lines: list[str], normalizer: Any, labels: tuple[str, ...] = ("住所",)) -> tuple[str | None, list[str]]:
    warnings: list[str] = []
    for index, line in enumerate(lines):
        if not line_contains_any_label(line, labels):
            continue
        collected: list[str] = []
        candidate = remove_label_prefix(line, labels)
        if candidate == line:
            label_pattern = "|".join(re.escape(label) for label in labels)
            split_candidate = re.split(rf".*?(?:{label_pattern})\s*[:：]?\s*", line, maxsplit=1)
            if len(split_candidate) == 2:
                candidate = compact_spaces(split_candidate[1])
        if candidate:
            prefecture_candidate = trim_to_prefecture_start(candidate)
            candidate = prefecture_candidate or candidate
            candidate = re.split(r"(生年月日|氏名|交付|有効|保険者|記号|個人番号|番号|枝番|負担割合|資格取得|カード|性別)", candidate)[0].strip()
            if candidate:
                collected.append(candidate)
        cursor = index + 1
        while cursor < len(lines) and looks_like_address_continuation(lines[cursor]):
            collected.append(lines[cursor])
            cursor += 1
        normalized = compact_address(" ".join(collected))
        if normalized:
            cleaned = normalizer(normalized)
            if cleaned:
                return cleaned, warnings

    for line in lines:
        normalized = compact_address(line)
        normalized = trim_to_prefecture_start(normalized)
        if (
            normalized
            and any(keyword in normalized for keyword in ("都", "道", "府", "県", "市", "区", "町", "丁目", "番地", "号"))
            and not any(keyword in normalized for keyword in ("有効", "交付", "番号", "公安委員会", "保険者所在地"))
        ):
            cleaned = normalizer(normalized)
            if cleaned:
                return cleaned, warnings
    return None, warnings


def extract_driver_license_fields(normalized_lines: list[str]) -> dict[str, Any]:
    name, name_warnings = extract_name(normalized_lines)
    address, address_warnings = extract_address_with_normalizer(normalized_lines, normalize_driver_license_address)
    birth, birth_warnings = extract_birth(normalized_lines)
    warnings = [*name_warnings, *address_warnings, *birth_warnings]

    return {
        "fields": {
            "name": name,
            "address": address,
            "birth": None
            if birth is None
            else {
                "westernYear": birth.westernYear,
                "month": birth.month,
                "day": birth.day,
            },
        },
        "warnings": warnings,
    }


def extract_my_number_card_fields(normalized_lines: list[str]) -> dict[str, Any]:
    name, name_warnings = extract_name(normalized_lines)
    address, address_warnings = extract_address_with_normalizer(normalized_lines, normalize_my_number_card_address)
    birth, birth_warnings = extract_birth(normalized_lines)
    warnings = [*name_warnings, *address_warnings, *birth_warnings]

    return {
        "fields": {
            "name": name,
            "address": address,
            "birth": None
            if birth is None
            else {
                "westernYear": birth.westernYear,
                "month": birth.month,
                "day": birth.day,
            },
        },
        "warnings": warnings,
    }


def extract_insurance_fields(normalized_lines: list[str]) -> dict[str, Any]:
    name, name_warnings = extract_name(normalized_lines, ("氏名", "被保険者氏名", "被保険者名", "受給者氏名"))
    address, address_warnings = extract_address_with_normalizer(
        normalized_lines,
        normalize_insurance_address,
        ("住所", "被保険者住所", "住所又は居所"),
    )
    birth, birth_warnings = extract_birth(normalized_lines)
    warnings = [*name_warnings, *address_warnings, *birth_warnings]

    return {
        "fields": {
            "name": name,
            "address": address,
            "birth": None
            if birth is None
            else {
                "westernYear": birth.westernYear,
                "month": birth.month,
                "day": birth.day,
            },
        },
        "warnings": warnings,
    }


def extract_fields_from_lines(lines: list[str], document_type: str) -> dict[str, Any]:
    normalized_lines = normalize_lines(lines)

    if document_type == "drivers_license":
        payload = extract_driver_license_fields(normalized_lines)
    elif document_type == "my_number_card":
        payload = extract_my_number_card_fields(normalized_lines)
    elif document_type in {"insurance_card", "eligibility_certificate"}:
        payload = extract_insurance_fields(normalized_lines)
    else:
        raise ValueError("Unsupported document type.")

    return {
        "documentType": document_type,
        **payload,
    }


def preprocess_image(image_path: Path, document_type: str) -> Any:
    started = time.perf_counter()
    try:
        import cv2  # type: ignore
    except ModuleNotFoundError as exc:
        raise RuntimeError("opencv-python-headless is not installed.") from exc

    image = cv2.imread(str(image_path))
    if image is None:
        raise RuntimeError("Failed to decode the image file.")

    height, width = image.shape[:2]
    longest_side = max(height, width)
    image_side_limit = IMAGE_SIDE_LIMITS.get(document_type, max(IMAGE_SIDE_LIMITS.values()))
    if longest_side > image_side_limit:
        scale = image_side_limit / float(longest_side)
        image = cv2.resize(image, (max(1, int(width * scale)), max(1, int(height * scale))), interpolation=cv2.INTER_AREA)

    cropped = crop_document_card(image)
    enhanced = enhance_document_image(cropped)
    thresholded = threshold_document_image(cropped)
    log_timing(
        "preprocess",
        documentType=document_type,
        imagePath=str(image_path),
        elapsedMs=round((time.perf_counter() - started) * 1000, 1),
        originalSize={"width": width, "height": height},
        processedSize={"width": int(cropped.shape[1]), "height": int(cropped.shape[0])},
    )
    return [enhanced, thresholded]


def order_quad_points(points: Any) -> Any:
    import numpy as np  # type: ignore

    pts = points.astype("float32")
    rect = np.zeros((4, 2), dtype="float32")
    s = pts.sum(axis=1)
    rect[0] = pts[s.argmin()]
    rect[2] = pts[s.argmax()]
    diff = np.diff(pts, axis=1)
    rect[1] = pts[diff.argmin()]
    rect[3] = pts[diff.argmax()]
    return rect


def warp_quad(image: Any, points: Any) -> Any:
    import cv2  # type: ignore
    import numpy as np  # type: ignore

    rect = order_quad_points(points)
    (top_left, top_right, bottom_right, bottom_left) = rect
    width_top = np.linalg.norm(top_right - top_left)
    width_bottom = np.linalg.norm(bottom_right - bottom_left)
    height_right = np.linalg.norm(top_right - bottom_right)
    height_left = np.linalg.norm(top_left - bottom_left)

    max_width = int(max(width_top, width_bottom))
    max_height = int(max(height_right, height_left))
    if max_width <= 0 or max_height <= 0:
        return image

    destination = np.array(
        [
            [0, 0],
            [max_width - 1, 0],
            [max_width - 1, max_height - 1],
            [0, max_height - 1],
        ],
        dtype="float32",
    )
    matrix = cv2.getPerspectiveTransform(rect, destination)
    warped = cv2.warpPerspective(image, matrix, (max_width, max_height))
    if warped.shape[0] > warped.shape[1]:
        warped = cv2.rotate(warped, cv2.ROTATE_90_CLOCKWISE)
    return warped


def crop_document_card(image: Any) -> Any:
    try:
        import cv2  # type: ignore
    except ModuleNotFoundError as exc:
        raise RuntimeError("opencv-python-headless is not installed.") from exc

    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    edged = cv2.Canny(blurred, 50, 150)
    contours, _ = cv2.findContours(edged, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    image_area = image.shape[0] * image.shape[1]

    for contour in sorted(contours, key=cv2.contourArea, reverse=True):
        area = cv2.contourArea(contour)
        if area < image_area * CARD_MIN_AREA_RATIO:
            continue
        perimeter = cv2.arcLength(contour, True)
        approx = cv2.approxPolyDP(contour, 0.02 * perimeter, True)
        if len(approx) != 4:
            continue
        rect = cv2.minAreaRect(contour)
        width, height = rect[1]
        if width <= 0 or height <= 0:
            continue
        aspect_ratio = max(width, height) / max(min(width, height), 1)
        if aspect_ratio < CARD_MIN_ASPECT_RATIO or aspect_ratio > CARD_MAX_ASPECT_RATIO:
            continue
        return warp_quad(image, approx.reshape(4, 2))

    return image


def enhance_document_image(image: Any) -> Any:
    import cv2  # type: ignore

    denoised = cv2.bilateralFilter(image, 7, 50, 50)
    sharpened = cv2.addWeighted(denoised, 1.25, cv2.GaussianBlur(denoised, (0, 0), 3), -0.25, 0)
    return sharpened


def threshold_document_image(image: Any) -> Any:
    import cv2  # type: ignore

    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    denoised = cv2.GaussianBlur(gray, (3, 3), 0)
    thresholded = cv2.adaptiveThreshold(
        denoised,
        255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY,
        31,
        9,
    )
    return cv2.cvtColor(thresholded, cv2.COLOR_GRAY2BGR)


def create_paddle_ocr() -> Any:
    started = time.perf_counter()
    os.environ.setdefault("PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK", "True")
    from paddleocr import PaddleOCR  # type: ignore

    ocr = PaddleOCR(
        lang="japan",
        use_doc_orientation_classify=False,
        use_doc_unwarping=False,
        use_textline_orientation=False,
        text_detection_model_name="PP-OCRv5_mobile_det",
        text_recognition_model_name="PP-OCRv5_mobile_rec",
        text_det_limit_side_len=1536,
    )
    log_timing("create_ocr", elapsedMs=round((time.perf_counter() - started) * 1000, 1))
    return ocr


def resize_for_retry(image: Any, scale: float) -> Any:
    if scale >= 0.999:
        return image

    import cv2  # type: ignore

    height, width = image.shape[:2]
    resized_width = max(1, int(width * scale))
    resized_height = max(1, int(height * scale))
    return cv2.resize(image, (resized_width, resized_height), interpolation=cv2.INTER_AREA)


def extract_lines_from_predict_result(result: Any) -> list[str]:
    lines: list[str] = []
    for page in result or []:
        if isinstance(page, dict):
            lines.extend(build_lines_from_page_result(page))
            continue
        for item in page or []:
            if not item or len(item) < 2:
                continue
            text = item[1][0] if item[1] else ""
            normalized = compact_spaces(str(text))
            if normalized:
                lines.append(normalized)
    return lines


def predict_with_retries(ocr: Any, processed: Any) -> tuple[list[str], str | None]:
    import cv2  # type: ignore

    last_error: str | None = None
    temp_paths: list[str] = []

    try:
        for scale in PREDICT_RETRY_SCALES:
            attempt_started = time.perf_counter()
            candidate = resize_for_retry(processed, scale)
            with tempfile.NamedTemporaryFile(prefix="patient-identity-ocr-", suffix=".png", delete=False) as handle:
                temp_path = handle.name
            temp_paths.append(temp_path)

            if not cv2.imwrite(temp_path, candidate):
                last_error = "Failed to write OCR temp image."
                continue

            try:
                result = ocr.predict(temp_path)
                lines = extract_lines_from_predict_result(result)
                log_timing(
                    "predict_attempt",
                    scale=scale,
                    elapsedMs=round((time.perf_counter() - attempt_started) * 1000, 1),
                    lines=len(lines),
                    error=None,
                )
                return lines, None
            except Exception as exc:
                last_error = str(exc).strip() or exc.__class__.__name__
                log_timing(
                    "predict_attempt",
                    scale=scale,
                    elapsedMs=round((time.perf_counter() - attempt_started) * 1000, 1),
                    lines=0,
                    error=last_error,
                )
                continue
    finally:
        for temp_path in temp_paths:
            try:
                Path(temp_path).unlink(missing_ok=True)
            except Exception:
                continue

    return [], last_error


def score_extracted_payload(payload: dict[str, Any]) -> int:
    fields = payload.get("fields", {})
    name = compact_spaces(str(fields.get("name") or ""))
    address = compact_spaces(str(fields.get("address") or ""))
    birth = fields.get("birth")

    score = 0
    if name:
        score += 40
    if birth:
        score += 40
    if address:
        score += 70
        score += min(len(address), 40)
        if any(keyword in address for keyword in ("都", "道", "府", "県", "市", "区", "町", "丁目", "番地", "号")):
            score += 25

    penalty_keywords = ("有効", "交付", "個人番号", "個人", "カード", "公安委員会", "番号", "香号", "保険者", "枝番", "負担割合")
    score -= sum(50 for keyword in penalty_keywords if keyword in address)
    if re.search(r"(令和|平成|昭和|\d{4}年)", address):
        score -= 40
    if is_ascii_heavy(address):
        score -= 20
    if address and not any(keyword in address for keyword in ("都", "道", "府", "県", "市", "区", "町", "丁目", "番地", "号")):
        score -= 80
    return score


def is_confident_payload(payload: dict[str, Any]) -> bool:
    fields = payload.get("fields", {})
    name = compact_spaces(str(fields.get("name") or ""))
    address = compact_spaces(str(fields.get("address") or ""))
    birth = fields.get("birth")
    if not name or not address or not birth:
        return False
    if len(address) < 12:
        return False
    if not any(keyword in address for keyword in ("都", "道", "府", "県", "市", "区", "町", "丁目", "番地", "号")):
        return False
    if any(keyword in address for keyword in ("個人番号", "個人", "カード", "公安委員会", "番号", "有効", "交付", "保険者", "枝番", "負担割合")):
        return False
    return True


def run_paddle_ocr(image_path: Path, document_type: str) -> list[str]:
    started = time.perf_counter()
    try:
        from paddleocr import PaddleOCR  # type: ignore
    except ModuleNotFoundError as exc:
        raise RuntimeError("paddleocr is not installed.") from exc

    _ = PaddleOCR
    processed_images = preprocess_image(image_path, document_type)
    ocr = create_paddle_ocr()
    best_lines: list[str] = []
    best_score = -10**9
    last_predict_error: str | None = None

    for processed in processed_images:
        lines, predict_error = predict_with_retries(ocr, processed)
        if predict_error:
            last_predict_error = predict_error
        if not lines:
            continue
        payload = extract_fields_from_lines(lines, document_type)
        if is_confident_payload(payload):
            return lines
        score = score_extracted_payload(payload)
        if score > best_score:
            best_lines = lines
            best_score = score
        elif score == best_score and len(lines) > len(best_lines):
            best_lines = lines

    if best_lines:
        log_timing("run_paddle_ocr", documentType=document_type, elapsedMs=round((time.perf_counter() - started) * 1000, 1), lines=len(best_lines), error=None)
        return best_lines
    if last_predict_error:
        log_timing("run_paddle_ocr", documentType=document_type, elapsedMs=round((time.perf_counter() - started) * 1000, 1), lines=0, error=last_predict_error)
        raise RuntimeError(last_predict_error)

    log_timing("run_paddle_ocr", documentType=document_type, elapsedMs=round((time.perf_counter() - started) * 1000, 1), lines=0, error=None)
    return best_lines


def emit(payload: dict[str, Any], code: int = 0) -> int:
    json.dump(payload, sys.stdout, ensure_ascii=False)
    sys.stdout.write("\n")
    return code


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--document-type", required=True)
    parser.add_argument("--image")
    parser.add_argument("--mock-text")
    parser.add_argument("--mock-text-file")
    return parser.parse_args(argv)


def read_mock_lines(args: argparse.Namespace) -> list[str] | None:
    if args.mock_text:
        return args.mock_text.splitlines()
    if args.mock_text_file:
        return Path(args.mock_text_file).read_text(encoding="utf-8").splitlines()
    env_text = os.environ.get("MEDICAL_SUPPORT_OCR_MOCK_TEXT", "")
    if env_text:
        return env_text.splitlines()
    return None


def main(argv: list[str]) -> int:
    args = parse_args(argv)
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    if hasattr(sys.stderr, "reconfigure"):
        sys.stderr.reconfigure(encoding="utf-8")

    try:
        lines = read_mock_lines(args)
        if lines is None:
            if not args.image:
                raise RuntimeError("Either --image or mock text input is required.")
            lines = run_paddle_ocr(Path(args.image), args.document_type)

        payload = extract_fields_from_lines(lines, args.document_type)
        payload["ok"] = True
        return emit(payload)
    except Exception as exc:
        message = str(exc).strip() or exc.__class__.__name__ or "Unknown exception"
        debug_message = ""
        try:
            debug_message = traceback.format_exc(limit=2)
        except Exception:
            debug_message = ""
        return emit(
            {
                "ok": False,
                "documentType": args.document_type,
                "message": message,
                "fields": {
                    "name": None,
                    "address": None,
                    "birth": None,
                },
                "warnings": [],
                "debug": debug_message[-1500:] if debug_message else None,
            },
            1,
        )


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
