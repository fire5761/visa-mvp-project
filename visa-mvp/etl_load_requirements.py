"""
etl_load_requirements.py
manual.txt(법무부 체류관리 매뉴얼)를 Gemini로 파싱해서
BigQuery의 document_requirements 테이블에 구조화된 데이터로 적재하는 1회성 스크립트.

실행: python etl_load_requirements.py
"""
import json
from datetime import datetime, timezone

import vertexai
from vertexai.generative_models import GenerativeModel
from google.cloud import bigquery

PROJECT_ID = "proj-aj29-211200020328"
LOCATION = "global"
BQ_DATASET = "visa_mvp"
BQ_TABLE = "document_requirements"

vertexai.init(project=PROJECT_ID, location=LOCATION)
model = GenerativeModel(model_name="gemini-3.1-flash-lite")

APPLICATION_TYPES = [
    "외국인등록", "체류자격외활동허가", "등록증재발급", "근무처변경추가허가",
    "체류기간연장허가", "재입국허가", "체류자격변경허가", "체류지변경신고",
    "체류자격부여", "등록사항변경신고",
]

# 매뉴얼에 등장하는 비자 유형을 먼저 추출 (하드코딩 대신 매뉴얼 기반으로)
VISA_TYPES_TO_EXTRACT = ["D-2-1", "D-2-2", "D-2-3", "D-2-4", "D-4-1", "D-4-7", "D-10-1"]


def extract_requirements(manual_text: str, visa_type: str, application_type: str) -> list[str]:
    prompt = f"""
    너는 대한민국 출입국 외국인청의 서류 안내 전문가야.
    아래 [체류관리 매뉴얼]을 100% 참고해서, [체류자격]과 [신청구분]에 해당하는
    필수 첨부서류 목록만 추출해.

    [체류관리 매뉴얼]:
    {manual_text}

    [체류자격]: {visa_type}
    [신청 구분]: {application_type}

    조건:
    - 매뉴얼에 명시된 서류가 없으면 반드시 빈 배열을 반환해. 절대 지어내지 마.
    - 순수 JSON만 반환: {{"required_documents": ["서류1", "서류2"]}}
    """
    response = model.generate_content(prompt)
    try:
        clean = response.text.replace("```json", "").replace("```", "").strip()
        return json.loads(clean).get("required_documents", [])
    except Exception as e:
        print(f"  ⚠️ 파싱 실패 ({visa_type}/{application_type}): {e}")
        return []


def main():
    with open("assets/manual.txt", "r", encoding="utf-8") as f:
        manual_text = f.read()

    rows = []
    now = datetime.now(timezone.utc).isoformat()

    for visa_type in VISA_TYPES_TO_EXTRACT:
        for application_type in APPLICATION_TYPES:
            print(f"추출 중: {visa_type} / {application_type}")
            docs = extract_requirements(manual_text, visa_type, application_type)
            if not docs:
                continue  # 해당 없는 조합은 행을 만들지 않음
            for doc_name in docs:
                rows.append({
                    "visa_type": visa_type,
                    "application_type": application_type,
                    "required_document": doc_name,
                    "source": "manual.txt (Gemini 추출, 1회성 ETL)",
                    "created_at": now,
                })

    print(f"\n총 {len(rows)}개 행 추출 완료. BigQuery에 적재합니다...")

    client = bigquery.Client(project=PROJECT_ID)
    table_ref = f"{PROJECT_ID}.{BQ_DATASET}.{BQ_TABLE}"
    errors = client.insert_rows_json(table_ref, rows)

    if errors:
        print("⚠️ 일부 적재 실패:", errors)
    else:
        print(f"✅ {len(rows)}개 행 적재 완료: {table_ref}")


if __name__ == "__main__":
    main()