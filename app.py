"""
AI Resume Analyzer & ATS Score Checker
--------------------------------------
A Streamlit web application that extracts text from a candidate's PDF resume
using `pypdf` and evaluates alignment against a target job description using
Google's Gemini API (`google-genai`, model `gemini-2.5-flash`).

Run locally:
    pip install -r requirements.txt
    streamlit run app.py
"""

import json
import os
from typing import List

from google import genai
from google.genai import types
from pydantic import BaseModel, Field
from pypdf import PdfReader
from pypdf.errors import PdfReadError
import streamlit as st


# ---------------------------------------------------------------------------
# Structured Output Schema for Gemini Response
# ---------------------------------------------------------------------------
class ATSAnalysisResult(BaseModel):
    """Schema enforced on the Gemini API JSON response."""

    ats_score: int = Field(
        ...,
        ge=0,
        le=100,
        description="Overall ATS match percentage from 0 to 100.",
    )
    score_summary: str = Field(
        ...,
        description="Concise 2-3 sentence executive summary explaining the score.",
    )
    matching_skills: List[str] = Field(
        ...,
        description="Skills, tools, and qualifications present in both resume and JD.",
    )
    missing_skills_and_keywords: List[str] = Field(
        ...,
        description="Important skills, tools, or keywords from the JD missing in the resume.",
    )
    actionable_suggestions: List[str] = Field(
        ...,
        min_length=5,
        max_length=5,
        description="Exactly 5 specific, practical improvements tailored to this role.",
    )


# ---------------------------------------------------------------------------
# System Instruction for ATS & Technical Recruiter Persona
# ---------------------------------------------------------------------------
ATS_SYSTEM_INSTRUCTION = """
You are an expert Applicant Tracking System (ATS) engine and senior technical recruiter.
Evaluate the provided resume text strictly and objectively against the target job description.

Guidelines:
1. Calculate a realistic ATS Match Score (0-100) based on keyword overlap, required technical
   and domain skills, seniority/experience alignment, and measurable impact.
2. Identify `matching_skills`: concrete skills, frameworks, tools, certifications, and
   qualifications found in the resume that directly match the job description.
3. Identify `missing_skills_and_keywords`: critical skills, tools, methodologies, or domain
   keywords emphasized in the job description that are absent or unclear in the resume.
4. Provide `actionable_suggestions`: EXACTLY 5 specific, practical, high-impact tips tailored
   to this exact resume and job description (e.g., exact bullet rewrites, metrics to add,
   keywords to weave naturally, or section ordering improvements). Avoid generic advice.
5. Return valid JSON adhering strictly to the provided response schema.
""".strip()


# ---------------------------------------------------------------------------
# Helper Functions
# ---------------------------------------------------------------------------
def extract_text_from_pdf(uploaded_file) -> str:
    """
    Extract all readable text from an uploaded PDF file using pypdf.

    Raises:
        ValueError: If the PDF is encrypted, unreadable, corrupted, or contains no text.
    """
    try:
        uploaded_file.seek(0)
        reader = PdfReader(uploaded_file)

        if reader.is_encrypted:
            raise ValueError(
                "This PDF is password-protected or encrypted. "
                "Please upload an unlocked PDF resume."
            )

        if len(reader.pages) == 0:
            raise ValueError("The uploaded PDF contains zero pages.")

        extracted_pages = []
        for page in reader.pages:
            page_text = page.extract_text() or ""
            if page_text.strip():
                extracted_pages.append(page_text.strip())

        full_text = "\n\n".join(extracted_pages).strip()
        if not full_text:
            raise ValueError(
                "No extractable text was found in this PDF. It may be a scanned image-only PDF. "
                "Please export a text-based PDF and try again."
            )

        return full_text

    except PdfReadError as exc:
        raise ValueError(
            "Unable to read the uploaded PDF file. Please verify it is a valid, uncorrupted PDF."
        ) from exc
    except ValueError:
        raise
    except Exception as exc:
        raise ValueError(f"Unexpected error while reading PDF: {exc}") from exc


def analyze_resume_with_gemini(
    api_key: str,
    resume_text: str,
    job_description: str,
) -> ATSAnalysisResult:
    """
    Send extracted resume text and target job description to Gemini 2.5 Flash
    and return a validated ATSAnalysisResult object.
    """
    client = genai.Client(api_key=api_key)

    user_prompt = (
        "### TARGET JOB DESCRIPTION\n"
        f"{job_description.strip()}\n\n"
        "### CANDIDATE RESUME TEXT\n"
        f"{resume_text.strip()}\n"
    )

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=user_prompt,
        config=types.GenerateContentConfig(
            system_instruction=ATS_SYSTEM_INSTRUCTION,
            response_mime_type="application/json",
            response_schema=ATSAnalysisResult,
            temperature=0.2,
        ),
    )

    if response.parsed is not None and isinstance(response.parsed, ATSAnalysisResult):
        result = response.parsed
    else:
        raw_text = (response.text or "").strip()
        if not raw_text:
            raise RuntimeError("Gemini returned an empty response. Please try again.")
        result = ATSAnalysisResult(**json.loads(raw_text))

    # Ensure score bounds and exact 5 suggestions cleanly
    result.ats_score = max(0, min(100, int(result.ats_score)))
    result.actionable_suggestions = result.actionable_suggestions[:5]
    return result


