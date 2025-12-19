import { GoogleAIFileManager } from "@google/generative-ai/server";
import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import * as XLSX from "xlsx";

// Load environment variables
import "dotenv/config";

const fileManager = new GoogleAIFileManager(process.env.GOOGLE_API_KEY || "");

const DOCS_DIR = path.join(process.cwd(), "0 - AI Inputs Examples");
const OUTPUT_FILE = path.join(process.cwd(), "lib", "uploaded-files.json");
const CONVERTED_DIR = path.join(process.cwd(), ".converted");

interface UploadedFile {
  name: string;
  displayName: string;
  uri: string;
  mimeType: string;
  sizeBytes: string;
  state: string;
}

// Get MIME type from file extension
function getMimeType(filePath: string): string | null {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes: Record<string, string> = {
    ".pdf": "application/pdf",
    ".txt": "text/plain",
  };
  return mimeTypes[ext] || null;
}

// Check if file needs conversion
function needsConversion(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return [".docx", ".doc", ".pptx", ".ppt", ".xlsx", ".xls", ".csv"].includes(ext);
}

// Check if file is supported (either directly or after conversion)
function isSupported(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return [".pdf", ".docx", ".doc", ".pptx", ".ppt", ".xlsx", ".xls", ".csv", ".txt"].includes(ext);
}

// Convert a file to plain text using pandoc or xlsx
function convertToText(filePath: string): string | null {
  const ext = path.extname(filePath).toLowerCase();
  const baseName = path.basename(filePath, ext);
  const relativePath = path.relative(DOCS_DIR, path.dirname(filePath));
  const outputDir = path.join(CONVERTED_DIR, relativePath);
  const outputPath = path.join(outputDir, `${baseName}.txt`);

  // Create output directory
  fs.mkdirSync(outputDir, { recursive: true });

  try {
    // Use pandoc to convert docx/pptx to plain text
    if ([".docx", ".doc", ".pptx", ".ppt"].includes(ext)) {
      execSync(`pandoc "${filePath}" -t plain -o "${outputPath}"`, {
        stdio: "pipe",
      });
      console.log(`    ✓ Converted to text: ${baseName}.txt`);
      return outputPath;
    }

    // Use xlsx library to convert Excel files to text
    if ([".xlsx", ".xls", ".csv"].includes(ext)) {
      const workbook = XLSX.readFile(filePath);
      let textContent = "";

      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        textContent += `=== Sheet: ${sheetName} ===\n\n`;
        // Convert to CSV format for readability
        textContent += XLSX.utils.sheet_to_csv(sheet);
        textContent += "\n\n";
      }

      fs.writeFileSync(outputPath, textContent);
      console.log(`    ✓ Converted to text: ${baseName}.txt`);
      return outputPath;
    }

    return null;
  } catch (error) {
    console.error(`    ✗ Failed to convert ${filePath}:`, error);
    return null;
  }
}

// Recursively get all files in a directory
function getAllFiles(dir: string): string[] {
  const files: string[] = [];

  function walk(currentDir: string) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile()) {
        // Skip hidden files
        if (!entry.name.startsWith(".") && isSupported(fullPath)) {
          files.push(fullPath);
        }
      }
    }
  }

  walk(dir);
  return files;
}

// Upload a single file
async function uploadFile(
  filePath: string,
  displayName: string
): Promise<UploadedFile | null> {
  const mimeType = getMimeType(filePath);
  if (!mimeType) {
    console.log(`  Skipping (unsupported type): ${filePath}`);
    return null;
  }

  console.log(`  Uploading: ${displayName}`);

  try {
    const uploadResult = await fileManager.uploadFile(filePath, {
      mimeType,
      displayName,
    });

    console.log(`    ✓ Uploaded: ${uploadResult.file.name}`);

    return {
      name: uploadResult.file.name,
      displayName: uploadResult.file.displayName || displayName,
      uri: uploadResult.file.uri,
      mimeType: uploadResult.file.mimeType,
      sizeBytes: uploadResult.file.sizeBytes || "0",
      state: uploadResult.file.state,
    };
  } catch (error) {
    console.error(`    ✗ Failed to upload ${displayName}:`, error);
    return null;
  }
}

