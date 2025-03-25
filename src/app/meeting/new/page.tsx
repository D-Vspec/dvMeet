"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Copy, Link2 } from "lucide-react"

export default function NewMeeting() {
  const router = useRouter()
  const [meetingId, setMeetingId] = useState<string>("")
  const [userName, setUserName] = useState<string>("")
  const [nameError, setNameError] = useState<string>("")
  const [isLoading, setIsLoading] = useState<boolean>(true)

  useEffect(() => {
    const id = Math.random().toString(36).substring(2, 12)
    setMeetingId(id)
    setIsLoading(false)
  }, [])

  const copyLink = () => {
    navigator.clipboard.writeText(`https://meet.example.com/${meetingId}`)
  }

  const startMeeting = (): void => {
    if (!userName.trim()) {
      setNameError("Please enter your name")
      return
    }
    
    router.push(`/meeting/${meetingId}?name=${encodeURIComponent(userName)}`)
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1a73e8]"></div>
      </div>
    )
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
            <h1 className="text-2xl font-semibold text-[#202124]">Your meeting is ready</h1>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Link2 className="h-5 w-5 text-[#5f6368]" />
                  <span className="text-sm font-medium text-[#202124]">Meeting link</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={copyLink}
                  className="h-8 gap-1 text-[#1a73e8] hover:bg-[#e8f0fe] hover:text-[#1a73e8]"
                >
                  <Copy className="h-4 w-4" />
                  Copy
                </Button>
              </div>
              <Input value={`https://meet.example.com/${meetingId}`} readOnly className="text-[#5f6368]" />
              
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
                      <line x1="8" y1="22" x2="16" y2="22" />
                    </svg>
                    <span>Microphone</span>
                  </Label>
                  <Switch id="microphone" defaultChecked />
                </div>
              </div>
            </div>

            <div className="pt-4">
              <Button onClick={startMeeting} className="w-full bg-[#1a73e8] hover:bg-[#1765cc] text-white" size="lg">
                Join now
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}