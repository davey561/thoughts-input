import React, { useState } from "react"
import { htmlToText } from "html-to-text"
import { getFunctions, httpsCallable } from "firebase/functions"

const UploadNotesPage: React.FC<{ userId: string }> = ({ userId }) => {
  const [file, setFile] = useState<File | null>(null)
  const [parsedNote, setParsedNote] = useState<{ text: string; timestamp: Date } | null>(null)
  const [uploadResult, setUploadResult] = useState<string | null>(null)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const selectedFile = event.target.files[0]
      setFile(selectedFile)

      const reader = new FileReader()
      reader.onload = () => {
        const rawContent = reader.result as string

        // Convert HTML to plain text
        const plainText = htmlToText(rawContent, {
          wordwrap: 130,
          preserveNewlines: true,
        })

        // Normalize line breaks
        const cleanedText = normalizeLineBreaks(plainText)

        setParsedNote({
          text: cleanedText,
          timestamp: new Date(selectedFile.lastModified),
        })
      }
      reader.onerror = () => console.error("Error reading file:", reader.error)
      reader.readAsText(selectedFile)
    }
  }

  // Utility to remove excess blank lines
  const normalizeLineBreaks = (text: string): string => {
    // Split text into lines
    const lines = text.split("\n")

    // Filter out excessive blank lines but keep indentation
    const cleanedLines = lines.reduce<string[]>((acc, line, index) => {
      const trimmedLine = line.trimEnd() // Keep indentation but remove trailing spaces

      if (trimmedLine === "" && acc[acc.length - 1]?.trim() === "") {
        // Skip consecutive blank lines
        return acc
      }

      acc.push(line) // Preserve original line with leading spaces or tabs
      return acc
    }, [])

    // Rejoin lines with a single line break
    return cleanedLines.join("\n")
  }

  const uploadToFirebase = async () => {
    if (!parsedNote) {
      alert("No note parsed to upload.")
      return
    }

    try {
      const functions = getFunctions()
      const bulkUploadNotes = httpsCallable(functions, "bulkUploadNotes")

      const noteWithUserId = {
        ...parsedNote,
        userId, // Include the user ID
      }

      const response = await bulkUploadNotes({ notes: [noteWithUserId] }) // Single note as array
      const result = response.data as { success: boolean }

      if (result.success) {
        setUploadResult("Note uploaded successfully!")
      } else {
        setUploadResult("Failed to upload note. Check logs.")
      }
    } catch (error) {
      console.error("Error uploading note:", error)
      setUploadResult("An error occurred during upload.")
    }
  }

  return (
    <div>
      <h2>Test Single File Upload</h2>
      <input type="file" accept=".txt" onChange={handleFileSelect} />

      {file && (
        <div>
          <h3>Selected File: {file.name}</h3>
          {parsedNote && (
            <div>
              <h4>Parsed Content</h4>
              <p>
                <strong>Timestamp:</strong> {parsedNote.timestamp.toISOString()}
              </p>
              <pre>{parsedNote.text}</pre>
              <button onClick={uploadToFirebase}>Upload to Firebase</button>
            </div>
          )}
        </div>
      )}

      {uploadResult && (
        <div>
          <h4>Upload Result</h4>
          <p>{uploadResult}</p>
        </div>
      )}
    </div>
  )
}

export default UploadNotesPage
