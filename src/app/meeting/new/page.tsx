"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Video, ArrowLeft, Camera, Mic, Copy, Link2 } from "lucide-react";
import { toast } from "sonner";

export default function NewMeeting() {
  const router = useRouter();
  const [meetingId, setMeetingId] = useState<string>("");
  const [userName, setUserName] = useState<string>("");
  const [nameError, setNameError] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [windowWidth, setWindowWidth] = useState<number>(1000);
  const [windowHeight, setWindowHeight] = useState<number>(1000);

  useEffect(() => {
    const id = Math.random().toString(36).substring(2, 12);
    setMeetingId(id);

    if (typeof window !== "undefined") {
      setWindowWidth(window.innerWidth);
      setWindowHeight(window.innerHeight);
    }

    setIsLoading(false);
  }, []);

  const copyLink = () => {
    navigator.clipboard.writeText(`https://dvmeet.com/${meetingId}`);
    toast.success("Link copied!", {
      description: "Meeting link has been copied to clipboard",
    });
  };

  const startMeeting = (): void => {
    if (!userName.trim()) {
      setNameError("Please enter your name");
      return;
    }

    router.push(`/meeting/${meetingId}?name=${encodeURIComponent(userName)}`);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 },
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-black via-zinc-900 to-neutral-900">
        <div className="relative">
          <div className="h-16 w-16 rounded-full border-4 border-neutral-300 border-t-transparent animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Video className="h-6 w-6 text-neutral-300" />
          </div>
        </div>
      </div>
    );
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
              x: Math.random() * windowWidth,
              y: Math.random() * windowHeight,
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
              <Button
                variant="ghost"
                className="text-neutral-300 hover:text-white hover:bg-zinc-800/30"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Home
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10 flex-1">
        <div className="container mx-auto px-4 py-12">
          <motion.div
            className="max-w-md mx-auto"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.div
              className="bg-gradient-to-br from-zinc-900/70 to-neutral-900/70 rounded-2xl backdrop-blur-sm border border-zinc-700/30 shadow-xl overflow-hidden"
              variants={itemVariants}
            >
              <div className="p-8">
                <motion.h1
                  className="text-3xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-neutral-300 to-zinc-300"
                  variants={itemVariants}
                >
                  Your Meeting is Ready
                </motion.h1>
                <motion.p
                  className="text-neutral-200 mb-6"
                  variants={itemVariants}
                >
                  Share the link with others or join now
                </motion.p>

                <div className="space-y-6">
                  <motion.div variants={itemVariants}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Link2 className="h-5 w-5 text-neutral-400" />
                        <span className="text-sm font-medium text-neutral-100">
                          Meeting link
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={copyLink}
                        className="h-8 gap-1 text-neutral-300 hover:bg-zinc-800/30 hover:text-white"
                      >
                        <Copy className="h-4 w-4" />
                        Copy
                      </Button>
                    </div>
                    <div className="relative">
                      <Input
                        value={`https://dvmeet.com/${meetingId}`}
                        readOnly
                        className="bg-zinc-950/50 border-zinc-700/50 text-neutral-200 pr-20"
                      />
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-transparent to-zinc-900/50 pointer-events-none"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1, duration: 1 }}
                      />
                    </div>
                  </motion.div>

                  <motion.div className="space-y-2" variants={itemVariants}>
                    <Label htmlFor="user-name" className="text-neutral-100">
                      Your name
                    </Label>
                    <Input
                      id="user-name"
                      placeholder="Enter your name"
                      value={userName}
                      onChange={(e) => {
                        setUserName(e.target.value);
                        setNameError("");
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

                  <motion.div
                    className="pt-4 space-y-4"
                    variants={itemVariants}
                  >
                    <div className="flex items-center justify-between">
                      <Label
                        htmlFor="camera"
                        className="flex items-center gap-2 text-neutral-100"
                      >
                        <Camera className="h-5 w-5 text-neutral-400" />
                        <span>Camera</span>
                      </Label>
                      <Switch
                        id="camera"
                        defaultChecked
                        className="data-[state=checked]:bg-neutral-500"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label
                        htmlFor="microphone"
                        className="flex items-center gap-2 text-neutral-100"
                      >
                        <Mic className="h-5 w-5 text-neutral-400" />
                        <span>Microphone</span>
                      </Label>
                      <Switch
                        id="microphone"
                        defaultChecked
                        className="data-[state=checked]:bg-neutral-500"
                      />
                    </div>
                  </motion.div>

                  <motion.div variants={itemVariants}>
                    <Button
                      onClick={startMeeting}
                      className="w-full bg-gradient-to-r from-neutral-700 to-zinc-800 hover:from-neutral-800 hover:to-zinc-900 text-white border-0 rounded-xl py-6 text-lg"
                    >
                      Join Now
                    </Button>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
