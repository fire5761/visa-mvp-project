"""
build_rag_index.py
manual.txt를 규칙 단위로 청킹 → Vertex AI(gemini-embedding-001)로 임베딩 → ChromaDB에 저장.
서식/매뉴얼이 바뀔 때마다 다시 실행하면 인덱스가 갱신됨.

실행: python build_rag_index.py
"""
import re

import chromadb
import vertexai
from vertexai.language_models import TextEmbeddingModel, TextEmbeddingInput

PROJECT_ID = "proj-aj29-211200020328"
LOCATION = "global"
EMBEDDING_LOCATION = "us-central1"
EMBEDDING_MODEL_NAME = "gemini-embedding-001"
CHROMA_PERSIST_DIR = "chroma_db"
CHROMA_COLLECTION_NAME = "visa_manual"

vertexai.init(project=PROJECT_ID, location=EMBEDDING_LOCATION)
embedding_model = TextEmbeddingModel.from_pretrained(EMBEDDING_MODEL_NAME)


def chunk_manual(text: str) -> list[dict]:
    """번호 매겨진 섹션 단위로 나누고, 항목(- )이 2개 이상인 섹션은 더 잘게 쪼갠다.
    단, '공통 필수 제출 서류' 섹션은 예외적으로 통째로 유지한다
    (모든 신청에 공통 적용되는 목록이라 항상 함께 검색되는 게 유용함)."""
    chunks = []
    sections = re.split(r"\n(?=\d+\.\s)", text.strip())
    for section in sections:
        section = section.strip()
        if not section:
            continue
        header_match = re.match(r"^(\d+)\.\s*(.+)", section)
        if not header_match:
            continue
        section_title = header_match.group(2).split("\n")[0].strip()
        lines = section.split("\n")[1:]
        bullet_lines = [l.strip() for l in lines if l.strip().startswith("- ")]

        if section_title.startswith("공통 필수 제출 서류") or len(bullet_lines) < 2:
            chunks.append({"text": section, "section": section_title})
        else:
            for line in bullet_lines:
                chunks.append({"text": f"[{section_title}] {line[2:]}", "section": section_title})
    return chunks


def embed_texts(texts: list[str]) -> list[list[float]]:
    inputs = [TextEmbeddingInput(text=t, task_type="RETRIEVAL_DOCUMENT") for t in texts]
    embeddings = embedding_model.get_embeddings(inputs)
    return [e.values for e in embeddings]


def main():
    with open("assets/manual.txt", "r", encoding="utf-8") as f:
        manual_text = f.read()

    chunks = chunk_manual(manual_text)
    print(f"총 {len(chunks)}개 청크로 분할됨")

    texts = [c["text"] for c in chunks]
    embeddings = embed_texts(texts)
    print(f"임베딩 완료 (차원: {len(embeddings[0])})")

    client = chromadb.PersistentClient(path=CHROMA_PERSIST_DIR)
    try:
        client.delete_collection(CHROMA_COLLECTION_NAME)
    except Exception:
        pass
    collection = client.create_collection(CHROMA_COLLECTION_NAME)

    collection.add(
        ids=[f"chunk_{i}" for i in range(len(chunks))],
        embeddings=embeddings,
        documents=texts,
        metadatas=[{"section": c["section"]} for c in chunks],
    )
    print(f"✅ ChromaDB('{CHROMA_PERSIST_DIR}')에 {len(chunks)}개 청크 인덱싱 완료")


if __name__ == "__main__":
    main()