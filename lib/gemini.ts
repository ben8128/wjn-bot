import { GoogleGenerativeAI, GenerativeModel, Part } from "@google/generative-ai";

// Initialize the Gemini API client
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");

// Model configuration
const MODEL_NAME = "gemini-2.0-flash";

// Get the generative model
export function getModel(): GenerativeModel {
  return genAI.getGenerativeModel({
    model: MODEL_NAME,
  });
}

// File references for uploaded documents (populated after upload)
export interface UploadedFile {
  name: string;
  uri: string;
  mimeType: string;
}

// Store file references (in production, this would be in a database)
let uploadedFiles: UploadedFile[] = [];

export function setUploadedFiles(files: UploadedFile[]) {
  uploadedFiles = files;
}

export function getUploadedFiles(): UploadedFile[] {
  return uploadedFiles;
}

// Create file parts for the model from uploaded files
export function createFileParts(files: UploadedFile[]): Part[] {
  return files.map((file) => ({
    fileData: {
      mimeType: file.mimeType,
      fileUri: file.uri,
    },
  }));
}

// Generate a response with files in context
export async function generateWithFiles(
  prompt: string,
  systemPrompt: string,
  files: UploadedFile[]
): Promise<string> {
  const model = getModel();

  const fileParts = createFileParts(files);

  const result = await model.generateContent({
    contents: [
      {
        role: "user",
        parts: [
          ...fileParts,
          { text: systemPrompt + "\n\n" + prompt },
        ],
      },
    ],
  });

  return result.response.text();
}

// Stream a response with files in context
export async function* streamWithFiles(
  prompt: string,
  systemPrompt: string,
  files: UploadedFile[],
  conversationHistory: { role: "user" | "model"; content: string }[] = []
): AsyncGenerator<string> {
  const model = getModel();

  const fileParts = createFileParts(files);

  // Build conversation contents
  const contents = [];

  // First message includes files and system prompt
  if (conversationHistory.length === 0) {
    contents.push({
      role: "user" as const,
      parts: [
        ...fileParts,
        { text: systemPrompt + "\n\nUser question: " + prompt },
      ],
    });
  } else {
    // For ongoing conversations, include history
    // First message with files
    contents.push({
      role: "user" as const,
      parts: [
        ...fileParts,
        { text: systemPrompt + "\n\nUser question: " + conversationHistory[0].content },
      ],
    });

    // Add remaining history
    for (let i = 1; i < conversationHistory.length; i++) {
      contents.push({
        role: conversationHistory[i].role,
        parts: [{ text: conversationHistory[i].content }],
      });
    }

    // Add current prompt
    contents.push({
      role: "user" as const,
      parts: [{ text: prompt }],
    });
  }

  const result = await model.generateContentStream({ contents });

  for await (const chunk of result.stream) {
    const text = chunk.text();
    if (text) {
      yield text;
    }
  }
}
