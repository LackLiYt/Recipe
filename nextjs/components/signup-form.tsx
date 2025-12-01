import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { signup } from "@/app/signup/actions"
import Link from "next/link"
import { AlertCircle, CheckCircle2 } from "lucide-react"

export function SignupForm({
  className,
  error,
  message,
  ...props
}: React.ComponentProps<"div"> & {
  error?: string
  message?: string
}) {
  return (
    <div className={cn("flex flex-col", className)} {...props}>
      <div className="rounded-2xl shadow-xl border border-border bg-card text-card-foreground p-8">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-foreground mb-2">Create your account</h2>
          <p className="text-sm text-muted-foreground">
            Get started with Melodora today
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {message && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
            <p className="text-sm text-green-700">{message}</p>
          </div>
        )}

        <form action={signup}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="email" className="font-medium mb-1.5 text-foreground">
                Email address
              </FieldLabel>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                required
                className="h-11 border-input bg-background focus:border-blue-500 focus:ring-blue-500"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="password" className="font-medium mb-1.5 text-foreground">
                Password
              </FieldLabel>
              <Input
                id="password"
                name="password"
                type="password"
                required
                className="h-11 border-input bg-background focus:border-blue-500 focus:ring-blue-500"
              />
              <FieldDescription className="text-xs text-muted-foreground mt-1.5">
                Must be at least 8 characters long
              </FieldDescription>
            </Field>
            <Field>
              <Button 
                type="submit" 
                className="w-full h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-md hover:shadow-lg transition-all"
              >
                Create account
              </Button>
              <FieldDescription className="text-center text-sm text-muted-foreground mt-4">
                Already have an account?{" "}
                <Link href="/login" className="text-blue-600 hover:text-blue-700 font-semibold">
                  Sign in
                </Link>
              </FieldDescription>
            </Field>
          </FieldGroup>
        </form>
      </div>
    </div>
  )
}
