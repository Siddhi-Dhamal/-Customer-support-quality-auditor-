import { useState, useEffect } from 'react';
import IconNav from './IconNav';
import CenterPanel from './CenterPanel';
import RightSidebar from './RightSidebar';
import { FileText, FileAudio, Download, X, Loader2 } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } from 'docx';
import { saveAs } from 'file-saver';

export type NavPage = 'home' | 'calls' | 'reports';

export interface ReportData {
  fileName:        string;
  summary:         string;
  emotionData:     { emotion: string; confidence: string; reason: string } | null;
  satData:         { score: string; score_percentage: string; status: string; reason: string } | null;
  scores:          { empathy: number; compliance: number; resolution: number; reasoning: string; efficiency_score: number; total_messages: number };
  fairnessScores:  { name_neutrality: number; language_neutrality: number; tone_consistency: number; equal_effort: number };
  namesAnonymized: string[];
}

interface HistoryFile {
  filename:   string;
  saved_at:   string;
  empathy:    number;
  compliance: number;
  resolution: number;
}

function Dashboard() {
  const [activePage,   setActivePage]   = useState<NavPage>('home');
  const [fileUploaded, setFileUploaded] = useState(false);
  const [showModal,    setShowModal]    = useState(false);
  const [historyFiles, setHistoryFiles] = useState<HistoryFile[]>([]);
  const [downloading,  setDownloading]  = useState<string | null>(null);
  const [reportData,   setReportData]   = useState<ReportData>({
    fileName: '', summary: '', emotionData: null, satData: null,
    scores: { empathy: 0, compliance: 0, resolution: 0, reasoning: '', efficiency_score: 0, total_messages: 0 },
    fairnessScores: { name_neutrality: 0, language_neutrality: 0, tone_consistency: 0, equal_effort: 0 },
    namesAnonymized: [],
  });

  const fetchHistoryFiles = async () => {
    try {
      const res = await fetch('https://charming-flexibility-production.up.railway.app/list-file-scores');
      if (res.ok) setHistoryFiles(await res.json());
    } catch {}
  };

  useEffect(() => {
    if (showModal) fetchHistoryFiles();
  }, [showModal]);

  useEffect(() => {
    const handleClear = () => setHistoryFiles([]);
    window.addEventListener('historycleared', handleClear);
    return () => window.removeEventListener('historycleared', handleClear);
  }, []);

  // ── Generate PDF ──────────────────────────────────────────────────────────
  const generatePDF = async (filename: string) => {
    setDownloading(filename);
    try {
      const scoresRes = await fetch(`https://charming-flexibility-production.up.railway.app/get-file-scores/${encodeURIComponent(filename)}`);
      const scores    = scoresRes.ok ? await scoresRes.json() : null;

      const originalName = scores?.original_filename || filename;
      const isAudioFile  = originalName.endsWith('.m4a') || originalName.endsWith('.mp3') ||
                           originalName.endsWith('.wav') || originalName.endsWith('.mp4');

      const summaryRes = isAudioFile
        ? await fetch(`https://auraq-ai-customer-quality-auditor-production.up.railway.app/get-file-summary/${encodeURIComponent(originalName)}`).catch(() => null)
        : await fetch(`https://upbeat-essence-production-929d.up.railway.app/get-file-summary/${encodeURIComponent(originalName)}`).catch(() => null);
      const summaryData = summaryRes?.ok ? await summaryRes.json() : null;

      const transcriptRes = isAudioFile
        ? await fetch(`https://auraq-ai-customer-quality-auditor-production.up.railway.app/get-transcript?t=${Date.now()}`).catch(() => null)
        : await fetch(`https://upbeat-essence-production-929d.up.railway.app/get-text-transcript?t=${Date.now()}`).catch(() => null);
      const transcriptData = transcriptRes?.ok ? await transcriptRes.json() : [];

      const summary = summaryData?.summary && summaryData.summary !== 'No summary available.'
        ? summaryData.summary
        : reportData.summary || 'No summary available.';

      buildPDF({
        fileName:        originalName,
        summary,
        emotionData:     reportData.emotionData,
        satData:         reportData.satData,
        scores: {
          empathy:          scores?.empathy          ?? 0,
          compliance:       scores?.compliance       ?? 0,
          resolution:       scores?.resolution       ?? 0,
          reasoning:        scores?.reasoning        ?? '',
          efficiency_score: scores?.efficiency_score ?? 0,
          total_messages:   scores?.total_messages   ?? 0,
        },
        fairnessScores:  scores?.fairness_scores  ?? { name_neutrality: 0, language_neutrality: 0, tone_consistency: 0, equal_effort: 0 },
        namesAnonymized: scores?.names_anonymized ?? [],
      }, transcriptData);

    } catch (e) {
      console.error('PDF generation error:', e);
    } finally {
      setDownloading(null);
    }
  };

  // ── Download Transcript as Word Document (transcript only) ────────────────
  const downloadTranscriptDoc = async (filename: string) => {
    setDownloading(filename + '_doc');
    try {
      const scoresRes    = await fetch(`https://charming-flexibility-production.up.railway.app/get-file-scores/${encodeURIComponent(filename)}`);
      const scores       = scoresRes.ok ? await scoresRes.json() : null;
      const originalName = scores?.original_filename || filename;
      const isAudioFile  = originalName.endsWith('.m4a') || originalName.endsWith('.mp3') ||
                           originalName.endsWith('.wav') || originalName.endsWith('.mp4');

      // Fetch transcript only
      const transcriptRes = isAudioFile
        ? await fetch(`https://auraq-ai-customer-quality-auditor-production.up.railway.app/get-transcript?t=${Date.now()}`).catch(() => null)
        : await fetch(`https://upbeat-essence-production-929d.up.railway.app/get-text-transcript?t=${Date.now()}`).catch(() => null);
      const transcriptData = transcriptRes?.ok ? await transcriptRes.json() : [];

      const children: any[] = [];

      // Title
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          children: [
            new TextRun({ text: 'Call Transcript', bold: true, size: 40, color: '1E3A5F' }),
          ],
          spacing: { after: 100 },
        })
      );

      // File name + date
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: 'File:  ', bold: true, size: 18, color: '64748B' }),
            new TextRun({ text: originalName, size: 18, color: '334155' }),
            new TextRun({ text: '     |     ', size: 18, color: 'CBD5E1' }),
            new TextRun({ text: 'Date:  ', bold: true, size: 18, color: '64748B' }),
            new TextRun({
              text: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
              size: 18, color: '334155',
            }),
          ],
          spacing: { after: 80 },
        })
      );

      // Divider
      children.push(
        new Paragraph({
          border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: '2563EB', space: 1 } },
          children: [new TextRun({ text: '' })],
          spacing: { after: 300 },
        })
      );

      // Transcript messages
      if (transcriptData && transcriptData.length > 0) {
        transcriptData.forEach((msg: any, index: number) => {
          const speaker = msg.speaker || 'Unknown';
          const text    = msg.text || msg.transcription || '';
          const time    = msg.start
            ? new Date(msg.start * 1000).toISOString().substr(14, 5)
            : '00:00';
          const isAgent = speaker.includes('00') || speaker.toLowerCase().includes('agent');
          const label   = isAgent ? '\uD83E\uDDD1\u200D\uD83D\uDCBC  Agent' : '\uD83D\uDC64  Customer';
          const color   = isAgent ? '1D4ED8' : '065F46';

          // Speaker header with left border
          children.push(
            new Paragraph({
              children: [
                new TextRun({ text: label, bold: true, size: 19, color }),
                new TextRun({ text: `     ${time}`, size: 16, color: '94A3B8' }),
              ],
              spacing: { before: index === 0 ? 0 : 240, after: 60 },
              border: {
                left: {
                  style: BorderStyle.SINGLE,
                  size: 18,
                  color: isAgent ? '2563EB' : '059669',
                  space: 8,
                },
              },
              indent: { left: 120 },
            })
          );

          // Message text
          children.push(
            new Paragraph({
              children: [new TextRun({ text, size: 20, color: '1E293B' })],
              indent: { left: 280 },
              spacing: { after: 60 },
            })
          );

          // Thin separator between messages
          children.push(
            new Paragraph({
              border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: 'F1F5F9', space: 1 } },
              children: [new TextRun({ text: '' })],
              spacing: { after: 0 },
            })
          );
        });
      } else {
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: 'No transcript available.', size: 20, italics: true, color: '94A3B8' }),
            ],
          })
        );
      }

      // Footer
      children.push(
        new Paragraph({
          border: { top: { style: BorderStyle.SINGLE, size: 6, color: 'E2E8F0', space: 1 } },
          children: [
            new TextRun({
              text: 'Generated by AuraQ \u2014 AI Call Quality Auditor',
              size: 16, color: '94A3B8', italics: true,
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { before: 500 },
        })
      );

      // Build document
      const doc = new Document({
        styles: {
          default: { document: { run: { font: 'Arial', size: 22 } } },
          paragraphStyles: [
            {
              id: 'Heading1', name: 'Heading 1', basedOn: 'Normal',
              next: 'Normal', quickFormat: true,
              run: { size: 40, bold: true, font: 'Arial', color: '1E3A5F' },
              paragraph: { spacing: { before: 0, after: 200 }, outlineLevel: 0 },
            },
          ],
        },
        sections: [{
          properties: {
            page: {
              size: { width: 12240, height: 15840 },
              margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
            },
          },
          children,
        }],
      });

      const buffer = await Packer.toBlob(doc);
      saveAs(buffer, `AuraQ_Transcript_${originalName}_${new Date().toISOString().slice(0, 10)}.docx`);

    } catch (e) {
      console.error('Word doc generation error:', e);
    } finally {
      setDownloading(null);
    }
  };

  // ── Build PDF ─────────────────────────────────────────────────────────────
  const buildPDF = (data: ReportData, transcript: any[] = []) => {
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const W   = pdf.internal.pageSize.getWidth();
    const H   = pdf.internal.pageSize.getHeight();
    const pad = 18;
    let y     = 0;

    const BG      = [11,  18,  36]  as [number,number,number];
    const CARD    = [22,  30,  49]  as [number,number,number];
    const BLUE    = [59, 130, 246]  as [number,number,number];
    const WHITE   = [255,255,255]   as [number,number,number];
    const SLATE   = [148,163,184]   as [number,number,number];
    const EMERALD = [16, 185, 129]  as [number,number,number];
    const INDIGO  = [99, 102, 241]  as [number,number,number];
    const YELLOW  = [234,179,  8]   as [number,number,number];
    const PURPLE  = [168, 85, 247]  as [number,number,number];

    const sf = (c:[number,number,number]) => pdf.setFillColor(c[0],c[1],c[2]);
    const st = (c:[number,number,number]) => pdf.setTextColor(c[0],c[1],c[2]);
    const sd = (c:[number,number,number]) => pdf.setDrawColor(c[0],c[1],c[2]);

    let pageNum = 1;

    const drawFooter = () => {
      sd([30,41,59]); pdf.line(pad, H-14, W-pad, H-14);
      st(SLATE); pdf.setFontSize(7); pdf.setFont('helvetica','normal');
      pdf.text('Generated by AuraQ \u2014 AI Call Quality Auditor', pad, H-9);
      pdf.text(`Page ${pageNum}`, W-pad, H-9, { align: 'right' });
    };

    const checkPage = (needed: number) => {
      if (y + needed > H - 20) {
        drawFooter();
        pdf.addPage();
        pageNum++;
        sf(BG); pdf.rect(0,0,W,H,'F');
        y = 20;
      }
    };

    // Header
    sf(BG); pdf.rect(0,0,W,H,'F');
    sf(BLUE); pdf.rect(0,0,W,18,'F');
    st(WHITE); pdf.setFontSize(14); pdf.setFont('helvetica','bold');
    pdf.text('AuraQ', pad, 12);
    st([147,197,253]); pdf.setFontSize(8); pdf.setFont('helvetica','normal');
    pdf.text('AI Call Quality Auditor', pad+22, 12);
    st(WHITE); pdf.setFontSize(8);
    pdf.text(new Date().toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'}), W-pad, 12, {align:'right'});
    y = 28;

    // Title + filename
    st(WHITE); pdf.setFontSize(20); pdf.setFont('helvetica','bold');
    pdf.text('Call Quality Report', pad, y); y+=7;
    st(SLATE); pdf.setFontSize(9); pdf.setFont('helvetica','normal');
    pdf.text(`File: ${data.fileName}`, pad, y); y+=10;
    sd([30,41,59]); pdf.setLineWidth(0.3); pdf.line(pad,y,W-pad,y); y+=8;

    // Executive Summary
    checkPage(40);
    sf(CARD); pdf.roundedRect(pad,y,W-pad*2,38,3,3,'F');
    st(BLUE); pdf.setFontSize(7); pdf.setFont('helvetica','bold');
    pdf.text('EXECUTIVE SUMMARY', pad+4, y+7);
    st(SLATE); pdf.setFontSize(8.5); pdf.setFont('helvetica','italic');
    const sumLines = pdf.splitTextToSize(data.summary, W-pad*2-12);
    pdf.text(sumLines.slice(0,3), pad+6, y+14); y+=46;

    // Emotion + Satisfaction
    checkPage(45);
    const halfW = (W-pad*2-6)/2;
    sf(CARD); pdf.roundedRect(pad,y,halfW,40,3,3,'F');
    st(BLUE); pdf.setFontSize(7); pdf.setFont('helvetica','bold');
    pdf.text('CUSTOMER EMOTION', pad+4, y+7);
    if (data.emotionData) {
      st(WHITE); pdf.setFontSize(14); pdf.setFont('helvetica','bold');
      pdf.text(data.emotionData.emotion, pad+4, y+18);
      st(SLATE); pdf.setFontSize(8); pdf.setFont('helvetica','normal');
      pdf.text(`Confidence: ${data.emotionData.confidence}`, pad+4, y+25);
      const eL = pdf.splitTextToSize(data.emotionData.reason, halfW-8);
      pdf.text(eL.slice(0,2), pad+4, y+31);
    } else { st(SLATE); pdf.setFontSize(8); pdf.text('No emotion data', pad+4, y+20); }

    const sx = pad+halfW+6;
    sf(CARD); pdf.roundedRect(sx,y,halfW,40,3,3,'F');
    st(BLUE); pdf.setFontSize(7); pdf.setFont('helvetica','bold');
    pdf.text('SATISFACTION SCORE', sx+4, y+7);
    if (data.satData) {
      st(EMERALD); pdf.setFontSize(20); pdf.setFont('helvetica','bold');
      pdf.text(data.satData.score_percentage, sx+4, y+20);
      st(SLATE); pdf.setFontSize(8); pdf.setFont('helvetica','normal');
      pdf.text(`Status: ${data.satData.status}`, sx+4, y+27);
      const sL = pdf.splitTextToSize(data.satData.reason, halfW-8);
      pdf.text(sL.slice(0,2), sx+4, y+33);
    } else { st(SLATE); pdf.setFontSize(8); pdf.text('No satisfaction data', sx+4, y+20); }
    y+=48;

    // Quality Scores
    checkPage(50);
    st(WHITE); pdf.setFontSize(11); pdf.setFont('helvetica','bold');
    pdf.text('Quality Scores', pad, y); y+=7;
    const scoreItems = [
      {label:'Empathy',    val:data.scores.empathy,    color:BLUE},
      {label:'Compliance', val:data.scores.compliance, color:INDIGO},
      {label:'Resolution', val:data.scores.resolution, color:EMERALD},
    ];
    const cardW = (W-pad*2-8)/3;
    scoreItems.forEach((item,i) => {
      const cx = pad+i*(cardW+4);
      sf(CARD); pdf.roundedRect(cx,y,cardW,28,3,3,'F');
      st(SLATE); pdf.setFontSize(7); pdf.setFont('helvetica','bold');
      pdf.text(item.label.toUpperCase(), cx+4, y+7);
      st(item.color); pdf.setFontSize(18); pdf.setFont('helvetica','bold');
      pdf.text(`${item.val}`, cx+4, y+19);
      st(SLATE); pdf.setFontSize(8);
      pdf.text('/10', cx+4+(item.val>=10?12:8), y+19);
      sf([11,18,36]); pdf.roundedRect(cx+4,y+22,cardW-8,2.5,1,1,'F');
      sf(item.color); pdf.roundedRect(cx+4,y+22,(cardW-8)*(item.val/10),2.5,1,1,'F');
    });
    y+=36;

    // Efficiency
    checkPage(30);
    const eHW = (W-pad*2-6)/2;
    sf(CARD); pdf.roundedRect(pad,y,eHW,25,3,3,'F');
    st(SLATE); pdf.setFontSize(7); pdf.setFont('helvetica','bold');
    pdf.text('EFFICIENCY SCORE', pad+4, y+7);
    st(YELLOW); pdf.setFontSize(16); pdf.setFont('helvetica','bold');
    pdf.text(`${data.scores.efficiency_score}`, pad+4, y+19);
    st(SLATE); pdf.setFontSize(8);
    pdf.text('/10', pad+4+(data.scores.efficiency_score>=10?12:8), y+19);

    sf(CARD); pdf.roundedRect(pad+eHW+6,y,eHW,25,3,3,'F');
    st(SLATE); pdf.setFontSize(7); pdf.setFont('helvetica','bold');
    pdf.text('TOTAL MESSAGES', pad+eHW+10, y+7);
    st([34,211,238]); pdf.setFontSize(16); pdf.setFont('helvetica','bold');
    pdf.text(`${data.scores.total_messages}`, pad+eHW+10, y+19);
    y+=33;

    // Fairness
    checkPage(60);
    st(WHITE); pdf.setFontSize(11); pdf.setFont('helvetica','bold');
    pdf.text('Fairness Analysis', pad, y); y+=7;
    const fairItems = [
      {label:'Name Neutrality',     val:data.fairnessScores.name_neutrality,     color:BLUE},
      {label:'Language Neutrality', val:data.fairnessScores.language_neutrality, color:PURPLE},
      {label:'Tone Consistency',    val:data.fairnessScores.tone_consistency,    color:EMERALD},
      {label:'Equal Effort',        val:data.fairnessScores.equal_effort,        color:YELLOW},
    ];
    fairItems.forEach(item => {
      checkPage(14);
      sf(CARD); pdf.roundedRect(pad,y,W-pad*2,11,2,2,'F');
      st(SLATE); pdf.setFontSize(8); pdf.setFont('helvetica','normal');
      pdf.text(item.label, pad+4, y+7);
      st(item.color); pdf.setFont('helvetica','bold');
      pdf.text(`${item.val}/10`, W-pad-14, y+7);
      sf([11,18,36]); pdf.roundedRect(pad+55,y+4,W-pad*2-75,3,1,1,'F');
      sf(item.color); pdf.roundedRect(pad+55,y+4,(W-pad*2-75)*(item.val/10),3,1,1,'F');
      y+=13;
    });
    
    y+=6;
    
    // Bias reduction status
    checkPage(14);
    st(SLATE); pdf.setFontSize(8); pdf.setFont('helvetica','normal');
    if (data.namesAnonymized && data.namesAnonymized.length > 0) {
      const realNames = data.namesAnonymized.filter((n: string) =>
        n.length > 2 && !['Speaker', 'Agent', 'Customer', 'Hello', 'Thank'].includes(n)
      );
      if (realNames.length > 0) {
        pdf.setFont('helvetica','italic');
        pdf.text(`Names anonymized before scoring: ${realNames.join(', ')} replaced with [NAME]`, pad, y);
      } else {
        pdf.setFont('helvetica','italic');
        pdf.text('No personal names detected \u2014 bias reduction applied automatically.', pad, y);
      }
    } else {
      pdf.setFont('helvetica','italic');
      pdf.text('Bias reduction applied \u2014 transcript anonymized before scoring.', pad, y);
    }
    y += 8;

    // Reasoning
    checkPage(50); y+=4;
    st(WHITE); pdf.setFontSize(11); pdf.setFont('helvetica','bold');
    pdf.text('AI Auditor Reasoning', pad, y); y+=7;
    sf(CARD);
    const rLines     = pdf.splitTextToSize(data.scores.reasoning || 'No reasoning available.', W-pad*2-8);
    const lineHeight = 5.5;
    const rPadding   = 14;
    const rH         = rLines.length * lineHeight + rPadding;
    checkPage(rH + 10);
    pdf.roundedRect(pad, y, W-pad*2, rH, 3, 3, 'F');
    sd([30,41,59]); pdf.setLineWidth(0.3);
    pdf.roundedRect(pad, y, W-pad*2, rH, 3, 3, 'S');
    st(SLATE); pdf.setFontSize(8.5); pdf.setFont('helvetica','italic');
    rLines.forEach((line: string, idx: number) => {
      pdf.text(line, pad+5, y + 8 + idx * lineHeight);
    });
    y += rH + 8;

    

    drawFooter();
    pdf.save(`AuraQ_Report_${data.fileName}_${new Date().toISOString().slice(0,10)}.pdf`);
  };

  return (
    <div className="min-h-screen bg-[#080808] text-white font-sans flex flex-col md:flex-row h-screen overflow-hidden">
      <IconNav
        activePage={activePage}
        setActivePage={setActivePage}
        onDownloadClick={() => setShowModal(true)}
      />
      <div className={`${activePage === ('analysis' as any) ? 'hidden lg:flex flex-1' : 'flex flex-1'}`}>
        <CenterPanel
          activePage={activePage}
          onFileUploaded={() => setFileUploaded(true)}
          onReportData={(data) => setReportData(prev => ({ ...prev, ...data }))}
        />
      </div>
      {fileUploaded && (activePage === 'home' || activePage === ('analysis' as any)) && (
        <div className={activePage === ('analysis' as any) ? 'flex w-full lg:w-auto' : 'hidden lg:flex'}>
          <RightSidebar onReportData={(data) => setReportData(prev => ({ ...prev, ...data }))} />
        </div>
      )}

      {/* ── Download Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#0b1224] border border-white/10 rounded-3xl shadow-2xl w-[90vw] md:w-[480px] max-h-[80vh] flex flex-col overflow-hidden">

            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/5">
              <div>
                <h2 className="text-white font-bold text-lg">Download Reports</h2>
                <p className="text-slate-500 text-xs mt-0.5">Select a file to download its PDF or transcript</p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-500 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-xl"
              >
                <X size={20} />
              </button>
            </div>

            {/* File List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {historyFiles.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-600">
                  <Download size={40} className="mb-3 opacity-30" />
                  <p className="text-sm font-medium">No files yet</p>
                  <p className="text-xs mt-1 opacity-60">Upload a call to generate reports</p>
                </div>
              ) : historyFiles.map((file, i) => {
                const isText   = file.filename?.endsWith('.txt') || file.filename?.endsWith('.csv');
                const avgScore = Math.round(((file.empathy + file.compliance + file.resolution) / 3) * 10);
                return (
                  <div key={i} className="bg-[#161e31] border border-white/5 rounded-2xl p-4 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                      {isText
                        ? <FileText  size={18} className="text-blue-400" />
                        : <FileAudio size={18} className="text-blue-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-200 truncate">{file.filename}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{file.saved_at}</p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-[10px] text-blue-400 font-bold">E:{file.empathy}</span>
                        <span className="text-[10px] text-indigo-400 font-bold">C:{file.compliance}</span>
                        <span className="text-[10px] text-emerald-400 font-bold">R:{file.resolution}</span>
                        <span className="text-[10px] text-slate-500">Avg: {avgScore}%</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      {/* PDF button */}
                      <button
                        onClick={() => generatePDF(file.filename)}
                        disabled={!!downloading}
                        className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-500
                          disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all"
                      >
                        {downloading === file.filename
                          ? <Loader2 size={14} className="animate-spin" />
                          : <Download size={14} />}
                        {downloading === file.filename ? 'Generating...' : 'PDF'}
                      </button>
                      {/* DOC button */}
                      <button
                        onClick={() => downloadTranscriptDoc(file.filename)}
                        disabled={!!downloading}
                        className="flex items-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-500
                          disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all"
                      >
                        {downloading === file.filename + '_doc'
                          ? <Loader2 size={14} className="animate-spin" />
                          : <Download size={14} />}
                        {downloading === file.filename + '_doc' ? 'Generating...' : 'DOC'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-white/5">
              <p className="text-[10px] text-slate-600 text-center">
                {historyFiles.length} file{historyFiles.length !== 1 ? 's' : ''} available
              </p>
            </div>
          </div>
        </div>
      )}
    {/* Mobile Bottom Navigation */}
      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#0b1224] border-t border-white/10 flex md:hidden z-50">
        <button
          onClick={() => setActivePage('home')}
          className={`flex-1 flex flex-col items-center py-3 text-xs gap-1
            ${activePage === 'home' ? 'text-blue-400' : 'text-slate-500'}`}
        >
          <span className="text-lg">🏠</span>
          Home
        </button>
        <button
          onClick={() => setActivePage('calls')}
          className={`flex-1 flex flex-col items-center py-3 text-xs gap-1
            ${activePage === 'calls' ? 'text-blue-400' : 'text-slate-500'}`}
        >
          <span className="text-lg">📞</span>
          Calls
        </button>
        <button
          onClick={() => setActivePage('reports')}
          className={`flex-1 flex flex-col items-center py-3 text-xs gap-1
            ${activePage === 'reports' ? 'text-blue-400' : 'text-slate-500'}`}
        >
          <span className="text-lg">📊</span>
          Reports
        </button>
        <button
          onClick={() => setActivePage('analysis' as any)}
          className={`flex-1 flex flex-col items-center py-3 text-xs gap-1
            ${activePage === 'analysis' ? 'text-blue-400' : 'text-slate-500'}`}
        >
          <span className="text-lg">📊</span>
          Analysis
        </button>
        <button
          onClick={() => setShowModal(true)}
          className="flex-1 flex flex-col items-center py-3 text-xs gap-1 text-slate-500"
        >
          <span className="text-lg">⬇️</span>
          Downloads
        </button>
      </div>
    </div>
  );
}

export default Dashboard;