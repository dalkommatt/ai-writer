import React, { useCallback, useEffect, useRef } from "react"
import { useCompletion } from "ai/react"
import { useDebounceValue } from "usehooks-ts"

import { Textarea } from "./ui/textarea"

interface EditorBodyAreaProps {
  body: string | undefined
  setCurrentEntryBody: (body: string) => void
}

export default function EditorBodyArea({
  body,
  setCurrentEntryBody,
}: EditorBodyAreaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const completionRef = useRef<HTMLDivElement>(null)
  const { complete, setCompletion, completion, stop } = useCompletion({
    api: "/api/completion",
  })
  const [debouncedBody, setDebouncedBody] = useDebounceValue("", 1000)

  useEffect(() => {
    body && setDebouncedBody(body)
  }, [body, setDebouncedBody])

  // When the body changes, fetch a completion with 1 second debounce
  useEffect(() => {
    if (debouncedBody.length > 5) {
      complete(debouncedBody.slice(-200)) // Only send the last 200 characters
    }
    // Clean up any ongoing completion requests if the component is unmounted before completion
    return () => {
      stop()
    }
  }, [debouncedBody, complete])

  // When the body changes clear the completion and stop fetching
  useEffect(() => {
    stop()
    setCompletion("")
  }, [body])

  // Function to replace the current word with the completion
  const appendSuggestion = useCallback(() => {
    // If there is no space at the end of the body or the beginning of the completion, add one. Otherwise if the completion begins with punctuation don't add a space
    const newValue =
      body +
      (body?.endsWith(" ") ||
      completion.startsWith(" ") ||
      completion.startsWith(".") ||
      completion.startsWith("?") ||
      completion.startsWith("!")
        ? ""
        : " ") +
      completion
    setCurrentEntryBody(newValue)
  }, [body, completion, setCurrentEntryBody])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === "Tab" || e.key === "Enter") && completion.length) {
        // Handle tab key and enter key
        e.preventDefault()
        appendSuggestion()
      }
    }

    const textarea = textareaRef.current
    textarea?.addEventListener("keydown", handleKeyDown)
    return () => textarea?.removeEventListener("keydown", handleKeyDown)
  }, [body, completion, appendSuggestion])

  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCurrentEntryBody(e.target.value)
  }

  // Sync scroll positions
  useEffect(() => {
    const syncScroll = () => {
      if (completionRef.current && textareaRef.current) {
        completionRef.current.scrollTop = textareaRef.current.scrollTop
        completionRef.current.scrollLeft = textareaRef.current.scrollLeft
      }
    }

    const textarea = textareaRef.current
    textarea?.addEventListener("scroll", syncScroll)

    return () => textarea?.removeEventListener("scroll", syncScroll)
  }, [])

  return (
    <div className="relative h-full">
      <Textarea
        ref={textareaRef}
        value={body}
        onChange={handleChange}
        placeholder={
          completion.length
            ? ""
            : "Body (start typing to activate generative autocomplete)"
        }
        style={
          completion.length
            ? { paddingBottom: "4rem" }
            : { paddingBottom: "0.5rem" }
        }
        className="absolute left-0 top-0 z-10 h-full resize-none bg-transparent outline-none"
      />
      {/* Completion overlay */}
      <div
        ref={completionRef}
        style={
          completion.length
            ? { paddingBottom: "4rem" }
            : { paddingBottom: "0.5rem" }
        }
        className="absolute left-0 top-0 z-0 size-full min-h-[60px] resize-none overflow-y-auto border border-transparent px-3 py-2 text-sm shadow-none outline-none placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className="invisible whitespace-pre-wrap">{body}</span>
        <span className="whitespace-pre-wrap text-muted-foreground">
          {(body?.endsWith(" ") ||
          [" ", ".", "?", "!"].some((char) => completion.startsWith(char))
            ? ""
            : " ") + completion}
        </span>
      </div>
    </div>
  )
}
