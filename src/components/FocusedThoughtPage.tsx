import React, { useEffect, useState } from "react"
import { getFunctions, httpsCallable } from "firebase/functions"
import { getFirestore, doc, getDoc, collection, onSnapshot } from "firebase/firestore"
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

  useEffect(() => {
    if (!thoughtId) return
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
    const docRef = doc(db, "thoughts", thoughtId)
    const unsubscribe = onSnapshot(docRef, (snapshot: any) => {
      const data = snapshot.data()

      if (!data) return
      // If the embedding is present, fetch related thoughts
      if (data.embedding) {
        fetchRelatedThoughts()
      }
    })

    return () => unsubscribe()
  }, [thoughtId])

  return (
    <div className="focused-thought-page">
      <button className="close-button" onClick={onClose}>
        Back
      </button>

      <div className="main-thought">
        <p style={{ whiteSpace: "pre-wrap" }}>{currentThoughtText}</p>
      </div>

      {loading ? (
        <div>Loading related thoughts...</div>
      ) : (
        <div className="related-thoughts-row">
          {relatedThoughts.length > 0 ? (
            relatedThoughts.map((thought, index) => (
              <div key={index} className="related-thought-item" style={{ whiteSpace: "pre-wrap" }}>
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
