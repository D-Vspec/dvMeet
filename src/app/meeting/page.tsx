import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="bg-[#1a73e8] text-white">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
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
          <div className="flex items-center gap-4">
            <Button variant="ghost" className="text-white hover:bg-blue-700">
              Settings
            </Button>
            <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center text-sm font-medium">
              JD
            </div>
          </div>
        </div>
      </header>
      <main className="flex-1 bg-[#f8f9fa]">
        <div className="container mx-auto px-4 py-12 flex flex-col items-center">
          <div className="max-w-3xl w-full text-center space-y-6">
            <h1 className="text-3xl font-semibold text-[#202124] sm:text-4xl">
              Premium video meetings. Now free for everyone.
            </h1>
            <p className="text-lg text-[#5f6368]">
              We re-engineered the service we built for secure business meetings, Google Meet, to make it free and
              available for all.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button asChild size="lg" className="bg-[#1a73e8] hover:bg-[#1765cc] text-white">
                <Link href="/meeting/new">New meeting</Link>
              </Button>
              <div className="flex">
                <Input
                  placeholder="Enter a code or link"
                  className="rounded-r-none focus-visible:ring-0 focus-visible:ring-offset-0 border-r-0"
                />
                <Button asChild variant="outline" className="rounded-l-none border-l-0">
                  <Link href="/meeting/join">Join</Link>
                </Button>
              </div>
            </div>
          </div>
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl w-full">
            <div className="text-center space-y-3">
              <div className="mx-auto h-12 w-12 flex items-center justify-center">
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
                  className="h-10 w-10 text-[#1a73e8]"
                >
                  <path d="M21 12a9 9 0 0 1-9 9m9-9a9 9 0 0 0-9-9m9 9H3m9 9a9 9 0 0 1-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-[#202124]">Get a link you can share</h3>
              <p className="text-[#5f6368]">
                Click New meeting to get a link you can send to people you want to meet with
              </p>
            </div>
            <div className="text-center space-y-3">
              <div className="mx-auto h-12 w-12 flex items-center justify-center">
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
                  className="h-10 w-10 text-[#1a73e8]"
                >
                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-[#202124]">Plan ahead</h3>
              <p className="text-[#5f6368]">
                Click New meeting to schedule meetings in Google Calendar and send invites to participants
              </p>
            </div>
            <div className="text-center space-y-3">
              <div className="mx-auto h-12 w-12 flex items-center justify-center">
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
                  className="h-10 w-10 text-[#1a73e8]"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <path d="M3 9h18" />
                  <path d="M9 21V9" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-[#202124]">Your meeting is safe</h3>
              <p className="text-[#5f6368]">No one can join a meeting unless invited or admitted by the host</p>
            </div>
          </div>
        </div>
      </main>
      <footer className="bg-white border-t py-6">
        <div className="container mx-auto px-4">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="text-sm text-[#5f6368]">
              <select className="bg-transparent border-none text-[#5f6368] text-sm focus:ring-0">
                <option>English</option>
                <option>Spanish</option>
                <option>French</option>
                <option>German</option>
              </select>
            </div>
            <div className="flex gap-6 text-sm text-[#5f6368]">
              <a href="#" className="hover:text-[#202124]">
                Help
              </a>
              <a href="#" className="hover:text-[#202124]">
                Privacy
              </a>
              <a href="#" className="hover:text-[#202124]">
                Terms
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

