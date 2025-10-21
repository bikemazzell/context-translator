from pydantic import BaseModel, Field, field_validator


class TranslationRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=500)
    source_lang: str = Field(..., min_length=1)
    target_lang: str = Field(..., min_length=1)
    context: str | None = None

    @field_validator("text", "source_lang", "target_lang")
    @classmethod
    def strip_whitespace(cls, v: str) -> str:
        return v.strip()

    @field_validator("context")
    @classmethod
    def strip_context_whitespace(cls, v: str | None) -> str | None:
        return v.strip() if v else None


class TranslationResponse(BaseModel):
    translation: str
    cached: bool


class HealthResponse(BaseModel):
    status: str
    llm_checked: bool = False


class LanguageListResponse(BaseModel):
    languages: list[str]


class ErrorResponse(BaseModel):
    error: str
    details: str | None = None
