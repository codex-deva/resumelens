import express from "express";
import fs from "fs/promises";
import path from "path";
import multer from "multer";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { extractText } from "unpdf";
import { createServer as createViteServer } from "vite";

dotenv.config();

const PORT = 3000;

interface AtsAnalysisResponse {
  atsScore: number;
  scoreSummary: string;
  matchingSkills: string[];
  missingSkillsAndKeywords: string[];
  actionableSuggestions: string[];
}

const ATS_SYSTEM_INSTRUCTION = `You are an expert Applicant Tracking System (ATS) engine and senior technical recruiter.
Evaluate the provided resume text strictly and objectively against the target job description.

Guidelines:
1. Calculate a realistic ATS Match Score (0-100) based on keyword overlap, required technical and domain skills, seniority alignment, and measurable impact.
2. Identify matchingSkills: concrete skills, frameworks, tools, certifications, and qualifications found in the resume that directly match the job description.
3. Identify missingSkillsAndKeywords: critical skills, tools, methodologies, or domain keywords emphasized in the job description that are absent or unclear in the resume.
4. Provide actionableSuggestions: EXACTLY 5 specific, practical, high-impact tips tailored to this exact resume and job description (exact bullet improvements, metrics to quantify, keywords to weave naturally, or section adjustments). Avoid generic platitudes.
5. Return valid JSON adhering strictly to the response schema.`;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB limit
  },
  fileFilter: (_req, file, cb) => {
    const isPdfMime = file.mimetype === "application/pdf";
    const isPdfExt = path.extname(file.originalname).toLowerCase() === ".pdf";
    if (!isPdfMime && !isPdfExt) {
      cb(new Error("Only PDF files are supported. Please upload a .pdf resume."));
      return;
    }
    cb(null, true);
  },
});

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not configured. Please add it in Settings > Secrets and retry."
    );
  }

  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

async function startServer(): Promise<void> {
  const app = express();
  app.use(express.json({ limit: "2mb" }));

  // Serve exact Python Streamlit deliverables from disk
  app.get("/api/deliverables", async (_req, res) => {
    try {
      const rootDir = process.cwd();
      const [appPy, requirementsTxt] = await Promise.all([
        fs.readFile(path.join(rootDir, "app.py"), "utf-8"),
        fs.readFile(path.join(rootDir, "requirements.txt"), "utf-8"),
      ]);
      res.json({ appPy, requirementsTxt });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load deliverable files.";
      res.status(500).json({ error: message });
    }
  });

  // Analyze uploaded PDF resume against target job description
  app.post("/api/analyze", (req, res) => {
    upload.single("resume")(req, res, async (uploadErr) => {
      if (uploadErr) {
        const message =
          uploadErr instanceof multer.MulterError && uploadErr.code === "LIMIT_FILE_SIZE"
            ? "PDF file exceeds the 10 MB size limit."
            : uploadErr instanceof Error
              ? uploadErr.message
              : "Invalid file upload.";
        res.status(400).json({ error: message });
        return;
      }

      try {
        const file = req.file;
        const jobDescription =
          typeof req.body?.jobDescription === "string" ? req.body.jobDescription.trim() : "";

        if (!file && !jobDescription) {
          res.status(400).json({
            error: "Please upload a PDF resume and paste a target job description.",
          });
          return;
        }
        if (!file) {
          res.status(400).json({ error: "Please upload your resume in PDF format." });
          return;
        }
        if (!jobDescription) {
          res.status(400).json({ error: "Please paste the target job description." });
          return;
        }

        // Extract text from PDF buffer using unpdf
        let extractedText = "";
        let totalPages = 0;
        try {
          const pdfResult = await extractText(new Uint8Array(file.buffer), {
            mergePages: true,
          });
          extractedText = (pdfResult.text ?? "").trim();
          totalPages = pdfResult.totalPages ?? 0;
        } catch (pdfError) {
          const pdfDetail =
            pdfError instanceof Error ? pdfError.message : "Unreadable or encrypted PDF.";
          res.status(400).json({
            error: `Could not read this PDF (${pdfDetail}). Please upload an unencrypted, text-based PDF resume.`,
          });
          return;
        }

        if (!extractedText || extractedText.length < 20) {
          res.status(400).json({
            error:
              "No readable text was found in this PDF. It appears to be empty or a scanned image-only PDF. Please export a text-based PDF and try again.",
          });
          return;
        }

        const ai = getGeminiClient();

        const userPrompt = `### TARGET JOB DESCRIPTION
${jobDescription}

### CANDIDATE RESUME TEXT
${extractedText}`;

        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: userPrompt,
          config: {
            systemInstruction: ATS_SYSTEM_INSTRUCTION,
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                atsScore: {
                  type: Type.INTEGER,
                  description: "Overall ATS match score from 0 to 100.",
                },
                scoreSummary: {
                  type: Type.STRING,
                  description: "Concise 2-3 sentence executive summary explaining the score.",
                },
                matchingSkills: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description:
                    "Skills, tools, and qualifications found in the resume that match the job description.",
                },
                missingSkillsAndKeywords: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description:
                    "Important keywords, tools, or skills from the job description missing from the resume.",
                },
                actionableSuggestions: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description:
                    "Exactly 5 specific, practical tips to improve the resume for this exact job role.",
                },
              },
              required: [
                "atsScore",
                "scoreSummary",
                "matchingSkills",
                "missingSkillsAndKeywords",
                "actionableSuggestions",
              ],
            },
          },
        });

        const rawJson = (response.text ?? "").trim();
        if (!rawJson) {
          res.status(502).json({ error: "Gemini returned an empty analysis. Please try again." });
          return;
        }

        const parsed = JSON.parse(rawJson) as AtsAnalysisResponse;
        const normalized: AtsAnalysisResponse & {
          meta: { fileName: string; totalPages: number; extractedChars: number };
        } = {
          atsScore: Math.max(0, Math.min(100, Math.round(Number(parsed.atsScore) || 0))),
          scoreSummary: parsed.scoreSummary || "",
          matchingSkills: Array.isArray(parsed.matchingSkills) ? parsed.matchingSkills : [],
          missingSkillsAndKeywords: Array.isArray(parsed.missingSkillsAndKeywords)
            ? parsed.missingSkillsAndKeywords
            : [],
          actionableSuggestions: Array.isArray(parsed.actionableSuggestions)
            ? parsed.actionableSuggestions.slice(0, 5)
            : [],
          meta: {
            fileName: file.originalname,
            totalPages,
            extractedChars: extractedText.length,
          },
        };

        res.json(normalized);
      } catch (error) {
        console.error("ATS analysis error:", error);
        const message =
          error instanceof Error ? error.message : "Failed to analyze resume with Gemini.";
        res.status(500).json({ error: message });
      }
    });
  });

  // Mount Vite middleware in development, static dist/ in production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Fatal server startup error:", err);
  process.exit(1);
});
