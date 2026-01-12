import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';

// Use Vite's ?url import to bundle the worker file locally
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export async function parseFile(file: File): Promise<string> {
  const extension = file.name.split('.').pop()?.toLowerCase();

  if (extension === 'txt') {
    return parseTxt(file);
  } else if (extension === 'docx') {
    return parseDocx(file);
  } else if (extension === 'pdf') {
    return parsePdf(file);
  } else {
    throw new Error(`Unsupported file type: .${extension}`);
  }
}

function parseTxt(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = (e) => reject(e);
    reader.readAsText(file);
  });
}

async function parseDocx(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}

async function parsePdf(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const strings = content.items.map((item: any) => item.str);
    fullText += strings.join(' ') + '\n\n';
  }

  return fullText;
}

// Text Cleaning Logic
export function cleanText(text: string): string {
  let cleaned = text;

  // 1. Normalize line breaks: CRLF -> LF
  cleaned = cleaned.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // 2. Remove extra spaces between Chinese characters (common in PDF extraction)
  // Regex: Chinese char + space + Chinese char -> Chinese char + Chinese char
  cleaned = cleaned.replace(/([\u4e00-\u9fa5])\s+([\u4e00-\u9fa5])/g, '$1$2');

  // 3. Fix "Incorrect Line Breaks" (Error wrap)
  // Heuristic: If a line does NOT end with sentence ending punctuation (。！？：；”’), merge it with next line.
  // This is risky for poetry or lists, but good for prose.
  // Implementation: Look for \n not preceded by punctuation.
  // Note: We should assume double \n is a real paragraph break.
  
  // Split into paragraphs first (double newline)
  const paragraphs = cleaned.split(/\n\s*\n/);
  
  const processedParagraphs = paragraphs.map(p => {
    // Within a paragraph, remove single newlines that break sentences
    // Replace \n that is NOT preceded by punctuation with nothing (or space if English)
    // For Chinese, remove it.
    return p.replace(/([^。！？：；”’\.\!\?\:\;\"\'\n])\n(?=[^\n])/g, '$1');
  });

  return processedParagraphs.join('\n\n');
}
