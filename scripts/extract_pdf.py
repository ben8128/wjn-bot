#!/usr/bin/env python3
"""Extract text from PDF using unstructured.io"""

import sys
import json
from unstructured.partition.pdf import partition_pdf

def extract_text(pdf_path: str) -> str:
    """Extract text from a PDF file."""
    try:
        elements = partition_pdf(
            filename=pdf_path,
            strategy="fast",  # Use fast strategy for speed, "hi_res" for better quality
        )

        # Combine all elements into text
        text_parts = []
        for element in elements:
            text = str(element)
            if text.strip():
                text_parts.append(text)

        return "\n\n".join(text_parts)
    except Exception as e:
        return json.dumps({"error": str(e)})

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(json.dumps({"error": "Usage: extract_pdf.py <pdf_path>"}))
        sys.exit(1)

    pdf_path = sys.argv[1]
    text = extract_text(pdf_path)
    print(text)
