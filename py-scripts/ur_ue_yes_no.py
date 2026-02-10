from pathlib import Path

import pandas as pd


BASE_DIR = Path(__file__).resolve().parent
ALL_COURSES_PATH = BASE_DIR / "ExportToExcel (36).xlsx"
UE_CSV_PATH = BASE_DIR / "ExportToExcel (37).csv"
UR_CSV_PATH = BASE_DIR / "ExportToExcel (38).csv"
OUTPUT_PATH = BASE_DIR / "all_courses_with_ue_ur2.xlsx"
COURSE_CODE_COL = "Course Code"


def normalize_course_code(value: object) -> str:
    """Normalize course codes for safe matching."""
    if pd.isna(value):
        return ""
    return str(value).strip().upper()


def load_course_code_set(csv_path: Path) -> set[str]:
    df = pd.read_csv(csv_path)
    if COURSE_CODE_COL in df.columns:
        series = df[COURSE_CODE_COL]
    else:
        series = df.iloc[:, 0]
    return {normalize_course_code(code) for code in series if normalize_course_code(code)}


def main() -> None:
    all_courses_df = pd.read_excel(ALL_COURSES_PATH)
    if COURSE_CODE_COL not in all_courses_df.columns:
        raise KeyError(f"Missing required column: '{COURSE_CODE_COL}' in {ALL_COURSES_PATH}")

    ue_codes = load_course_code_set(UE_CSV_PATH)
    ur_codes = load_course_code_set(UR_CSV_PATH)

    course_codes = all_courses_df[COURSE_CODE_COL].map(normalize_course_code)
    all_courses_df["UE"] = course_codes.map(lambda code: "yes" if code in ue_codes else "no")
    all_courses_df["UR"] = course_codes.map(lambda code: "yes" if code in ur_codes else "no")

    all_courses_df.to_excel(OUTPUT_PATH, index=False)
    print(f"Done. New file created: {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
