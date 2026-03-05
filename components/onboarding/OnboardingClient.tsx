"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Building2, Handshake, Users, Copy, Check, ChevronDown, ChevronRight, Mail, Video, Calculator, FileText } from "lucide-react";
import DocumentsTab from "./DocumentsTab";

export default function OnboardingClient() {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  
  // Revenue Calculator State
  const [companyName, setCompanyName] = useState("Monument Company");
  const [monumentsPerYear, setMonumentsPerYear] = useState(200);
  const [medallionPrice, setMedallionPrice] = useState(25);
  const [subscriptionRate, setSubscriptionRate] = useState(15);
  const [subscriptionValue, setSubscriptionValue] = useState(149);

  // Video Library State
  const [videos, setVideos] = useState([
    {
      id: "pontis-2min",
      title: "Pontis in 2 Minutes",
      description: "Quick overview for cold outreach",
      status: "Not yet recorded",
      audience: "All",
      link: ""
    },
    {
      id: "dashboard-tour",
      title: "Monument Company Dashboard Tour",
      description: "What partners see when they log in",
      status: "Not yet recorded",
      audience: "Monument Companies",
      link: ""
    },
    {
      id: "family-walkthrough",
      title: "Family Experience Walkthrough",
      description: "QR scan → memorial → flowers",
      status: "Not yet recorded",
      audience: "Families",
      link: ""
    },
    {
      id: "florist-orders",
      title: "Florist Partner: How Orders Work",
      description: "Order flow, delivery, payouts",
      status: "Not yet recorded",
      audience: "Florists",
      link: ""
    },
    {
      id: "installation-guide",
      title: "Installation & Activation Guide",
      description: "How to install and activate a medallion",
      status: "Not yet recorded",
      audience: "Monument Companies",
      link: ""
    }
  ]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleSection = (id: string) => {
    setExpandedSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const updateVideoLink = (id: string, link: string) => {
    setVideos(prev => prev.map(v => v.id === id ? { ...v, link } : v));
  };

  const toggleVideoStatus = (id: string) => {
    setVideos(prev => prev.map(v => 
      v.id === id 
        ? { ...v, status: v.status === "Not yet recorded" ? "Recorded" : "Not yet recorded" }
        : v
    ));
  };

  // Revenue Calculator
  const annualMedallionRevenue = monumentsPerYear * medallionPrice;
  const annualSubscriptionRevenue = monumentsPerYear * (subscriptionRate / 100) * subscriptionValue;
  const totalAnnualRevenue = annualMedallionRevenue + annualSubscriptionRevenue;
  const monthlyRecurring = annualSubscriptionRevenue / 12;
  const partnerResidual = annualSubscriptionRevenue * 0.1;

  const generateOnePagerText = () => {
    return `${companyName} - Pontis Revenue Projection

ANNUAL REVENUE OPPORTUNITY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Medallion Revenue:        $${annualMedallionRevenue.toLocaleString()}
Subscription Revenue:     $${annualSubscriptionRevenue.toLocaleString()}
Total Annual Revenue:     $${totalAnnualRevenue.toLocaleString()}
Monthly Recurring:        $${monthlyRecurring.toLocaleString()}
Partner Residual (10%):   $${partnerResidual.toLocaleString()}

ASSUMPTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• ${monumentsPerYear} monuments per year
• $${medallionPrice} per medallion
• ${subscriptionRate}% family subscription rate
• $${subscriptionValue}/year average subscription value

WHY PONTIS?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ Turn every headstone into a living digital memorial
✓ Families access from anywhere via QR code
✓ Recurring revenue from flower deliveries & cleaning services
✓ Zero ongoing work after installation
✓ Build lasting relationships with families
✓ Modern, tech-forward offering that differentiates you

NEXT STEPS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Order initial medallion batch
2. 15-minute team training
3. Install on next headstones
4. Start earning recurring revenue

Contact: Blake Pereira | blake@pontis.life | pontis.life`;
  };

  const Section = ({ 
    id, 
    title, 
    children 
  }: { 
    id: string; 
    title: string; 
    children: React.ReactNode;
  }) => {
    const isExpanded = expandedSections[id];
    return (
      <div className="border border-[#2a2a2a] rounded-lg mb-4">
        <button
          onClick={() => toggleSection(id)}
          className="w-full flex items-center justify-between p-4 hover:bg-[#1a1a1a] transition-colors"
        >
          <h3 className="text-white font-medium text-lg flex items-center gap-2">
            {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
            {title}
          </h3>
        </button>
        {isExpanded && (
          <div className="p-4 pt-0 border-t border-[#2a2a2a]/50">
            {children}
          </div>
        )}
      </div>
    );
  };

  const CopyBlock = ({ 
    id, 
    content, 
    label 
  }: { 
    id: string; 
    content: string; 
    label?: string;
  }) => (
    <div className="relative">
      {label && <p className="text-gray-400 text-sm mb-2">{label}</p>}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4 pr-12">
        <pre className="text-gray-300 text-sm whitespace-pre-wrap font-mono">{content}</pre>
        <button
          onClick={() => copyToClipboard(content, id)}
          className="absolute top-2 right-2 p-2 rounded hover:bg-[#2a2a2a] transition-colors"
          title="Copy to clipboard"
        >
          {copiedId === id ? (
            <Check size={16} className="text-green-500" />
          ) : (
            <Copy size={16} className="text-gray-400" />
          )}
        </button>
      </div>
    </div>
  );

  const EmailTemplate = ({
    id,
    subject,
    body
  }: {
    id: string;
    subject: string;
    body: string;
  }) => (
    <div className="space-y-3">
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4">
        <p className="text-gray-400 text-xs mb-1">Subject:</p>
        <p className="text-white font-medium mb-3">{subject}</p>
        <p className="text-gray-400 text-xs mb-2">Body:</p>
        <textarea
          className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded p-3 text-gray-300 text-sm font-mono min-h-[200px] focus:outline-none focus:border-[#10b981]"
          defaultValue={body}
        />
      </div>
      <button
        onClick={() => copyToClipboard(`Subject: ${subject}\n\n${body}`, id)}
        className="w-full flex items-center justify-center gap-2 bg-[#10b981] hover:bg-[#0ea472] text-white py-2 px-4 rounded transition-colors"
      >
        {copiedId === id ? (
          <>
            <Check size={16} />
            Copied!
          </>
        ) : (
          <>
            <Copy size={16} />
            Copy Template
          </>
        )}
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold mb-2">Onboarding Hub</h1>
          <p className="text-gray-400">
            Sales scripts, demo guides, and onboarding resources for monument companies, fulfillment partners, and families
          </p>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="monument-companies" className="space-y-4">
          <TabsList className="bg-[#0f0f0f] border border-[#2a2a2a] flex-wrap">
            <TabsTrigger value="monument-companies" className="data-[state=active]:bg-[#10b981]/10 data-[state=active]:text-[#10b981]">
              <Building2 size={16} className="mr-2" />
              Monument Companies
            </TabsTrigger>
            <TabsTrigger value="fulfillment-partners" className="data-[state=active]:bg-[#10b981]/10 data-[state=active]:text-[#10b981]">
              <Handshake size={16} className="mr-2" />
              Fulfillment Partners
            </TabsTrigger>
            <TabsTrigger value="family-experience" className="data-[state=active]:bg-[#10b981]/10 data-[state=active]:text-[#10b981]">
              <Users size={16} className="mr-2" />
              Family Experience
            </TabsTrigger>
            <TabsTrigger value="email-templates" className="data-[state=active]:bg-[#10b981]/10 data-[state=active]:text-[#10b981]">
              <Mail size={16} className="mr-2" />
              Email Templates
            </TabsTrigger>
            <TabsTrigger value="video-library" className="data-[state=active]:bg-[#10b981]/10 data-[state=active]:text-[#10b981]">
              <Video size={16} className="mr-2" />
              Video Library
            </TabsTrigger>
            <TabsTrigger value="revenue-calculator" className="data-[state=active]:bg-[#10b981]/10 data-[state=active]:text-[#10b981]">
              <Calculator size={16} className="mr-2" />
              Revenue Calculator
            </TabsTrigger>
            <TabsTrigger value="documents" className="data-[state=active]:bg-[#10b981]/10 data-[state=active]:text-[#10b981]">
              <FileText size={16} className="mr-2" />
              Documents
            </TabsTrigger>
          </TabsList>

          {/* Monument Companies Tab */}
          <TabsContent value="monument-companies">
            <div className="space-y-4">
              <Section id="elevator-pitch" title="Elevator Pitch (30 seconds)">
                <CopyBlock
                  id="elevator"
                  content={`"Hi [Name], I'm [Your Name] with Pontis. We help monument companies turn every headstone into a living digital memorial that families can access from anywhere with a QR code. Families scan the medallion, create a profile with photos and stories, and you earn recurring income from flower deliveries and headstone cleaning services. Are you open to a 15-minute demo?"`}
                />
                <div className="mt-4 p-3 bg-[#10b981]/10 border border-[#10b981]/20 rounded-lg">
                  <p className="text-[#10b981] text-sm">
                    <strong>Key hooks:</strong> "Turn every headstone into a living memorial" + "Recurring income" + Low time commitment ("15-minute demo")
                  </p>
                </div>
              </Section>

              <Section id="demo-script" title="Demo Script (15 minutes)">
                <div className="space-y-4">
                  <CopyBlock
                    id="demo-intro"
                    label="Part 1: The Problem (2 min)"
                    content={`"Before I show you how Pontis works, let me ask: what percentage of families who buy headstones from you ever come back after the installation?"

[Wait for answer — usually <5%]

"Exactly. Once the headstone is installed, that relationship ends. But with Pontis, you stay connected to families for years through flower deliveries, headstone cleaning, and memorial updates. Let me show you how it works..."`}
                  />

                  <CopyBlock
                    id="demo-show"
                    label="Part 2: The Demo (8 min)"
                    content={`"Here's a live Pontis memorial: [Show example QR code scan]

1. Family scans the QR medallion on the headstone
2. They're taken to a beautiful memorial page with photos, stories, tributes
3. Family members can add memories from anywhere in the world
4. They can subscribe to seasonal flower deliveries (you earn $X per delivery)
5. They can schedule headstone cleaning (you earn $Y per service)

The best part? You don't fulfill these services yourself — we have a network of local florists and cleaners. You just collect the residual income.

[Show backend dashboard]

Here's where you track orders, see which families are subscribing, and manage your medallion inventory."`}
                  />

                  <CopyBlock
                    id="demo-close"
                    label="Part 3: The Close (5 min)"
                    content={`"So here's how we'd get started:

1. You order an initial batch of [50/100/200] QR medallions at $[25/unit]
2. We train your team on installation (takes 10 minutes, it's just adhesive)
3. You give/sell the medallions to families (most companies bake it into the headstone cost)
4. Families activate their memorials and start subscribing to services
5. You earn [40-60%] of subscription revenue every month

Typical monument company sees ROI within the first [X] installations.

What questions do you have before we move forward?"`}
                  />
                </div>
              </Section>

              <Section id="pricing" title="Pricing & Business Model">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="bg-[#0f0f0f] border-[#2a2a2a]">
                      <CardHeader>
                        <CardTitle className="text-white text-lg">Medallion Costs</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-gray-300 text-sm">
                        <div className="flex justify-between">
                          <span>Unit cost (current):</span>
                          <span className="text-white font-medium">$25/medallion</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Unit cost (target at scale):</span>
                          <span className="text-white font-medium">~$40/medallion</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Suggested retail to families:</span>
                          <span className="text-white font-medium">$75-125</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Or bake into headstone cost:</span>
                          <span className="text-white font-medium">Free to family</span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-[#0f0f0f] border-[#2a2a2a]">
                      <CardHeader>
                        <CardTitle className="text-white text-lg">Recurring Revenue</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-gray-300 text-sm">
                        <div className="flex justify-between">
                          <span>Flower subscription (2/yr):</span>
                          <span className="text-white font-medium">$169/year</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Monument company cut:</span>
                          <span className="text-[#10b981] font-medium">40-60%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Cleaning service (per visit):</span>
                          <span className="text-white font-medium">$65-120</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Monument company cut:</span>
                          <span className="text-[#10b981] font-medium">40-60%</span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="p-4 bg-[#10b981]/10 border border-[#10b981]/20 rounded-lg">
                    <h4 className="text-[#10b981] font-medium mb-2">Example ROI</h4>
                    <p className="text-gray-300 text-sm">
                      100 medallions sold at $25 each = $2,500 upfront cost<br/>
                      If 30% of families subscribe to flowers (30 × $169 × 50% cut) = $2,535/year recurring<br/>
                      <strong className="text-white">ROI in Year 1, then pure profit every year after.</strong>
                    </p>
                  </div>
                </div>
              </Section>

              <Section id="objections" title="Objection Handling">
                <div className="space-y-4">
                  <div className="border-l-4 border-yellow-500 bg-yellow-500/5 p-4 rounded">
                    <p className="text-yellow-500 font-medium mb-2">"This seems too tech-heavy for our customers"</p>
                    <p className="text-gray-300 text-sm">
                      <strong>Response:</strong> "I totally get that concern. But here's the thing — 73% of people over 65 own a smartphone now. And we designed Pontis for elderly users: big buttons, simple steps, and families can help remotely. The QR code does all the work — they just point their phone camera at it."
                    </p>
                  </div>

                  <div className="border-l-4 border-yellow-500 bg-yellow-500/5 p-4 rounded">
                    <p className="text-yellow-500 font-medium mb-2">"We don't have time to manage another vendor"</p>
                    <p className="text-gray-300 text-sm">
                      <strong>Response:</strong> "That's exactly why we built it this way — you literally stick a medallion on the headstone (takes 30 seconds), and we handle everything else. Families activate it themselves, we fulfill the services, you just collect checks. Zero ongoing work on your end."
                    </p>
                  </div>

                  <div className="border-l-4 border-yellow-500 bg-yellow-500/5 p-4 rounded">
                    <p className="text-yellow-500 font-medium mb-2">"What if families don't want to pay for subscriptions?"</p>
                    <p className="text-gray-300 text-sm">
                      <strong>Response:</strong> "Great question. The memorial itself is free forever — families can upload photos and stories without paying a dime. Subscriptions are optional add-ons (flowers, cleaning). In our testing, 30-40% opt in because we frame it as 'never miss Mom's birthday again.' Even at 30%, the recurring revenue is significant."
                    </p>
                  </div>

                  <div className="border-l-4 border-yellow-500 bg-yellow-500/5 p-4 rounded">
                    <p className="text-yellow-500 font-medium mb-2">"How do I know this company won't disappear?"</p>
                    <p className="text-gray-300 text-sm">
                      <strong>Response:</strong> "Fair concern. We're backed by [investors/revenue numbers if you have them], and we've already got [X companies] using Pontis across [Y states]. The QR codes are permanent — even if Pontis went away (which we won't), the memorial pages stay live. But honestly, we're in this for the long haul. This is infrastructure for the entire memorial industry."
                    </p>
                  </div>

                  <div className="border-l-4 border-yellow-500 bg-yellow-500/5 p-4 rounded">
                    <p className="text-yellow-500 font-medium mb-2">"Can I try it before committing?"</p>
                    <p className="text-gray-300 text-sm">
                      <strong>Response:</strong> "Absolutely. Start with [10/25/50] medallions. Test it on your next few families. If they love it, great — order more. If not, no hard feelings. Most companies reorder within 30 days once they see families' reactions."
                    </p>
                  </div>
                </div>
              </Section>

              <Section id="onboarding-checklist" title="Onboarding Checklist">
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 bg-[#1a1a1a] rounded border border-[#2a2a2a]">
                    <input type="checkbox" className="mt-1" />
                    <div>
                      <p className="text-white font-medium">Send Welcome Email</p>
                      <p className="text-gray-400 text-sm">Intro, portal login, support contact</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-[#1a1a1a] rounded border border-[#2a2a2a]">
                    <input type="checkbox" className="mt-1" />
                    <div>
                      <p className="text-white font-medium">Process Initial Medallion Order</p>
                      <p className="text-gray-400 text-sm">Confirm quantity, shipping address, payment</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-[#1a1a1a] rounded border border-[#2a2a2a]">
                    <input type="checkbox" className="mt-1" />
                    <div>
                      <p className="text-white font-medium">Schedule Training Call (15 min)</p>
                      <p className="text-gray-400 text-sm">Installation demo, portal walkthrough, Q&A</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-[#1a1a1a] rounded border border-[#2a2a2a]">
                    <input type="checkbox" className="mt-1" />
                    <div>
                      <p className="text-white font-medium">Ship Medallions</p>
                      <p className="text-gray-400 text-sm">Include installation guide, sample QR, welcome packet</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-[#1a1a1a] rounded border border-[#2a2a2a]">
                    <input type="checkbox" className="mt-1" />
                    <div>
                      <p className="text-white font-medium">Follow-Up After First 10 Installations</p>
                      <p className="text-gray-400 text-sm">Check for questions, success stories, upsell opportunity</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-[#1a1a1a] rounded border border-[#2a2a2a]">
                    <input type="checkbox" className="mt-1" />
                    <div>
                      <p className="text-white font-medium">Monthly Check-In (Automated)</p>
                      <p className="text-gray-400 text-sm">Usage stats, reorder reminder, new feature announcements</p>
                    </div>
                  </div>
                </div>
              </Section>
            </div>
          </TabsContent>

          {/* Fulfillment Partners Tab */}
          <TabsContent value="fulfillment-partners">
            <div className="space-y-4">
              <Section id="partner-overview" title="How Fulfillment Partnerships Work">
                <div className="prose prose-invert max-w-none">
                  <p className="text-gray-300 text-sm mb-4">
                    Pontis partners with local florists and headstone cleaning services to fulfill subscriptions sold through our monument company network. Here's how it works:
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <Card className="bg-[#0f0f0f] border-[#2a2a2a]">
                      <CardHeader>
                        <CardTitle className="text-white text-sm">1. Families Subscribe</CardTitle>
                      </CardHeader>
                      <CardContent className="text-gray-400 text-sm">
                        Monument company sells Pontis medallions. Families activate memorials and opt into flower/cleaning services.
                      </CardContent>
                    </Card>

                    <Card className="bg-[#0f0f0f] border-[#2a2a2a]">
                      <CardHeader>
                        <CardTitle className="text-white text-sm">2. You Fulfill</CardTitle>
                      </CardHeader>
                      <CardContent className="text-gray-400 text-sm">
                        We send you delivery requests via email/dashboard. You deliver flowers or clean headstones on schedule.
                      </CardContent>
                    </Card>

                    <Card className="bg-[#0f0f0f] border-[#2a2a2a]">
                      <CardHeader>
                        <CardTitle className="text-white text-sm">3. You Get Paid</CardTitle>
                      </CardHeader>
                      <CardContent className="text-gray-400 text-sm">
                        Upload photo proof of delivery. Get paid within [X days] via direct deposit.
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </Section>

              <Section id="partner-pricing" title="Partner Payouts">
                <div className="space-y-4">
                  <Card className="bg-[#0f0f0f] border-[#2a2a2a]">
                    <CardHeader>
                      <CardTitle className="text-white">Flower Delivery Payouts</CardTitle>
                      <CardDescription className="text-gray-400">Per delivery, you receive:</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2 text-gray-300">
                      <div className="flex justify-between items-center">
                        <span>Standard delivery (within 20 mi):</span>
                        <Badge className="bg-[#10b981]">$45-60</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Extended delivery (20-50 mi):</span>
                        <Badge className="bg-[#10b981]">$60-80</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Remote delivery (50+ mi):</span>
                        <Badge className="bg-[#10b981]">$80-100</Badge>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-[#0f0f0f] border-[#2a2a2a]">
                    <CardHeader>
                      <CardTitle className="text-white">Headstone Cleaning Payouts</CardTitle>
                      <CardDescription className="text-gray-400">Per service, you receive:</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2 text-gray-300">
                      <div className="flex justify-between items-center">
                        <span>Basic cleaning (polish + scrub):</span>
                        <Badge className="bg-[#10b981]">$35-50</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Deep cleaning (stain removal):</span>
                        <Badge className="bg-[#10b981]">$60-90</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Restoration (repair work):</span>
                        <Badge className="bg-[#10b981]">Custom quote</Badge>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </Section>

              <Section id="partner-policies" title="Policies & Expectations">
                <div className="space-y-4">
                  <div className="p-4 border border-[#2a2a2a] rounded-lg">
                    <h4 className="text-white font-medium mb-2">✅ Photo Proof Required</h4>
                    <p className="text-gray-400 text-sm">
                      Every delivery must include a photo of the flowers/cleaned headstone sent to the family via Pontis platform. Photos are auto-forwarded to family and stored in memorial timeline.
                    </p>
                  </div>

                  <div className="p-4 border border-[#2a2a2a] rounded-lg">
                    <h4 className="text-white font-medium mb-2">⏰ Delivery Windows</h4>
                    <p className="text-gray-400 text-sm">
                      Flowers: Deliver within 3 days of scheduled date (e.g., birthday is March 9, deliver March 7-12)<br/>
                      Cleaning: Schedule with family, complete within 7 days of initial request
                    </p>
                  </div>

                  <div className="p-4 border border-[#2a2a2a] rounded-lg">
                    <h4 className="text-white font-medium mb-2">🔄 Refund/Redo Policy</h4>
                    <p className="text-gray-400 text-sm">
                      If family is dissatisfied (wrong flowers, poor cleaning), you redo at no charge or we issue refund (you don't get paid for that delivery). Quality control is critical — families are grieving, expectations are high.
                    </p>
                  </div>

                  <div className="p-4 border border-[#2a2a2a] rounded-lg">
                    <h4 className="text-white font-medium mb-2">💰 Payment Terms</h4>
                    <p className="text-gray-400 text-sm">
                      Paid via direct deposit within [X days] of photo proof upload. Payments batch weekly on [day]. First payment may take [Y days] while banking info is verified.
                    </p>
                  </div>

                  <div className="p-4 border border-[#2a2a2a] rounded-lg">
                    <h4 className="text-white font-medium mb-2">📍 Service Area</h4>
                    <p className="text-gray-400 text-sm">
                      You define your service radius (e.g., "20 miles from [zip code]"). We only route deliveries within your area. You can update service area anytime in partner portal.
                    </p>
                  </div>
                </div>
              </Section>

              <Section id="partner-onboarding" title="Partner Onboarding Checklist">
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 bg-[#1a1a1a] rounded border border-[#2a2a2a]">
                    <input type="checkbox" className="mt-1" />
                    <div>
                      <p className="text-white font-medium">Sign Partner Agreement</p>
                      <p className="text-gray-400 text-sm">Docusign sent via email, review and sign</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-[#1a1a1a] rounded border border-[#2a2a2a]">
                    <input type="checkbox" className="mt-1" />
                    <div>
                      <p className="text-white font-medium">Submit W-9 / Banking Info</p>
                      <p className="text-gray-400 text-sm">For direct deposit payments</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-[#1a1a1a] rounded border border-[#2a2a2a]">
                    <input type="checkbox" className="mt-1" />
                    <div>
                      <p className="text-white font-medium">Define Service Area</p>
                      <p className="text-gray-400 text-sm">Zip codes or radius you're willing to serve</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-[#1a1a1a] rounded border border-[#2a2a2a]">
                    <input type="checkbox" className="mt-1" />
                    <div>
                      <p className="text-white font-medium">Set Pricing Tier</p>
                      <p className="text-gray-400 text-sm">Standard/Extended/Remote delivery rates</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-[#1a1a1a] rounded border border-[#2a2a2a]">
                    <input type="checkbox" className="mt-1" />
                    <div>
                      <p className="text-white font-medium">Complete Test Delivery</p>
                      <p className="text-gray-400 text-sm">Practice photo upload, confirm quality standards</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-[#1a1a1a] rounded border border-[#2a2a2a]">
                    <input type="checkbox" className="mt-1" />
                    <div>
                      <p className="text-white font-medium">Go Live</p>
                      <p className="text-gray-400 text-sm">Partner profile published, eligible for delivery requests</p>
                    </div>
                  </div>
                </div>
              </Section>
            </div>
          </TabsContent>

          {/* Family Experience Tab */}
          <TabsContent value="family-experience">
            <div className="space-y-4">
              <Section id="family-setup" title="Memorial Setup Walkthrough">
                <div className="space-y-4">
                  <p className="text-gray-300 text-sm mb-4">
                    This is the experience families go through when they scan a QR medallion for the first time:
                  </p>

                  <div className="space-y-3">
                    {[
                      { step: 1, title: "Scan QR Code", desc: "Family points phone camera at medallion → auto-opens Pontis memorial page" },
                      { step: 2, title: "Create Account", desc: "Enter email, create password (or sign in with Google)" },
                      { step: 3, title: "Activate Memorial", desc: "Confirm location (GPS check), verify this is their loved one's memorial" },
                      { step: 4, title: "Add Basic Info", desc: "Name, birth date, death date, short bio (optional)" },
                      { step: 5, title: "Upload First Photo/Memory", desc: "Encouraged to add one photo or story right away (emotion-first)" },
                      { step: 6, title: "Preview Memorial", desc: "See what the live page looks like, get shareable link" },
                      { step: 7, title: "Invite Family (Optional)", desc: "Send invite links to siblings, cousins, friends to contribute" },
                      { step: 8, title: "Flower Subscription Offer (Optional)", desc: "\"Never miss [Name]'s birthday again — seasonal flower deliveries\"" },
                      { step: 9, title: "Cleaning Service Offer (Optional)", desc: "\"Keep their resting place beautiful — scheduled headstone cleaning\"" },
                      { step: 10, title: "Memorial Live", desc: "Confirmation message, ongoing access to add/edit anytime" },
                    ].map((item) => (
                      <div key={item.step} className="flex items-start gap-3 p-3 bg-[#1a1a1a] rounded border border-[#2a2a2a]">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#10b981]/10 border border-[#10b981]/30 flex items-center justify-center text-[#10b981] font-bold text-sm">
                          {item.step}
                        </div>
                        <div>
                          <p className="text-white font-medium">{item.title}</p>
                          <p className="text-gray-400 text-sm">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Section>

              <Section id="family-pricing" title="Family-Facing Subscription Pricing">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="bg-[#0f0f0f] border-[#2a2a2a]">
                    <CardHeader>
                      <CardTitle className="text-white">Flower Subscriptions</CardTitle>
                      <CardDescription className="text-gray-400">Seasonal delivery options</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 text-gray-300 text-sm">
                      <div className="p-3 bg-[#1a1a1a] rounded border border-[#2a2a2a]">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-medium text-white">Essential Remembrance</span>
                          <Badge>$169/year</Badge>
                        </div>
                        <p className="text-gray-400 text-xs">2 deliveries/year (birthday + death anniversary)</p>
                      </div>

                      <div className="p-3 bg-[#1a1a1a] rounded border border-[#2a2a2a]">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-medium text-white">Seasonal Tribute</span>
                          <Badge>$289/year</Badge>
                        </div>
                        <p className="text-gray-400 text-xs">4 deliveries/year (2 personal dates + 2 holidays)</p>
                      </div>

                      <div className="p-3 bg-[#1a1a1a] rounded border border-[#2a2a2a]">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-medium text-white">Perpetual Care</span>
                          <Badge>$369/year</Badge>
                        </div>
                        <p className="text-gray-400 text-xs">6 deliveries/year (custom schedule)</p>
                      </div>

                      <div className="p-3 bg-[#1a1a1a] rounded border border-[#2a2a2a]">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-medium text-white">One-Time Delivery</span>
                          <Badge>$99</Badge>
                        </div>
                        <p className="text-gray-400 text-xs">Single delivery, no commitment</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-[#0f0f0f] border-[#2a2a2a]">
                    <CardHeader>
                      <CardTitle className="text-white">Headstone Cleaning</CardTitle>
                      <CardDescription className="text-gray-400">Professional maintenance services</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 text-gray-300 text-sm">
                      <div className="p-3 bg-[#1a1a1a] rounded border border-[#2a2a2a]">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-medium text-white">Basic Cleaning</span>
                          <Badge>$65</Badge>
                        </div>
                        <p className="text-gray-400 text-xs">Polish, scrub, photo proof sent to family</p>
                      </div>

                      <div className="p-3 bg-[#1a1a1a] rounded border border-[#2a2a2a]">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-medium text-white">Deep Cleaning</span>
                          <Badge>$120</Badge>
                        </div>
                        <p className="text-gray-400 text-xs">Stain removal, moss treatment, restoration</p>
                      </div>

                      <div className="p-3 bg-[#1a1a1a] rounded border border-[#2a2a2a]">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-medium text-white">Annual Bundle</span>
                          <Badge>$180</Badge>
                        </div>
                        <p className="text-gray-400 text-xs">3 cleanings/year, scheduled maintenance</p>
                      </div>

                      <div className="p-3 bg-[#1a1a1a] rounded border border-[#2a2a2a]">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-medium text-white">Repair Work</span>
                          <Badge>Custom</Badge>
                        </div>
                        <p className="text-gray-400 text-xs">Crack repair, re-leveling, custom quote</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="mt-4 p-4 bg-[#10b981]/10 border border-[#10b981]/20 rounded-lg">
                  <h4 className="text-[#10b981] font-medium mb-2">💡 Pricing Strategy Note</h4>
                  <p className="text-gray-300 text-sm">
                    Flowers framed as "never miss [Name]'s birthday again" (ritual/loss aversion) not "subscribe to flowers" (transactional). 
                    Photo proof = trust builder + shareable emotional moment. Delay offer 2-8 weeks post-memorial setup for higher conversion.
                  </p>
                </div>
              </Section>

              <Section id="family-support" title="Common Family Questions">
                <div className="space-y-4">
                  <div className="border-l-4 border-blue-500 bg-blue-500/5 p-4 rounded">
                    <p className="text-blue-500 font-medium mb-2">"How do I add family members to the memorial?"</p>
                    <p className="text-gray-300 text-sm">
                      <strong>Answer:</strong> Click "Invite Family" on the memorial page. Enter their email addresses and we'll send them a link to contribute photos and stories. They don't need to create an account unless they want to edit.
                    </p>
                  </div>

                  <div className="border-l-4 border-blue-500 bg-blue-500/5 p-4 rounded">
                    <p className="text-blue-500 font-medium mb-2">"Can I cancel my flower subscription?"</p>
                    <p className="text-gray-300 text-sm">
                      <strong>Answer:</strong> Yes, anytime. Go to your account settings, click "Manage Subscriptions," and pause or cancel. No penalties, no questions asked.
                    </p>
                  </div>

                  <div className="border-l-4 border-blue-500 bg-blue-500/5 p-4 rounded">
                    <p className="text-blue-500 font-medium mb-2">"What if the QR code gets damaged or fades?"</p>
                    <p className="text-gray-300 text-sm">
                      <strong>Answer:</strong> Contact us at support@pontis.life and we'll send a replacement medallion for free. Your memorial data is stored permanently in the cloud — new QR code links to the same memorial.
                    </p>
                  </div>

                  <div className="border-l-4 border-blue-500 bg-blue-500/5 p-4 rounded">
                    <p className="text-blue-500 font-medium mb-2">"Can I make the memorial private?"</p>
                    <p className="text-gray-300 text-sm">
                      <strong>Answer:</strong> Yes. In privacy settings, you can make it invite-only (only people you invite can view) or completely private (only you can see it). The default is public so anyone who scans the QR code can view and contribute.
                    </p>
                  </div>

                  <div className="border-l-4 border-blue-500 bg-blue-500/5 p-4 rounded">
                    <p className="text-blue-500 font-medium mb-2">"How will I know when flowers are delivered?"</p>
                    <p className="text-gray-300 text-sm">
                      <strong>Answer:</strong> You'll get an email with a photo of the flowers at the gravesite within 24 hours of delivery. The photo is also added to the memorial timeline so family can see it.
                    </p>
                  </div>
                </div>
              </Section>
            </div>
          </TabsContent>

          {/* Email Templates Tab */}
          <TabsContent value="email-templates">
            <div className="space-y-4">
              <Section id="monument-templates" title="Monument Company Templates">
                <div className="space-y-6">
                  <div>
                    <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                      <span className="text-[#10b981]">1.</span> Intro / Cold Outreach
                    </h4>
                    <EmailTemplate
                      id="mc-intro"
                      subject="Helping [CONTACT_NAME] turn headstones into lasting legacies"
                      body={`Hi [CONTACT_NAME],

I'm [Your Name] from Pontis. I wanted to reach out because we're working with monument companies across [STATE/REGION] to add a simple but powerful feature to their headstones: QR code medallions that turn each memorial into a living digital tribute.

Here's the idea: families scan the QR code with their phone and are taken to a beautiful memorial page where they can upload photos, share stories, and keep their loved one's memory alive. You stay connected to families through optional flower deliveries and headstone cleaning services — and earn recurring income from every subscription.

Most monument companies see ROI within the first month, and families love it.

Would you be open to a 15-minute demo? I can show you exactly how it works and answer any questions.

Best,
[Your Name]
[Your Title] | Pontis
[Your Email] | [Your Phone]
pontis.life`}
                    />
                  </div>

                  <div>
                    <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                      <span className="text-[#10b981]">2.</span> Post-Demo Follow-Up
                    </h4>
                    <EmailTemplate
                      id="mc-followup"
                      subject="Thanks for the demo today, [CONTACT_NAME]"
                      body={`Hi [CONTACT_NAME],

Thanks for taking the time to walk through Pontis with me today. I really enjoyed learning about [COMPANY_NAME] and hearing your thoughts on digital memorials.

Here's a quick recap of what we covered:
• QR medallions that families scan to access digital memorials
• Recurring revenue from flower subscriptions and headstone cleaning
• Zero ongoing work after installation — we handle fulfillment
• Typical ROI within the first [X] installations

Next steps:
1. Review pricing: [$25/medallion, 40-60% subscription revenue split]
2. Let me know your preferred initial order quantity (most companies start with 50-100)
3. Schedule a brief training call for your team (10-15 minutes)

I'm here if you have any questions. Otherwise, let me know when you'd like to move forward and I'll get everything set up.

Best,
[Your Name]
[Your Title] | Pontis
[Your Email] | [Your Phone]`}
                    />
                  </div>

                  <div>
                    <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                      <span className="text-[#10b981]">3.</span> Contract & Pricing
                    </h4>
                    <EmailTemplate
                      id="mc-pricing"
                      subject="Pontis Partnership Agreement & Pricing for [COMPANY_NAME]"
                      body={`Hi [CONTACT_NAME],

Excited to get [COMPANY_NAME] set up with Pontis! Attached is the partnership agreement with all the details we discussed.

PRICING SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Medallion Cost: $25/unit (or $40/unit at scale)
Your Revenue Share: 40-60% of subscription revenue
Flower Subscriptions: $169-369/year per family
Headstone Cleaning: $65-120 per service

Initial order: [X] medallions = $[TOTAL]

To move forward:
1. Review and sign the attached agreement (DocuSign link)
2. Submit W-9 for payment setup
3. Confirm shipping address
4. We'll schedule training and ship your first batch

Let me know if you have any questions. Looking forward to working together!

Best,
[Your Name]
[Your Title] | Pontis
[Your Email] | [Your Phone]`}
                    />
                  </div>

                  <div>
                    <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                      <span className="text-[#10b981]">4.</span> Welcome / Post-Signing
                    </h4>
                    <EmailTemplate
                      id="mc-welcome"
                      subject="Welcome to Pontis, [COMPANY_NAME]! Here's what happens next"
                      body={`Hi [CONTACT_NAME],

Welcome to Pontis! We're thrilled to have [COMPANY_NAME] as a partner.

Your medallions are being prepared and will ship within [X] business days. In the meantime, here's what to expect:

THIS WEEK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ Training call scheduled for [DATE/TIME]
✓ Portal login credentials sent separately
✓ Medallion shipment tracking info coming soon

WHAT YOU'LL LEARN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• How to install medallions (takes 30 seconds)
• How families activate memorials
• How to track subscriptions in your dashboard
• Best practices for pitching Pontis to families

SUPPORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Portal: partners.pontis.life
Email: support@pontis.life
Phone: [SUPPORT PHONE]

Looking forward to seeing your first installations go live!

Best,
[Your Name]
[Your Title] | Pontis`}
                    />
                  </div>

                  <div>
                    <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                      <span className="text-[#10b981]">5.</span> First Order Guide
                    </h4>
                    <EmailTemplate
                      id="mc-first-order"
                      subject="Step-by-step: Installing your first Pontis medallion"
                      body={`Hi [CONTACT_NAME],

Congrats on getting your medallions! Here's a quick step-by-step guide for your first installation:

INSTALLATION (30 seconds)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Clean the headstone surface (dry, no dust)
2. Peel the adhesive backing from the medallion
3. Press firmly onto the headstone (lower right corner is standard)
4. Hold for 10 seconds — done!

FAMILY ACTIVATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Families scan the QR code with their phone camera → auto-opens memorial setup page → they create their account and add photos/stories. That's it. You don't need to do anything else.

TRACKING SUBSCRIPTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Log in to partners.pontis.life to see which families have activated memorials and subscribed to services. Revenue share is calculated automatically and paid monthly.

TIPS FOR SUCCESS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Mention the medallion during the headstone consultation ("We include a digital memorial that families can access from anywhere")
• Show a demo on your phone if they're curious
• Most families love it — it's free for them, adds value, and keeps you connected

Questions? Just reply to this email or call [PHONE].

Best,
[Your Name]
[Your Title] | Pontis`}
                    />
                  </div>
                </div>
              </Section>

              <Section id="fulfillment-templates" title="Fulfillment Partner Templates">
                <div className="space-y-6">
                  <div>
                    <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                      <span className="text-[#10b981]">1.</span> Partner Intro
                    </h4>
                    <EmailTemplate
                      id="fp-intro"
                      subject="Opportunity: Partner with Pontis for gravesite flower deliveries"
                      body={`Hi [CONTACT_NAME],

I'm [Your Name] from Pontis. We're building a network of local florists to fulfill flower deliveries for digital memorial subscriptions, and I thought [COMPANY_NAME] might be a great fit.

Here's how it works:
• Families subscribe to seasonal flower deliveries at gravesites (we handle sales/billing)
• We send you delivery requests in your service area
• You deliver flowers, upload a photo, and get paid $45-100 per delivery
• Payment via direct deposit within [X] days

We're working with monument companies across [REGION] and expect [X] deliveries per month in your area. No upfront costs, no exclusivity requirements — just reliable income for work you're already equipped to do.

Would you be interested in learning more? I can send over the full partner details or jump on a quick call.

Best,
[Your Name]
[Your Title] | Pontis
[Your Email] | [Your Phone]`}
                    />
                  </div>

                  <div>
                    <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                      <span className="text-[#10b981]">2.</span> Payout & Terms Overview
                    </h4>
                    <EmailTemplate
                      id="fp-payout"
                      subject="Pontis Partner Payouts & Terms"
                      body={`Hi [CONTACT_NAME],

Thanks for your interest in partnering with Pontis! Here's a breakdown of how payouts work:

PAYOUT STRUCTURE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Standard delivery (within 20 mi): $45-60
Extended delivery (20-50 mi): $60-80
Remote delivery (50+ mi): $80-100

Headstone cleaning (if applicable):
Basic cleaning: $35-50
Deep cleaning: $60-90

REQUIREMENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ Photo proof of delivery (uploaded via partner portal)
✓ Deliver within 3-day window of scheduled date
✓ Professional quality (families are grieving — expectations are high)

PAYMENT TERMS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Payments batch weekly on [DAY]
• Direct deposit within [X] days of photo upload
• First payment may take [Y] days while banking info is verified

SERVICE AREA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
You define your service radius (e.g., "20 miles from [ZIP]"). We only send requests within your coverage area. Update anytime in the portal.

Next step: If this sounds good, I'll send over the partner agreement to review and sign. Let me know if you have questions!

Best,
[Your Name]
[Your Title] | Pontis`}
                    />
                  </div>

                  <div>
                    <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                      <span className="text-[#10b981]">3.</span> Welcome / Go-Live
                    </h4>
                    <EmailTemplate
                      id="fp-welcome"
                      subject="Welcome to the Pontis fulfillment network!"
                      body={`Hi [CONTACT_NAME],

Welcome to Pontis! [COMPANY_NAME] is now live in our fulfillment network and eligible to receive delivery requests.

HERE'S WHAT TO EXPECT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. You'll receive delivery requests via email and in your partner portal
2. Each request includes: family name, gravesite location, delivery date, special instructions
3. You deliver flowers, take a photo, and upload it to the portal
4. Photo is auto-sent to the family and you're paid within [X] days

YOUR FIRST DELIVERY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
We'll send you a test delivery within [X] days to make sure everything works smoothly. Treat it like a real order — this is your chance to practice the photo upload process.

PORTAL ACCESS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Login: partners.pontis.life/fulfillment
Username: [EMAIL]
Temp password: [PASSWORD] (change after first login)

SUPPORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Questions? Email support@pontis.life or call [PHONE].

Thanks for partnering with us — looking forward to working together!

Best,
[Your Name]
[Your Title] | Pontis`}
                    />
                  </div>
                </div>
              </Section>
            </div>
          </TabsContent>

          {/* Video Library Tab */}
          <TabsContent value="video-library">
            <div className="space-y-4">
              <div className="p-4 bg-[#10b981]/10 border border-[#10b981]/20 rounded-lg mb-6">
                <h3 className="text-[#10b981] font-medium mb-2">📹 Video Library</h3>
                <p className="text-gray-300 text-sm">
                  Placeholder cards for videos you plan to record. Toggle status, add shareable links, and manage video content for different audiences.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {videos.map((video) => (
                  <Card key={video.id} className="bg-[#0f0f0f] border-[#2a2a2a]">
                    <CardHeader>
                      <div className="flex items-start justify-between mb-2">
                        <CardTitle className="text-white text-lg">{video.title}</CardTitle>
                        <button
                          onClick={() => toggleVideoStatus(video.id)}
                          className="flex-shrink-0"
                        >
                          {video.status === "Recorded" ? (
                            <Badge className="bg-[#10b981] hover:bg-[#0ea472] cursor-pointer">
                              ✅ Recorded
                            </Badge>
                          ) : (
                            <Badge className="bg-gray-700 hover:bg-gray-600 cursor-pointer">
                              🎬 Not Yet Recorded
                            </Badge>
                          )}
                        </button>
                      </div>
                      <CardDescription className="text-gray-400">{video.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <p className="text-gray-400 text-xs mb-1">Target Audience:</p>
                        <Badge variant="outline" className="text-[#10b981] border-[#10b981]/30">
                          {video.audience}
                        </Badge>
                      </div>
                      
                      <div>
                        <label className="text-gray-400 text-xs mb-1 block">Shareable Link:</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={video.link}
                            onChange={(e) => updateVideoLink(video.id, e.target.value)}
                            placeholder="Paste video URL here..."
                            className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded px-3 py-2 text-gray-300 text-sm focus:outline-none focus:border-[#10b981]"
                          />
                          {video.link && (
                            <button
                              onClick={() => copyToClipboard(video.link, video.id)}
                              className="p-2 bg-[#10b981]/10 border border-[#10b981]/30 rounded hover:bg-[#10b981]/20 transition-colors"
                              title="Copy link"
                            >
                              {copiedId === video.id ? (
                                <Check size={16} className="text-[#10b981]" />
                              ) : (
                                <Copy size={16} className="text-[#10b981]" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>

                      {video.link && (
                        <a
                          href={video.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block text-[#10b981] hover:underline text-sm"
                        >
                          View Video →
                        </a>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Revenue Calculator Tab */}
          <TabsContent value="revenue-calculator">
            <div className="space-y-6">
              <div className="p-4 bg-[#10b981]/10 border border-[#10b981]/20 rounded-lg">
                <h3 className="text-[#10b981] font-medium mb-2">💰 Revenue Calculator</h3>
                <p className="text-gray-300 text-sm">
                  Generate custom revenue projections and one-pagers for monument company prospects. All calculations update in real-time.
                </p>
              </div>

              <Card className="bg-[#0f0f0f] border-[#2a2a2a]">
                <CardHeader>
                  <CardTitle className="text-white">Input Assumptions</CardTitle>
                  <CardDescription className="text-gray-400">Adjust values to see revenue projections update live</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Company Name</label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded px-4 py-2 text-white focus:outline-none focus:border-[#10b981]"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-gray-400 text-sm mb-2 block">Estimated Monuments per Year</label>
                      <input
                        type="number"
                        value={monumentsPerYear}
                        onChange={(e) => setMonumentsPerYear(Number(e.target.value))}
                        className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded px-4 py-2 text-white focus:outline-none focus:border-[#10b981]"
                      />
                    </div>

                    <div>
                      <label className="text-gray-400 text-sm mb-2 block">Medallion Price ($)</label>
                      <input
                        type="number"
                        value={medallionPrice}
                        onChange={(e) => setMedallionPrice(Number(e.target.value))}
                        className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded px-4 py-2 text-white focus:outline-none focus:border-[#10b981]"
                      />
                    </div>

                    <div>
                      <label className="text-gray-400 text-sm mb-2 block">Estimated Flower Subscription Rate (%)</label>
                      <input
                        type="number"
                        value={subscriptionRate}
                        onChange={(e) => setSubscriptionRate(Number(e.target.value))}
                        className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded px-4 py-2 text-white focus:outline-none focus:border-[#10b981]"
                      />
                    </div>

                    <div>
                      <label className="text-gray-400 text-sm mb-2 block">Average Subscription Value ($/year)</label>
                      <input
                        type="number"
                        value={subscriptionValue}
                        onChange={(e) => setSubscriptionValue(Number(e.target.value))}
                        className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded px-4 py-2 text-white focus:outline-none focus:border-[#10b981]"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[#0f0f0f] border-[#2a2a2a]">
                <CardHeader>
                  <CardTitle className="text-white">Revenue Projections</CardTitle>
                  <CardDescription className="text-gray-400">Auto-calculated based on your inputs</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg">
                      <p className="text-gray-400 text-sm mb-1">Annual Medallion Revenue</p>
                      <p className="text-white text-2xl font-bold">${annualMedallionRevenue.toLocaleString()}</p>
                    </div>

                    <div className="p-4 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg">
                      <p className="text-gray-400 text-sm mb-1">Annual Subscription Revenue</p>
                      <p className="text-white text-2xl font-bold">${annualSubscriptionRevenue.toLocaleString()}</p>
                    </div>

                    <div className="p-4 bg-[#10b981]/10 border border-[#10b981]/30 rounded-lg">
                      <p className="text-[#10b981] text-sm mb-1">Total Annual Revenue</p>
                      <p className="text-white text-2xl font-bold">${totalAnnualRevenue.toLocaleString()}</p>
                    </div>

                    <div className="p-4 bg-[#10b981]/10 border border-[#10b981]/30 rounded-lg">
                      <p className="text-[#10b981] text-sm mb-1">Monthly Recurring</p>
                      <p className="text-white text-2xl font-bold">${monthlyRecurring.toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="p-4 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg">
                    <p className="text-gray-400 text-sm mb-1">Partner Residual (10% of subscription revenue)</p>
                    <p className="text-white text-xl font-bold">${partnerResidual.toLocaleString()}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[#0f0f0f] border-[#2a2a2a]">
                <CardHeader>
                  <CardTitle className="text-white">One-Pager Preview</CardTitle>
                  <CardDescription className="text-gray-400">Share this projection with prospects</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6">
                    <pre className="text-gray-300 text-sm whitespace-pre-wrap font-mono">{generateOnePagerText()}</pre>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => copyToClipboard(generateOnePagerText(), "one-pager")}
                      className="flex-1 flex items-center justify-center gap-2 bg-[#10b981] hover:bg-[#0ea472] text-white py-3 px-4 rounded transition-colors"
                    >
                      {copiedId === "one-pager" ? (
                        <>
                          <Check size={16} />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy size={16} />
                          Copy as Text
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => window.print()}
                      className="flex-1 flex items-center justify-center gap-2 bg-[#1a1a1a] hover:bg-[#2a2a2a] text-white border border-[#2a2a2a] py-3 px-4 rounded transition-colors"
                    >
                      📄 Print / Save as PDF
                    </button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents">
            <DocumentsTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
