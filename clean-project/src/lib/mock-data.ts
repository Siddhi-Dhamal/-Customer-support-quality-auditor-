export interface QualityScore {
  empathy: number;
  compliance: number;
  resolution: number;
  proficiency: number;
  customerEmotion: number;
  customerSatisfaction: number;
}

export interface AuditRecord {
  id: string;
  type: "call" | "chat";
  title: string;
  agent: string;
  date: string;
  duration: string;
  overallScore: number;
  scores: QualityScore;
  summary: string;
  transcript: TranscriptEntry[];
  status: "completed" | "processing" | "failed";
}

export interface TranscriptEntry {
  speaker: "agent" | "customer";
  text: string;
  timestamp: string;
}

export const mockTranscript: TranscriptEntry[] = [
  { speaker: "agent", text: "Thank you for calling TechSupport, my name is Sarah. How can I help you today?", timestamp: "00:00" },
  { speaker: "customer", text: "Hi Sarah, I've been having trouble with my internet connection for the past two days.", timestamp: "00:08" },
  { speaker: "agent", text: "I'm sorry to hear that. I understand how frustrating connectivity issues can be. Let me look into your account right away.", timestamp: "00:15" },
  { speaker: "customer", text: "It keeps dropping every 30 minutes or so. I've already tried restarting the router.", timestamp: "00:25" },
  { speaker: "agent", text: "Great troubleshooting on your part! I can see there was a firmware update pushed to your router yesterday. Let me check if that might be causing the issue.", timestamp: "00:33" },
  { speaker: "customer", text: "Oh, I didn't know about any update.", timestamp: "00:42" },
  { speaker: "agent", text: "I've identified the issue. The firmware update had a known bug that's been patched. I'm going to push the corrected update to your router now. It should take about 2 minutes.", timestamp: "00:48" },
  { speaker: "customer", text: "That would be great, thank you!", timestamp: "01:00" },
  { speaker: "agent", text: "The update is complete. Your connection should be stable now. Is there anything else I can help you with today?", timestamp: "01:15" },
  { speaker: "customer", text: "No, that's perfect. Thank you so much for the quick help!", timestamp: "01:22" },
];

export const mockAudits: AuditRecord[] = [
  {
    id: "AUD-001",
    type: "call",
    title: "Internet Connectivity Issue",
    agent: "Sarah Mitchell",
    date: "2026-03-11",
    duration: "4:32",
    overallScore: 92,
    scores: { empathy: 95, compliance: 88, resolution: 96, proficiency: 90, customerEmotion: 85, customerSatisfaction: 94 },
    summary: "Customer called regarding intermittent internet drops. Agent quickly identified a faulty firmware update as the root cause and resolved the issue by pushing a patched version. Excellent empathy and efficient resolution.",
    transcript: mockTranscript,
    status: "completed",
  },
  {
    id: "AUD-002",
    type: "chat",
    title: "Billing Dispute Resolution",
    agent: "James Rodriguez",
    date: "2026-03-10",
    duration: "12:45",
    overallScore: 78,
    scores: { empathy: 72, compliance: 90, resolution: 70, proficiency: 82, customerEmotion: 65, customerSatisfaction: 68 },
    summary: "Customer disputed a double charge on their account. Agent followed compliance guidelines but could have shown more empathy. Resolution required escalation to billing team.",
    transcript: mockTranscript,
    status: "completed",
  },
  {
    id: "AUD-003",
    type: "call",
    title: "Product Return Request",
    agent: "Emily Chen",
    date: "2026-03-09",
    duration: "6:18",
    overallScore: 88,
    scores: { empathy: 90, compliance: 92, resolution: 85, proficiency: 88, customerEmotion: 80, customerSatisfaction: 86 },
    summary: "Customer requested return for defective product. Agent handled professionally with good empathy. Return processed within policy guidelines.",
    transcript: mockTranscript,
    status: "completed",
  },
  {
    id: "AUD-004",
    type: "chat",
    title: "Account Security Concern",
    agent: "David Park",
    date: "2026-03-08",
    duration: "8:55",
    overallScore: 95,
    scores: { empathy: 92, compliance: 98, resolution: 95, proficiency: 96, customerEmotion: 90, customerSatisfaction: 93 },
    summary: "Customer reported suspicious login activity. Agent immediately escalated security protocols, helped reset credentials, and enabled 2FA. Outstanding compliance and proficiency.",
    transcript: mockTranscript,
    status: "completed",
  },
  {
    id: "AUD-005",
    type: "call",
    title: "Service Upgrade Inquiry",
    agent: "Maria Santos",
    date: "2026-03-07",
    duration: "5:10",
    overallScore: 84,
    scores: { empathy: 80, compliance: 86, resolution: 88, proficiency: 84, customerEmotion: 78, customerSatisfaction: 82 },
    summary: "Customer inquired about upgrading their service plan. Agent provided clear information but missed opportunity to address underlying needs. Satisfactory overall interaction.",
    transcript: mockTranscript,
    status: "completed",
  },
];

export const scoreLabels: Record<keyof QualityScore, string> = {
  empathy: "Empathy",
  compliance: "Compliance",
  resolution: "Resolution",
  proficiency: "Proficiency",
  customerEmotion: "Customer Emotion",
  customerSatisfaction: "Customer Satisfaction",
};

export function getScoreColor(score: number): string {
  if (score >= 90) return "text-success";
  if (score >= 75) return "text-primary";
  if (score >= 60) return "text-warning";
  return "text-destructive";
}

export function getScoreBg(score: number): string {
  if (score >= 90) return "bg-success";
  if (score >= 75) return "bg-primary";
  if (score >= 60) return "bg-warning";
  return "bg-destructive";
}
