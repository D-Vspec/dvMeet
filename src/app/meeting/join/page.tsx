"use client"

import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

export default function JoinMeeting() {
  const router = useRouter()
  const [meetingCode, setMeetingCode] = useState<string>("")
  const [userName, setUserName] = useState<string>("")
  const [error, setError] = useState<string>("")
  const [nameError, setNameError] = useState<string>("")

  const handleJoin = (e: FormEvent): void => {
    e.preventDefault()
    let hasError = false

    if (!meetingCode.trim()) {
      setError("Please enter a meeting code")
      hasError = true
    } else if (meetingCode.length < 6) {
      setError("Invalid meeting code")
      hasError = true
    }

    if (!userName.trim()) {
      setNameError("Please enter your name")
      hasError = true
    }

    if (hasError) return

    // Navigate to the meeting room with the user name as a query parameter
    router.push(`/meeting/${meetingCode}?name=${encodeURIComponent(userName)}`)
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="bg-[#1a73e8] text-white">
        <div className="container mx-auto px-4 py-3 flex items-center">
          <div className="flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-6 w-6"
            >
              <path d="M15 10l4.553-2.276A1 1 0 0 1 21 8.618v6.764a1 1 0 0 1-1.447.894L15 14v-4z" />
              <rect x="1" y="6" width="15" height="12" rx="2" ry="2" />
            </svg>
            <span className="font-medium text-lg">Meet</span>
          </div>
        </div>
      </header>
      <main className="flex-1 bg-[#f8f9fa]">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-md mx-auto bg-white rounded-lg shadow-sm p-6 space-y-6">
            <h1 className="text-2xl font-semibold text-[#202124]">Join a meeting</h1>

            <form onSubmit={handleJoin} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="user-name" className="text-[#202124]">
                  Your name
                </Label>
                <Input
                  id="user-name"
                  placeholder="Enter your name"
                  value={userName}
                  onChange={(e) => {
                    setUserName(e.target.value)
                    setNameError("")
                  }}
                  className="text-[#3c4043]"
                />
                {nameError && <p className="text-sm text-[#ea4335]">{nameError}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="meeting-code" className="text-[#202124]">
                  Meeting code
                </Label>
                <Input
                  id="meeting-code"
                  placeholder="Enter meeting code"
                  value={meetingCode}
                  onChange={(e) => {
                    setMeetingCode(e.target.value)
                    setError("")
                  }}
                  className="text-[#3c4043]"
                />
                {error && <p className="text-sm text-[#ea4335]">{error}</p>}
              </div>

              <div className="pt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="camera" className="flex items-center gap-2 text-[#202124]">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-5 w-5 text-[#5f6368]"
                    >
                      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                      <circle cx="12" cy="13" r="3" />
                    </svg>
                    <span>Camera</span>
                  </Label>
                  <Switch id="camera" defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="microphone" className="flex items-center gap-2 text-[#202124]">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-5 w-5 text-[#5f6368]"
                    >
                      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                      <line x1="12" x2="12" y1="19" y2="22" />
                    </svg>
                    <span>Microphone</span>
                  </Label>
                  <Switch id="microphone" defaultChecked />
                </div>
              </div>

              <Button type="submit" className="w-full bg-[#1a73e8] hover:bg-[#1765cc] text-white" size="lg">
                Join meeting
              </Button>
            </form>
          </div>
        </div>
      </main>
    </div>
  )
}