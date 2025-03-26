"use client"

import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Video, ArrowLeft, Camera, Mic } from "lucide-react"

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

    router.push(`/meeting/${meetingCode}?name=${encodeURIComponent(userName)}`)
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  }

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 },
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-zinc-900 to-neutral-900 text-white">
      {/* Animated background elements */}
      <div className="fixed inset-0 z-0 opacity-10">
        {[...Array(15)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-white"
            initial={{
              width: Math.random() * 300 + 50,
              height: Math.random() * 300 + 50,
              x: Math.random() * window.innerWidth,
              y: Math.random() * window.innerHeight,
              opacity: Math.random() * 0.5,
            }}
            animate={{
              y: [0, Math.random() * 100 - 50],
              x: [0, Math.random() * 100 - 50],
            }}
            transition={{
              duration: Math.random() * 10 + 10,
              repeat: Number.POSITIVE_INFINITY,
              repeatType: "reverse",
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      <header className="relative z-10">
        <div className="container mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <Link href="/" className="flex items-center gap-2">
              <motion.div
                initial={{ rotate: -10, scale: 0.9 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ duration: 0.5 }}
              >
                <Video className="h-8 w-8 text-neutral-300" />
              </motion.div>
              <motion.span
                className="font-bold text-2xl bg-clip-text text-transparent bg-gradient-to-r from-neutral-300 to-zinc-300"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
              >
                dvMeet
              </motion.span>
            </Link>
            <Link href="/">
              <Button variant="ghost" className="text-neutral-300 hover:text-white hover:bg-zinc-800/30">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Home
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10 flex-1">
        <div className="container mx-auto px-4 py-12">
          <motion.div className="max-w-md mx-auto" variants={containerVariants} initial="hidden" animate="visible">
            <motion.div
              className="bg-gradient-to-br from-zinc-900/70 to-neutral-900/70 rounded-2xl backdrop-blur-sm border border-zinc-700/30 shadow-xl overflow-hidden"
              variants={itemVariants}
            >
              <div className="p-8">
                <motion.h1
                  className="text-3xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-neutral-300 to-zinc-300"
                  variants={itemVariants}
                >
                  Join a Meeting
                </motion.h1>
                <motion.p className="text-neutral-200 mb-6" variants={itemVariants}>
                  Enter the meeting code and your name to connect
                </motion.p>

                <form onSubmit={handleJoin} className="space-y-6">
                  <motion.div className="space-y-2" variants={itemVariants}>
                    <Label htmlFor="user-name" className="text-neutral-100">
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
                      className="bg-zinc-950/50 border-zinc-700/50 text-white placeholder:text-neutral-400 focus:border-neutral-500 transition-all"
                    />
                    {nameError && (
                      <motion.p
                        className="text-sm text-red-400"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        {nameError}
                      </motion.p>
                    )}
                  </motion.div>

                  <motion.div className="space-y-2" variants={itemVariants}>
                    <Label htmlFor="meeting-code" className="text-neutral-100">
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
                      className="bg-zinc-950/50 border-zinc-700/50 text-white placeholder:text-neutral-400 focus:border-neutral-500 transition-all"
                    />
                    {error && (
                      <motion.p
                        className="text-sm text-red-400"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        {error}
                      </motion.p>
                    )}
                  </motion.div>

                  <motion.div className="pt-4 space-y-4" variants={itemVariants}>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="camera" className="flex items-center gap-2 text-neutral-100">
                        <Camera className="h-5 w-5 text-neutral-400" />
                        <span>Camera</span>
                      </Label>
                      <Switch id="camera" defaultChecked className="data-[state=checked]:bg-neutral-500" />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="microphone" className="flex items-center gap-2 text-neutral-100">
                        <Mic className="h-5 w-5 text-neutral-400" />
                        <span>Microphone</span>
                      </Label>
                      <Switch id="microphone" defaultChecked className="data-[state=checked]:bg-neutral-500" />
                    </div>
                  </motion.div>

                  <motion.div variants={itemVariants}>
                    <Button
                      type="submit"
                      className="w-full bg-gradient-to-r from-neutral-700 to-zinc-800 hover:from-neutral-800 hover:to-zinc-900 text-white border-0 rounded-xl py-6 text-lg"
                    >
                      Join Meeting
                    </Button>
                  </motion.div>
                </form>
              </div>
            </motion.div>

            <motion.div className="mt-6 text-center" variants={itemVariants}>
              <Link href="/new-meeting" className="text-neutral-300 hover:text-white transition-colors">
                Don't have a code? Start a new meeting instead
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </main>
    </div>
  )
}