def get_score_band(score: int) -> str:
    """Return a clear qualitative alignment label for the numeric ATS score."""
    if score >= 80:
        return "Strong Match"
    if score >= 60:
        return "Moderate Match"
    return "Needs Optimization"


def render_results(result: ATSAnalysisResult) -> None:
    """Render the four required output sections cleanly in Streamlit."""
    st.divider()
    st.subheader("Evaluation Results")

    # 1. ATS Match Score
    score_col, summary_col = st.columns([1, 2], gap="large")
    with score_col:
        st.metric(
            label="ATS Match Score",
            value=f"{result.ats_score}/100",
            delta=get_score_band(result.ats_score),
        )
        st.progress(result.ats_score / 100)

    with summary_col:
        st.markdown("**Recruiter Assessment**")
        st.write(result.score_summary)

    st.divider()

    # 2. Matching Skills & 3. Missing Skills & Keywords
    matched_col, missing_col = st.columns(2, gap="large")

    with matched_col:
        st.subheader("Matching Skills")
        if result.matching_skills:
            for skill in result.matching_skills:
                st.markdown(f"- :green[**✓**] {skill}")
        else:
            st.info("No direct skill matches were identified against this job description.")

    with missing_col:
        st.subheader("Missing Skills & Keywords")
        if result.missing_skills_and_keywords:
            for keyword in result.missing_skills_and_keywords:
                st.markdown(f"- :red[**✕**] {keyword}")
        else:
            st.success("No major skill or keyword gaps detected.")

    st.divider()

    # 4. 5 Actionable Suggestions
    st.subheader("5 Actionable Suggestions")
    for index, suggestion in enumerate(result.actionable_suggestions, start=1):
        st.markdown(f"**{index}.** {suggestion}")


# ---------------------------------------------------------------------------
# Streamlit App Entry Point
# ---------------------------------------------------------------------------
def main() -> None:
    """Configure page layout, capture user inputs, and orchestrate ATS analysis."""
    st.set_page_config(
        page_title="AI Resume Analyzer & ATS Score Checker",
        page_icon="📄",
        layout="wide",
    )

    # Sidebar: Secure Gemini API Key configuration
    with st.sidebar:
        st.header("Configuration")
        env_api_key = os.environ.get("GEMINI_API_KEY", "")
        user_api_key = st.text_input(
            "Gemini API Key",
            type="password",
            placeholder="Paste your Gemini API key...",
            help=(
                "Optional if GEMINI_API_KEY is already set in your environment. "
                "Your key is never stored on disk."
            ),
        )
        active_api_key = user_api_key.strip() or env_api_key.strip()

        if active_api_key:
            st.caption("API key configured and ready.")
        else:
            st.caption("Enter your Gemini API key or set GEMINI_API_KEY in your environment.")

        st.markdown("---")
        st.markdown(
            "**How it works**\n"
            "1. Upload your resume as a PDF.\n"
            "2. Paste the target job description.\n"
            "3. Click **Analyze Resume** to get your ATS score and targeted improvements."
        )

    # Main Header
    st.title("AI Resume Analyzer & ATS Score Checker")
    st.caption(
        "Upload your PDF resume and paste a target job description to evaluate ATS alignment, "
        "skill coverage, keyword gaps, and tailored resume improvements."
    )

    # Input Workspace
    upload_col, jd_col = st.columns([1, 1.3], gap="large")

    with upload_col:
        uploaded_pdf = st.file_uploader(
            "1. Upload Resume (PDF)",
            type=["pdf"],
            help="Upload a text-based PDF resume (maximum 200 MB).",
        )
        if uploaded_pdf is not None:
            file_size_kb = uploaded_pdf.size / 1024
            st.caption(f"Selected file: **{uploaded_pdf.name}** ({file_size_kb:.1f} KB)")

    with jd_col:
        job_description = st.text_area(
            "2. Paste Target Job Description",
            height=220,
            placeholder=(
                "Paste the full job description here, including responsibilities, "
                "required skills, tools, and preferred qualifications..."
            ),
        )

    analyze_clicked = st.button("Analyze Resume", type="primary", use_container_width=False)

    # Trigger validation & analysis workflow
    if analyze_clicked:
        if uploaded_pdf is None and not job_description.strip():
            st.warning("Please upload a PDF resume and paste a target job description before analyzing.")
            return
        if uploaded_pdf is None:
            st.warning("Please upload a resume in PDF format.")
            return
        if not job_description.strip():
            st.warning("Please paste the target job description.")
            return
        if not active_api_key:
            st.error(
                "A Gemini API key is required. Please enter it in the sidebar or set the "
                "GEMINI_API_KEY environment variable."
            )
            return

        # Step 1: Extract text from PDF
        try:
            with st.spinner("Extracting text from your PDF resume..."):
                resume_text = extract_text_from_pdf(uploaded_pdf)
        except ValueError as pdf_err:
            st.error(str(pdf_err))
            return

        # Step 2: Analyze with Gemini
        try:
            with st.spinner("Analyzing resume alignment with Gemini 2.5 Flash..."):
                analysis_result = analyze_resume_with_gemini(
                    api_key=active_api_key,
                    resume_text=resume_text,
                    job_description=job_description,
                )
        except Exception as api_err:
            st.error(f"Gemini analysis failed: {api_err}")
            return

        # Step 3: Render structured results
        render_results(analysis_result)


if __name__ == "__main__":
    main()
