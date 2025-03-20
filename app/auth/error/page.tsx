import { Suspense } from 'react';
import ErrorContent from './error-content';
import { PanelLeft } from 'lucide-react';

export default function AuthErrorPage() {
    return (
        <div className="bg-white flex h-screen overflow-hidden">
            {/* Left side - Branding */}
            <div className="hidden sm:flex sm:w-1/2 lg:w-1/3 bg-gray-50 items-center justify-center p-8">
                <div className="max-w-md">
                    <div className="flex items-center mb-8">
                        <PanelLeft className="w-8 h-8 text-gray-900" />
                        <h1 className="ml-2 text-2xl font-semibold text-gray-900">UnifiedAI</h1>
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900 mb-4">Authentication Error</h2>
                    <p className="text-gray-600">We encountered a problem while trying to authenticate you.</p>
                </div>
            </div>

            {/* Right side - Error message */}
            <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
                <div className="w-full max-w-md">
                    {/* Mobile logo */}
                    <div className="sm:hidden flex items-center justify-center mb-8">
                        <PanelLeft className="w-8 h-8 text-gray-900" />
                        <h1 className="ml-2 text-2xl font-semibold text-gray-900">UnifiedAI</h1>
                    </div>

                    <Suspense fallback={<div className="p-6 text-center">Loading error details...</div>}>
                        <ErrorContent />
                    </Suspense>
                </div>
            </div>
        </div>
    );
} 