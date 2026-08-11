# Cloud Shell venv(python3.12)와 동일한 버전으로 맞춤
FROM python:3.12-slim

# 시스템 패키지 설치
# - libreoffice-writer: docx -> pdf 변환 (soffice 헤드리스 모드)
# - fonts-nanum: 한글 폰트(나눔고딕) 렌더링용
RUN apt-get update && apt-get install -y --no-install-recommends \
    libreoffice-writer \
    fonts-nanum \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 의존성 먼저 설치 (레이어 캐싱으로 재빌드 속도 향상)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 애플리케이션 코드 및 정적 자산 복사
COPY main.py .
COPY assets/ ./assets/
COPY chroma_db/ ./chroma_db/

# Cloud Run은 $PORT 환경변수로 실제 포트를 주입함 (기본 8080)
ENV PORT=8080
EXPOSE 8080

# 쉘 형식(CMD 배열이 아님)으로 작성해야 $PORT 환경변수 치환이 됨
CMD exec uvicorn main:app --host 0.0.0.0 --port $PORT