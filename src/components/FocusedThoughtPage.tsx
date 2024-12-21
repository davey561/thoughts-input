import React, { useEffect, useState } from "react"
import { getFunctions, httpsCallable } from "firebase/functions"
import { getFirestore, doc, getDoc } from "firebase/firestore"
import "../App.css"

const functions = getFunctions()
const db = getFirestore()
const getRelatedThoughts = httpsCallable(functions, "getRelatedThoughts")

interface ThoughtData {
  id: string
  text: string
}
interface FocusedThoughtPageProps {
  thoughtId: string
  onClose: () => void
}

interface RelatedThoughtsResponse {
  relatedThoughts: ThoughtData[]
}

const FocusedThoughtPage: React.FC<FocusedThoughtPageProps> = ({ thoughtId, onClose }) => {
  const [currentThoughtText, setCurrentThoughtText] = useState<string>("")
  const [relatedThoughts, setRelatedThoughts] = useState<ThoughtData[]>([])
  const [loading, setLoading] = useState<boolean>(true)

  // Fetch the focused thought's text
  useEffect(() => {
    const fetchThoughtText = async () => {
      try {
        const thoughtRef = doc(db, "thoughts", thoughtId)
        const thoughtSnapshot = await getDoc(thoughtRef)

        if (thoughtSnapshot.exists()) {
          setCurrentThoughtText(thoughtSnapshot.data().text)
        } else {
          setCurrentThoughtText("Thought not found")
        }
      } catch (error) {
        console.error("Error fetching thought text:", error)
        setCurrentThoughtText("Error loading thought")
      }
    }

    fetchThoughtText()
  }, [thoughtId])

  // Fetch related thoughts
  useEffect(() => {
    const fetchRelatedThoughts = async () => {
      try {
        setLoading(true)
        console.log("fetching related thoughts")
        const response = await getRelatedThoughts({ docId: thoughtId })
        const { relatedThoughts } = response.data as RelatedThoughtsResponse
        console.log({ relatedThoughts })
        setRelatedThoughts(relatedThoughts || [])
      } catch (error) {
        console.error("Error fetching related thoughts:", error)
      } finally {
        setLoading(false)
      }
    }
    if (thoughtId) fetchRelatedThoughts()
  }, [thoughtId])

  return (
    <div className="focused-thought-page">
      <button className="close-button" onClick={onClose}>
        Back
      </button>

      <div className="main-thought">
        <p>{currentThoughtText}</p>
      </div>

      {loading ? (
        <div>Loading related thoughts...</div>
      ) : (
        <div className="related-thoughts-row">
          {relatedThoughts.length > 0 ? (
            relatedThoughts.map((thought, index) => (
              <div key={index} className="related-thought-item">
                {thought?.text}
              </div>
            ))
          ) : (
            <div>No related thoughts found</div>
          )}
        </div>
      )}
    </div>
  )
}

export default FocusedThoughtPage