// Wait for file processing to complete
async function waitForProcessing(fileName: string): Promise<boolean> {
  let file = await fileManager.getFile(fileName);

  while (file.state === "PROCESSING") {
    console.log(`    Waiting for processing: ${file.displayName}`);
    await new Promise((resolve) => setTimeout(resolve, 5000));
    file = await fileManager.getFile(fileName);
  }

  if (file.state === "FAILED") {
    console.error(`    ✗ Processing failed: ${file.displayName}`);
    return false;
  }

  return true;
}

// List existing uploaded files
async function listExistingFiles(): Promise<UploadedFile[]> {
  const files: UploadedFile[] = [];
  const listResult = await fileManager.listFiles();

  for (const file of listResult.files || []) {
    files.push({
      name: file.name,
      displayName: file.displayName || file.name,
      uri: file.uri,
      mimeType: file.mimeType,
      sizeBytes: file.sizeBytes || "0",
      state: file.state,
    });
  }

  return files;
}

// Delete all existing files
async function deleteAllFiles(): Promise<void> {
  console.log("Deleting existing files...");
  const files = await listExistingFiles();
  for (const file of files) {
    try {
      await fileManager.deleteFile(file.name);
      console.log(`  Deleted: ${file.displayName}`);
    } catch (error) {
      console.error(`  Failed to delete ${file.displayName}:`, error);
    }
  }
}

async function main() {
  console.log("WJN Document Upload Script");
  console.log("==========================\n");

  if (!process.env.GOOGLE_API_KEY) {
    console.error("Error: GOOGLE_API_KEY environment variable is not set.");
    console.error("Please set it in your .env.local file.");
    process.exit(1);
  }

  // Check for --clean flag
  const shouldClean = process.argv.includes("--clean");
  if (shouldClean) {
    await deleteAllFiles();
    console.log("\n");
  }

  // Create converted directory
  fs.mkdirSync(CONVERTED_DIR, { recursive: true });

  // Get all document files
  console.log(`Scanning directory: ${DOCS_DIR}\n`);
  const allFiles = getAllFiles(DOCS_DIR);
  console.log(`Found ${allFiles.length} documents.\n`);

  // Separate files into those that can be uploaded directly and those that need conversion
  const directUpload: string[] = [];
  const needsConvert: string[] = [];

  for (const file of allFiles) {
    if (needsConversion(file)) {
      needsConvert.push(file);
    } else if (getMimeType(file)) {
      directUpload.push(file);
    }
  }

  console.log(`Direct upload (PDFs): ${directUpload.length}`);
  console.log(`Need conversion: ${needsConvert.length}\n`);

  // Convert files that need conversion
  const convertedFiles: Array<{ original: string; converted: string }> = [];
  if (needsConvert.length > 0) {
    console.log("Converting documents to text...\n");
    for (const file of needsConvert) {
      const converted = convertToText(file);
      if (converted) {
        convertedFiles.push({ original: file, converted });
      }
    }
    console.log(`\nConverted ${convertedFiles.length} files.\n`);
  }

  // Upload all files
  console.log("Uploading files...\n");
  const uploadedFiles: UploadedFile[] = [];

  // Upload PDFs directly
  for (const filePath of directUpload) {
    const displayName = path.relative(DOCS_DIR, filePath);
    const result = await uploadFile(filePath, displayName);
    if (result) {
      uploadedFiles.push(result);
    }
  }

  // Upload converted text files
  for (const { original, converted } of convertedFiles) {
    const originalDisplayName = path.relative(DOCS_DIR, original);
    const displayName = originalDisplayName.replace(/\.(docx?|pptx?|xlsx?)$/i, ".txt");
    const result = await uploadFile(converted, displayName);
    if (result) {
      uploadedFiles.push(result);
    }
  }

  // Wait for all files to be processed
  console.log("\nWaiting for file processing to complete...");
  for (const file of uploadedFiles) {
    if (file.state === "PROCESSING") {
      await waitForProcessing(file.name);
    }
  }

  // Save file references
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(uploadedFiles, null, 2));
  console.log(`\n✓ Saved file references to: ${OUTPUT_FILE}`);

  // Final summary
  console.log(`\nTotal uploaded files: ${uploadedFiles.length}`);
  console.log("\nFiles available for use:");
  for (const file of uploadedFiles) {
    console.log(`  - ${file.displayName} (${file.mimeType})`);
  }
}

main().catch(console.error);
