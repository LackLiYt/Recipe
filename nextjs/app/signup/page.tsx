import { Music } from "lucide-react"
import { SignupForm } from "@/components/signup-form"

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>
}) {
  const params = await searchParams
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground dark:bg-background dark:text-foreground p-4">
      <div className="w-full max-w-md">
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl shadow-lg mb-4">
            <Music className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Melodora</h1>
          <p className="text-gray-600 dark:text-gray-300">Create your account to get started</p>
        </div>
        
        <SignupForm error={params.error} message={params.message} />
      </div>
    </div>
  )
}
