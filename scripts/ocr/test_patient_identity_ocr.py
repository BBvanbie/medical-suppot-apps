import unittest

from scripts.ocr.patient_identity_ocr import extract_fields_from_lines


class PatientIdentityOcrExtractionTests(unittest.TestCase):
    def test_driver_license_extracts_core_fields(self) -> None:
        payload = extract_fields_from_lines(
            [
                "氏名 馬場口 直人 平成11年3月29日生",
                "住所 東京都立川市羽衣町1-5-11Iミ·ア尺テ1川羽102",
                "2027年（令和09年）04月29日まで有効 交付 令和06年06月04日23034",
            ],
            "drivers_license",
        )

        self.assertEqual(payload["fields"]["name"], "馬場口 直人")
        self.assertEqual(payload["fields"]["address"], "東京都立川市羽衣町1-5-11 エミ・アミティI立川羽衣102")
        self.assertEqual(payload["fields"]["birth"], {"westernYear": "1999", "month": "03", "day": "29"})

    def test_my_number_card_extracts_core_fields(self) -> None:
        payload = extract_fields_from_lines(
            [
                "氏名馬場口 直人",
                "住所 東京都三鷹市下連雀4丁目15番28号 寮 下連雀 個人番号 カード",
                "平成11年3月29日生 2031年3月29日まで有効",
            ],
            "my_number_card",
        )

        self.assertEqual(payload["fields"]["name"], "馬場口 直人")
        self.assertEqual(payload["fields"]["address"], "東京都三鷹市下連雀4丁目15番28号 下連雀寮")
        self.assertEqual(payload["fields"]["birth"], {"westernYear": "1999", "month": "03", "day": "29"})

    def test_insurance_card_extracts_public_sample_style_labels(self) -> None:
        payload = extract_fields_from_lines(
            [
                "被保険者証",
                "記号 12 番号 3456 枝番 01",
                "被保険者氏名 山田 太郎",
                "生年月日 平成2年5月6日",
                "住所 東京都新宿区西新宿2-8-1",
                "保険者番号 12345678",
            ],
            "insurance_card",
        )

        self.assertEqual(payload["fields"]["name"], "山田 太郎")
        self.assertEqual(payload["fields"]["address"], "東京都新宿区西新宿2-8-1")
        self.assertEqual(payload["fields"]["birth"], {"westernYear": "1990", "month": "05", "day": "06"})

    def test_eligibility_certificate_extracts_official_sample_style_labels(self) -> None:
        payload = extract_fields_from_lines(
            [
                "健康保険資格確認書",
                "被保険者（本人） 令和7年10月1日交付",
                "氏名 佐藤 太郎",
                "生年月日 1985年11月03日",
                "資格取得年月日 2024年04月01日",
                "保険者番号 00000000",
                "保険者名称 ○○健康保険組合",
                "保険者所在地 東京都千代田区丸の内1-1-1",
            ],
            "eligibility_certificate",
        )

        self.assertEqual(payload["fields"]["name"], "佐藤 太郎")
        self.assertEqual(payload["fields"]["address"], "東京都千代田区丸の内1-1-1")
        self.assertEqual(payload["fields"]["birth"], {"westernYear": "1985", "month": "11", "day": "03"})

    def test_eligibility_certificate_supports_address_or_residence_label(self) -> None:
        payload = extract_fields_from_lines(
            [
                "資格確認書",
                "受給者氏名 佐藤 花子",
                "生年月日 1985年11月03日",
                "住所又は居所 東京都港区芝公園4-2-8",
                "負担割合 2割",
                "保険者 〇〇健康保険組合",
            ],
            "eligibility_certificate",
        )

        self.assertEqual(payload["fields"]["name"], "佐藤 花子")
        self.assertEqual(payload["fields"]["address"], "東京都港区芝公園4-2-8")
        self.assertEqual(payload["fields"]["birth"], {"westernYear": "1985", "month": "11", "day": "03"})

    def test_insurance_like_split_labels_are_normalized(self) -> None:
        payload = extract_fields_from_lines(
            [
                "被 保険 者 証",
                "氏 名 鈴木 一郎",
                "生 年 月 日 1978年2月9日",
                "住 所 東京都品川区東品川1-2-3",
                "保険者番号 99999999",
            ],
            "insurance_card",
        )

        self.assertEqual(payload["fields"]["name"], "鈴木 一郎")
        self.assertEqual(payload["fields"]["address"], "東京都品川区東品川1-2-3")
        self.assertEqual(payload["fields"]["birth"], {"westernYear": "1978", "month": "02", "day": "09"})

    def test_insurance_name_prefix_noise_is_removed(self) -> None:
        payload = extract_fields_from_lines(
            [
                "被保者氏名 田中彩乃",
                "生年月日 1988年2月27日",
                "住所 東京都新宿区西新宿2-8-1",
            ],
            "insurance_card",
        )

        self.assertEqual(payload["fields"]["name"], "田中彩乃")
        self.assertEqual(payload["fields"]["address"], "東京都新宿区西新宿2-8-1")
        self.assertEqual(payload["fields"]["birth"], {"westernYear": "1988", "month": "02", "day": "27"})

    def test_noisy_address_common_ocr_confusions_are_normalized(self) -> None:
        payload = extract_fields_from_lines(
            [
                "氏名 田中 彩乃",
                "住所 千果千第市美浜区中湖1-3",
                "生年月日 1978年4月7日",
            ],
            "drivers_license",
        )

        self.assertEqual(payload["fields"]["address"], "千葉県千葉市美浜区中瀬1-3")

    def test_eligibility_certificate_ignores_person_row_as_name(self) -> None:
        payload = extract_fields_from_lines(
            [
                "被保陕者 本人",
                "氏名 加藤惠",
                "生年月日 1994年8月11日",
                "被保肤者住所 千葉県千葉市美浜区中瀬1-3",
            ],
            "eligibility_certificate",
        )

        self.assertEqual(payload["fields"]["name"], "加藤恵")
        self.assertEqual(payload["fields"]["address"], "千葉県千葉市美浜区中瀬1-3")
        self.assertEqual(payload["fields"]["birth"], {"westernYear": "1994", "month": "08", "day": "11"})

    def test_name_candidate_strips_phone_capture_noise(self) -> None:
        payload = extract_fields_from_lines(
            [
                "氏名 OCR TEST 小林健司旺",
                "住所 更 東京都立川市羽衣町1-5-11 エミ・アミティI立川羽衣102",
                "生年月日 1983年1月21日",
            ],
            "my_number_card",
        )

        self.assertEqual(payload["fields"]["name"], "小林健司")
        self.assertEqual(payload["fields"]["address"], "東京都立川市羽衣町1-5-11 エミ・アミティI立川羽衣102")
        self.assertEqual(payload["fields"]["birth"], {"westernYear": "1983", "month": "01", "day": "21"})

    def test_short_insurance_name_is_rejected(self) -> None:
        payload = extract_fields_from_lines(
            [
                "氏名 保者",
                "被保険者氏名 田中 彩乃",
                "住所 神奈川県横浜市中区本町6-50-10",
                "生年月日 1988年6月3日",
            ],
            "insurance_card",
        )

        self.assertEqual(payload["fields"]["name"], "田中 彩乃")
        self.assertEqual(payload["fields"]["address"], "神奈川県横浜市中区本町6-50-10")
        self.assertEqual(payload["fields"]["birth"], {"westernYear": "1988", "month": "06", "day": "03"})

    def test_insurance_address_can_be_extracted_from_birth_and_address_same_line(self) -> None:
        payload = extract_fields_from_lines(
            [
                "被保険者氏名 小林健司",
                "生年月日 平成5年1月13日 住所東京都立川市羽衣町1-5-11エミ・アミティI立川羽衣102",
            ],
            "insurance_card",
        )

        self.assertEqual(payload["fields"]["name"], "小林健司")
        self.assertEqual(payload["fields"]["address"], "東京都立川市羽衣町1-5-11 エミ・アミティI立川羽衣102")
        self.assertEqual(payload["fields"]["birth"], {"westernYear": "1993", "month": "01", "day": "13"})


if __name__ == "__main__":
    unittest.main()
