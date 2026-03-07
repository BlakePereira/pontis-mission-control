"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Copy, ExternalLink } from "lucide-react";

function CallbackContent() {
  const searchParams = useSearchParams();
  const [copied, setCopied] = useState(false);

  if (!searchParams) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-8">
        <Card className="bg-[#0f0f0f] border-red-500/20 max-w-2xl">
          <CardHeader>
            <CardTitle className="text-red-500">❌ Authorization Failed</CardTitle>
            <CardDescription className="text-gray-400">No parameters received</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => window.location.href = '/market-intelligence'}
              className="bg-[#10b981] hover:bg-[#059669]"
            >
              Back to Market Intelligence
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const error = searchParams.get('error');
  const success = searchParams.get('success');
  const refreshToken = searchParams.get('refresh_token');
  const accessToken = searchParams.get('access_token');
  const expiryDate = searchParams.get('expiry_date');

  if (error) {
    const errorMessages: Record<string, string> = {
      'no_code': 'No authorization code was received from Google.',
      'exchange_failed': 'Failed to exchange authorization code for tokens. Please try again.',
      'access_denied': 'You denied access to the Google Ads account.',
    };

    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-8">
        <Card className="bg-[#0f0f0f] border-red-500/20 max-w-2xl">
          <CardHeader>
            <CardTitle className="text-red-500">❌ Authorization Failed</CardTitle>
            <CardDescription className="text-gray-400">
              {errorMessages[error] || error}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => window.location.href = '/market-intelligence'}
              className="bg-[#10b981] hover:bg-[#059669]"
            >
              Back to Market Intelligence
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!success || !refreshToken) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-8">
        <Card className="bg-[#0f0f0f] border-red-500/20 max-w-2xl">
          <CardHeader>
            <CardTitle className="text-red-500">❌ Authorization Failed</CardTitle>
            <CardDescription className="text-gray-400">No refresh token received. Please try again.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => window.location.href = '/market-intelligence'}
              className="bg-[#10b981] hover:bg-[#059669]"
            >
              Back to Market Intelligence
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Success Header */}
        <Card className="bg-[#0f0f0f] border-[#10b981]/20">
          <CardHeader>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-8 w-8 text-[#10b981]" />
              <div>
                <CardTitle className="text-white">✅ Google Ads Authorized Successfully</CardTitle>
                <CardDescription className="text-gray-400">
                  Your refresh token is ready. Add it to Vercel to complete the integration.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Instructions */}
        <Card className="bg-[#0f0f0f] border-[#2a2a2a]">
          <CardHeader>
            <CardTitle className="text-white">📝 Next Steps</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="text-white font-medium mb-2">1. Copy your refresh token</h4>
              <div className="bg-[#1a1a1a] p-4 rounded border border-[#2a2a2a] font-mono text-sm break-all">
                <div className="flex items-start justify-between gap-4">
                  <code className="text-gray-300 flex-1">{refreshToken}</code>
                  <Button
                    size="sm"
                    onClick={() => copyToClipboard(refreshToken)}
                    className="bg-[#10b981] hover:bg-[#059669] shrink-0"
                  >
                    {copied ? (
                      <>
                        <CheckCircle2 size={14} className="mr-1" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy size={14} className="mr-1" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-white font-medium mb-2">2. Add to Vercel environment variables</h4>
              <ol className="list-decimal list-inside space-y-2 text-gray-400 text-sm">
                <li>Go to <a href="https://vercel.com/pontis/mission-control/settings/environment-variables" target="_blank" rel="noopener noreferrer" className="text-[#10b981] hover:underline inline-flex items-center gap-1">Vercel → mission-control → Settings → Environment Variables <ExternalLink size={12} /></a></li>
                <li>Click &quot;Add New&quot;</li>
                <li>
                  Set:
                  <ul className="list-disc list-inside ml-6 mt-1 space-y-1">
                    <li><code className="bg-[#1a1a1a] px-2 py-0.5 rounded">Name: GOOGLE_ADS_REFRESH_TOKEN</code></li>
                    <li><code className="bg-[#1a1a1a] px-2 py-0.5 rounded">Value: (paste the token above)</code></li>
                    <li>Environment: Production, Preview, Development (select all)</li>
                  </ul>
                </li>
                <li>Click &quot;Save&quot;</li>
              </ol>
            </div>

            <div>
              <h4 className="text-white font-medium mb-2">3. Redeploy Mission Control</h4>
              <p className="text-gray-400 text-sm mb-2">
                After adding the env var, trigger a redeploy so the new token is available.
              </p>
              <Button
                asChild
                className="bg-[#10b981] hover:bg-[#059669]"
              >
                <a 
                  href="https://vercel.com/pontis/mission-control" 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  <ExternalLink size={14} className="mr-2" />
                  Open Vercel Dashboard
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Additional Token Info (for debugging) */}
        <Card className="bg-[#0f0f0f] border-[#2a2a2a]">
          <CardHeader>
            <CardTitle className="text-white text-sm">🔧 Token Details (for debugging)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-gray-500">Access Token (expires in 1 hour):</span>
                <code className="block bg-[#1a1a1a] p-2 rounded mt-1 text-gray-400 break-all font-mono text-xs">
                  {accessToken || 'N/A'}
                </code>
              </div>
              <div>
                <span className="text-gray-500">Expires:</span>
                <code className="block bg-[#1a1a1a] p-2 rounded mt-1 text-gray-400 font-mono text-xs">
                  {expiryDate ? new Date(Number(expiryDate)).toLocaleString() : 'N/A'}
                </code>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Back Button */}
        <div className="flex justify-center">
          <Button
            onClick={() => window.location.href = '/market-intelligence'}
            variant="outline"
            className="border-[#2a2a2a] hover:bg-[#1a1a1a]"
          >
            Back to Market Intelligence
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function GoogleAdsCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#10b981] mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    }>
      <CallbackContent />
    </Suspense>
  );
}
