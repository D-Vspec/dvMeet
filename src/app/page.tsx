"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Video, Users, Shield, Zap, ChevronRight, MessageSquare, Share2, Monitor } from "lucide-react"

export default function LandingPage() {
  const [scrollY, setScrollY] = useState(0)
  const [windowHeight, setWindowHeight] = useState(0)

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY)
    }

    setWindowHeight(window.innerHeight)
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const calculatePosition = () => {
    const endScrollPosition = windowHeight * 2

    // Starting position (centered)
    const startX = typeof window !== "undefined" ? window.innerWidth / 2 - 30 : 0
    const startY = 100

    // End position (fixed in bottom right)
    const endX = typeof window !== "undefined" ? window.innerWidth - 100 : 0
    const endY = typeof window !== "undefined" ? window.innerHeight - 100 : 0

    // Progress of the animation (0 to 1)
    const progress = Math.min(scrollY / endScrollPosition, 1)

    // Snap points at 0, 0.5, and 1
    let snapProgress = progress
    if (progress < 0.25) snapProgress = 0
    else if (progress < 0.75) snapProgress = 0.5
    else snapProgress = 1

    const x = startX + (endX - startX) * snapProgress
    const y = startY + (endY - startY) * snapProgress

    return {
      x,
      y,
      scale: 1 + snapProgress * 0.2,
      opacity: 1,
    }
  }

  const floatingPosition = calculatePosition()

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-zinc-900 to-neutral-900 text-white overflow-hidden">
      {/* Animated background elements */}
      <div className="fixed inset-0 z-0 opacity-10">
        {[...Array(20)].map((_, i) => (
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

      {/* Floating scroll-following element */}
      {typeof window !== "undefined" && (
        <motion.div
          className="fixed z-20 pointer-events-none"
          animate={{
            x: floatingPosition.x,
            y: floatingPosition.y,
            scale: floatingPosition.scale,
            opacity: floatingPosition.opacity,
          }}
          transition={{ type: "spring", damping: 30, stiffness: 200 }}
        >
          <div className="relative">
            <div className="absolute -inset-8 bg-gradient-to-r from-neutral-500/30 to-zinc-600/30 rounded-full blur-xl" />
            <div className="relative bg-gradient-to-r from-neutral-500 to-zinc-600 p-4 rounded-full shadow-lg">
              <Video className="h-12 w-12 text-white" />
            </div>
            {scrollY > windowHeight * 1.8 && (
              <motion.div
                className="absolute -right-4 -bottom-4 bg-white text-zinc-900 rounded-full p-1 shadow-lg"
                initial={{ scale: 0, rotate: -30 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", damping: 10 }}
              >
                <motion.div
                  animate={{ rotate: [0, 10, 0, -10, 0] }}
                  transition={{ repeat: Number.POSITIVE_INFINITY, duration: 2 }}
                >
                  <Zap className="h-5 w-5" />
                </motion.div>
              </motion.div>
            )}
          </div>
        </motion.div>
      )}

      {/* Header */}
      <header className="relative z-10">
        <div className="container mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
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
                WaveMeet
              </motion.span>
            </div>
            <nav>
              <ul className="flex gap-8 items-center">
                <motion.li
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                >
                  <Link href="#features" className="hover:text-neutral-300 transition-colors">
                    Features
                  </Link>
                </motion.li>
                <motion.li
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.5 }}
                >
                  <Link href="#how-it-works" className="hover:text-neutral-300 transition-colors">
                    How It Works
                  </Link>
                </motion.li>
                <motion.li
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, duration: 0.5 }}
                >
                  <Link href="/join-meeting" className="hover:text-neutral-300 transition-colors">
                    Join
                  </Link>
                </motion.li>
                <motion.li
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.6, duration: 0.5 }}
                >
                  <Link href="/meeting/new">
                    <Button className="bg-gradient-to-r from-neutral-700 to-zinc-800 hover:from-neutral-800 hover:to-zinc-900 text-white border-0 rounded-full px-6">
                      Start Meeting
                    </Button>
                  </Link>
                </motion.li>
              </ul>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 py-20">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center gap-12">
            <motion.div
              className="md:w-1/2 space-y-6"
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7 }}
            >
              <h1 className="text-5xl md:text-6xl font-bold leading-tight">
                Connect{" "}
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-neutral-400 to-zinc-400">
                  Instantly
                </span>{" "}
                With Crystal Clear Video
              </h1>
              <p className="text-xl text-neutral-200">
                Experience seamless video meetings with stunning quality and powerful features. Connect with anyone,
                anywhere, anytime.
              </p>
              <div className="flex gap-4 pt-4">
                <Link href="/meeting/new">
                  <Button className="bg-gradient-to-r from-neutral-700 to-zinc-800 hover:from-neutral-800 hover:to-zinc-900 text-white border-0 rounded-full px-8 py-6 text-lg">
                    Start a Meeting
                    <ChevronRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link href="/join-meeting">
                  <Button
                    variant="outline"
                    className="border-neutral-400 text-neutral-200 hover:bg-zinc-900/30 rounded-full px-8 py-6 text-lg"
                  >
                    Join Meeting
                  </Button>
                </Link>
              </div>
            </motion.div>
            <motion.div
              className="md:w-1/2 relative"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.7 }}
            >
              <div className="relative">
                <motion.div
                  className="absolute -top-10 -left-10 w-full h-full rounded-2xl bg-gradient-to-r from-neutral-500 to-zinc-600 opacity-50 blur-xl"
                  animate={{
                    scale: [1, 1.05, 1],
                    rotate: [0, 1, 0],
                  }}
                  transition={{
                    duration: 5,
                    repeat: Number.POSITIVE_INFINITY,
                    repeatType: "reverse",
                  }}
                />
                <div className="relative bg-gradient-to-r from-zinc-900 to-neutral-900 p-1 rounded-2xl shadow-2xl">
                  <div className="bg-gradient-to-br from-zinc-950 to-neutral-950 rounded-xl overflow-hidden">
                    <img
                      src="/placeholder.svg?height=400&width=600"
                      alt="Video conference"
                      className="w-full h-auto rounded-xl opacity-90"
                    />
                    <div className="absolute bottom-4 left-4 right-4 flex justify-between">
                      <div className="flex -space-x-2">
                        {[...Array(4)].map((_, i) => (
                          <motion.div
                            key={i}
                            className="w-10 h-10 rounded-full border-2 border-zinc-700 overflow-hidden"
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: 0.5 + i * 0.1, duration: 0.5 }}
                          >
                            <img
                              src={`/placeholder.svg?height=40&width=40&text=User${i + 1}`}
                              alt={`User ${i + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </motion.div>
                        ))}
                      </div>
                      <motion.div
                        className="flex gap-2"
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.8, duration: 0.5 }}
                      >
                        <Button
                          size="icon"
                          variant="outline"
                          className="rounded-full bg-zinc-950/50 border-zinc-700 text-neutral-300 h-10 w-10"
                        >
                          <MessageSquare className="h-5 w-5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          className="rounded-full bg-zinc-950/50 border-zinc-700 text-neutral-300 h-10 w-10"
                        >
                          <Share2 className="h-5 w-5" />
                        </Button>
                      </motion.div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative z-10 py-20 bg-gradient-to-b from-transparent to-zinc-950/50">
        <div className="container mx-auto px-4">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <h2 className="text-4xl font-bold mb-4">Powerful Features</h2>
            <p className="text-xl text-neutral-200 max-w-2xl mx-auto">
              Everything you need for perfect video meetings, all in one place
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <Users className="h-10 w-10" />,
                title: "Unlimited Participants",
                description: "Host meetings with as many people as you need, with no restrictions on meeting size.",
              },
              {
                icon: <Shield className="h-10 w-10" />,
                title: "End-to-End Encryption",
                description: "Your conversations stay private with our advanced security protocols.",
              },
              {
                icon: <Monitor className="h-10 w-10" />,
                title: "Screen Sharing",
                description: "Share your screen with one click for seamless presentations and collaboration.",
              },
              {
                icon: <MessageSquare className="h-10 w-10" />,
                title: "Live Chat",
                description: "Send messages during meetings without interrupting the speaker.",
              },
              {
                icon: <Share2 className="h-10 w-10" />,
                title: "Easy Sharing",
                description: "Share meeting links instantly via email, message, or calendar invite.",
              },
              {
                icon: <Zap className="h-10 w-10" />,
                title: "Low Latency",
                description: "Experience real-time communication with our optimized infrastructure.",
              },
            ].map((feature, index) => (
              <motion.div
                key={index}
                className="bg-gradient-to-br from-zinc-900/50 to-neutral-900/50 p-8 rounded-2xl backdrop-blur-sm border border-zinc-800/30"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index, duration: 0.5 }}
                whileHover={{
                  y: -10,
                  boxShadow: "0 20px 25px -5px rgba(24, 24, 27, 0.1), 0 10px 10px -5px rgba(24, 24, 27, 0.04)",
                }}
              >
                <div className="text-neutral-400 mb-4">{feature.icon}</div>
                <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                <p className="text-neutral-200">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="relative z-10 py-20">
        <div className="container mx-auto px-4">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <h2 className="text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-xl text-neutral-200 max-w-2xl mx-auto">Get started in seconds with these simple steps</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              {
                step: "01",
                title: "Create a Meeting",
                description: "Click 'Start Meeting' to generate a unique meeting link instantly.",
              },
              {
                step: "02",
                title: "Share the Link",
                description: "Send the meeting link to participants via email, message, or calendar.",
              },
              {
                step: "03",
                title: "Connect & Collaborate",
                description: "Join the meeting and enjoy crystal clear video and audio communication.",
              },
            ].map((step, index) => (
              <motion.div
                key={index}
                className="text-center relative"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 * index, duration: 0.7 }}
              >
                <motion.div
                  className="text-6xl font-bold text-zinc-700/30 absolute -top-10 left-1/2 transform -translate-x-1/2"
                  animate={{
                    y: [0, 10, 0],
                  }}
                  transition={{
                    duration: 4,
                    repeat: Number.POSITIVE_INFINITY,
                    repeatType: "reverse",
                    delay: index * 0.5,
                  }}
                >
                  {step.step}
                </motion.div>
                <div className="bg-gradient-to-br from-zinc-900/30 to-neutral-900/30 p-8 rounded-2xl backdrop-blur-sm border border-zinc-800/20 relative z-10">
                  <h3 className="text-xl font-bold mb-2">{step.title}</h3>
                  <p className="text-neutral-200">{step.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 py-20">
        <div className="container mx-auto px-4">
          <motion.div
            className="bg-gradient-to-r from-zinc-800/40 to-neutral-800/40 rounded-3xl p-12 text-center max-w-4xl mx-auto backdrop-blur-sm border border-zinc-700/30"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <h2 className="text-4xl font-bold mb-4">Ready to Connect?</h2>
            <p className="text-xl text-neutral-200 mb-8 max-w-2xl mx-auto">
              Start your first meeting now and experience the difference. No downloads required.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/meeting/new">
                <Button className="bg-gradient-to-r from-neutral-700 to-zinc-800 hover:from-neutral-800 hover:to-zinc-900 text-white border-0 rounded-full px-8 py-6 text-lg w-full sm:w-auto">
                  Start a Meeting
                  <ChevronRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/meeting/join">
                <Button
                  variant="outline"
                  className="border-neutral-400 text-neutral-200 hover:bg-zinc-900/30 rounded-full px-8 py-6 text-lg w-full sm:w-auto"
                >
                  Join Meeting
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-12 bg-zinc-950/80 backdrop-blur-sm border-t border-zinc-900/50">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-2 mb-6 md:mb-0">
              <Video className="h-6 w-6 text-neutral-400" />
              <span className="font-bold text-xl bg-clip-text text-transparent bg-gradient-to-r from-neutral-400 to-zinc-400">
                WaveMeet
              </span>
            </div>
            <div className="flex gap-8 mb-6 md:mb-0">
              <Link href="#" className="text-neutral-300 hover:text-white transition-colors">
                Privacy
              </Link>
              <Link href="#" className="text-neutral-300 hover:text-white transition-colors">
                Terms
              </Link>
              <Link href="#" className="text-neutral-300 hover:text-white transition-colors">
                Help
              </Link>
              <Link href="#" className="text-neutral-300 hover:text-white transition-colors">
                Contact
              </Link>
            </div>
            <div className="text-neutral-400">© 2025 WaveMeet. All rights reserved.</div>
          </div>
        </div>
      </footer>
    </div>
  )
}