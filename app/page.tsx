import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center bg-gradient-to-b from-blue-50 to-white">
      <div className="max-w-3xl">
        <h1 className="text-5xl font-bold mb-6 text-blue-900">Welcome to UnifiedAI</h1>
        <p className="mb-8 text-xl text-gray-700">Your complete AI assistant platform for all your needs</p>

        <div className="bg-white p-8 rounded-xl shadow-lg mb-8">
          <h2 className="text-2xl font-semibold mb-4 text-gray-800">Get Started Today</h2>
          <p className="mb-6 text-gray-600">
            Access our powerful AI tools by signing in to your account.
            New users can sign up in seconds.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              href="/auth/signin"
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-200"
            >
              Sign In
            </Link>
            <Link
              href="/auth/signup"
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-200"
            >
              Create Account
            </Link>
          </div>
        </div>

        <div className="text-gray-600">
          <p className="mb-4">
            For system administrators and troubleshooting
          </p>
          <Link
            href="/debug"
            className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200"
          >
            System Diagnostics
          </Link>
        </div>
      </div>
    </div>
  );
}
