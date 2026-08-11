# 국민비서 유학생편

외국인 유학생을 위한 비자·체류허가 신청서 자동 작성 서비스. 정보를 입력하면 필요 서류 안내문과 채워진 신청서가 담긴 PDF를 자동 생성하고, RAG 기반 챗봇 상담과 D-Day 만료 알림을 제공합니다.

- 프론트엔드: https://visa-frontend-873486177911.asia-northeast3.run.app
- 백엔드 API: https://visa-mvp-backend-873486177911.asia-northeast3.run.app

## 문제 정의

유학생에게 체류 연장 등 행정 서류 작성은 익숙해지기 어렵고, 서류 유형이 다양해 자신에게 맞는 서류를 찾기 어렵다. 미루면 큰 페널티가 부과된다. 본 서비스는 상태에 따라 필요한 서류를 자동으로 찾아주고, 입력을 직관적으로 만들어 이 부담을 줄인다.

## 아키텍처

```
브라우저 → Cloud Run(React, nginx)
        → Cloud Run(FastAPI 백엔드)
            → Vertex AI (Gemini 3.1 Flash-Lite: 생성 / gemini-embedding-001: 임베딩)
            → BigQuery (서류 요구사항 캐시)
            → Firestore (알림 구독 최소정보)
            → ChromaDB (RAG 벡터스토어, 컨테이너 내장)
            → SendGrid (이메일 발송)
Cloud Scheduler → 매일 09:00 KST → 백엔드 /api/v1/cron/notify 호출
```

## 핵심 기능

1. **신청서 자동 작성** — 입력 폼 → 비자 서식(통합신청서) + 안내문이 담긴 PDF 자동 생성. 좌표 대신 DOCX 표 셀(row/col) 구조로 매핑해 정확도 확보.
2. **AI 서류 추천** — 비자유형·신청구분별 필요서류를 BigQuery 캐시 우선 조회, 없으면 RAG 검색 후 Gemini로 생성해 자동 저장.
3. **RAG 그라운딩 챗봇** — 매뉴얼 벡터 검색 기반 상담. 근거 없는 질문은 추측 대신 안내(환각 방지), 일반 질문은 유연하게 답변.
4. **D-Day 알림** — 이메일·만료일 등 최소 개인정보만 Firestore에 저장, 만료 30일 전 자동 이메일 발송.

## 사용한 GCP 스택

| 서비스 | 용도 |
|---|---|
| Vertex AI (Gemini 3.1 Flash-Lite) | 서류 추천, 챗봇 답변 생성 |
| Vertex AI (gemini-embedding-001) | RAG 청크/질의 임베딩 |
| BigQuery | 서류 요구사항 캐시 (`visa_mvp.document_requirements`) |
| Firestore | 알림 구독 최소정보 저장 |
| Cloud Run | 프론트엔드·백엔드 배포 |
| Cloud Scheduler | 일일 알림 발송 트리거 |
| Cloud Build | 소스 기반 자동 이미지 빌드 |

## 파일 구조

```
visa-mvp/                          # 백엔드 (FastAPI, Cloud Run)
├── main.py                        # F01(프로필+Firestore), F02(PDF생성),
│                                   # F03(서류추천, BigQuery+RAG), F04(알림), 챗봇
├── Dockerfile                     # LibreOffice+나눔고딕+Python 의존성
├── requirements.txt
├── build_rag_index.py             # [1회성] manual.txt → 청킹 → 임베딩 → ChromaDB
├── etl_load_requirements.py       # [1회성] manual.txt → Gemini 구조화 → BigQuery
├── assets/
│   ├── template_universal.docx    # 하이코리아 공식 통합신청서 원본
│   └── manual.txt                 # D-2/D-4/D-10 서류규정
└── chroma_db/                     # RAG 벡터 인덱스 (사전 빌드)

visa-frontend/                     # 프론트엔드 (React, Cloud Run)
├── src/
│   ├── App.jsx                    # 헤더/탭, 서류작성 페이지, 상담(챗봇) 페이지
│   └── App.css                    # 디자인 시스템
├── Dockerfile                     # 2단계 빌드(Node 빌드 → nginx 서빙)
└── nginx.conf.template            # Cloud Run $PORT 대응 설정
```

## 재현 방법

```bash
# 백엔드 배포
cd visa-mvp
gcloud run deploy visa-mvp-backend \
  --source . --region asia-northeast3 \
  --allow-unauthenticated --memory 2Gi --cpu 2 \
  --timeout 120 --clear-base-image

# 환경변수 설정 (알림 기능용, 실제 값은 각자 발급)
gcloud run services update visa-mvp-backend \
  --region asia-northeast3 \
  --set-env-vars="SENDGRID_API_KEY=<값>,SENDER_EMAIL=<값>,CRON_SECRET=<값>"

# 프론트엔드 배포
cd ../visa-frontend
gcloud run deploy visa-frontend \
  --source . --region asia-northeast3 \
  --allow-unauthenticated

# 최초 1회: RAG 인덱스 및 BigQuery 지식베이스 생성
cd ../visa-mvp
python build_rag_index.py
python etl_load_requirements.py

# 알림 스케줄러 등록
gcloud scheduler jobs create http visa-notify-daily \
  --schedule="0 9 * * *" --time-zone="Asia/Seoul" \
  --uri="<백엔드URL>/api/v1/cron/notify" \
  --http-method=POST --headers="X-Cron-Secret=<값>"
```

## 한계 및 다음 계획

- 응답 3초 목표 미달성(실측 7~13초) — LibreOffice 상주 프로세스화 예정
- 다국어 미지원(한국어 전용) — 영어 라벨 우선 추가 예정
- 실사용자 A/B 검증 미실시 — 유학생 대상 과업성공률 테스트 예정
- 외국인등록증 OCR 미구현 — Document AI 연동 예정
- 기본 서비스계정 사용(권한 과다) — 전용 최소권한 계정 분리 예정
- RAG 데이터 규모 작음(공식 매뉴얼 표 데이터 추출 실패) — 표 보존 가능한 변환 경로 확보 후 확장 예정

## 데이터 출처

- 통합신청서 서식: 하이코리아(법무부) 공개 자료
- 체류관리 매뉴얼: 법무부 「체류민원 자격별 안내 매뉴얼」

## 참고

`assets/gcp-key.json` 등 서비스 계정 키 파일은 본 저장소에 포함되지 않습니다. GCP 인증은 Cloud Run 서비스 계정(ADC)을 통해 이루어집니다.
