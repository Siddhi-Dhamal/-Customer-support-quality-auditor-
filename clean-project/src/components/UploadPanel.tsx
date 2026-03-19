import { useState, useCallback } from "react";
import { Upload, PhoneCall, MessageSquare, FileAudio, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export function UploadPanel() {
  const [dragOver, setDragOver] = useState(false);
  const [files, setFiles] = useState<File[]>([]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = Array.from(e.dataTransfer.files);
    setFiles((prev) => [...prev, ...dropped]);
  }, []);

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="glass-card rounded-xl p-6 animate-slide-up">
      <h2 className="text-lg font-heading font-semibold mb-4">Upload for Analysis</h2>
      <Tabs defaultValue="call">
        <TabsList className="bg-secondary/50 mb-4">
          <TabsTrigger value="call" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-2">
            <PhoneCall className="h-4 w-4" /> Call Recording
          </TabsTrigger>
          <TabsTrigger value="chat" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-2">
            <MessageSquare className="h-4 w-4" /> Chat Log
          </TabsTrigger>
        </TabsList>

        <TabsContent value="call">
          <DropZone
            dragOver={dragOver}
            setDragOver={setDragOver}
            handleDrop={handleDrop}
            accept="audio/*"
            icon={<FileAudio className="h-10 w-10 text-primary/60" />}
            hint="Drop call recordings here (.mp3, .wav, .m4a)"
            onFiles={(f) => setFiles((prev) => [...prev, ...f])}
          />
        </TabsContent>
        <TabsContent value="chat">
          <DropZone
            dragOver={dragOver}
            setDragOver={setDragOver}
            handleDrop={handleDrop}
            accept=".txt,.json,.csv"
            icon={<FileText className="h-10 w-10 text-primary/60" />}
            hint="Drop chat logs here (.txt, .json, .csv)"
            onFiles={(f) => setFiles((prev) => [...prev, ...f])}
          />
        </TabsContent>
      </Tabs>

      {files.length > 0 && (
        <div className="mt-4 space-y-2">
          {files.map((file, i) => (
            <div key={i} className="flex items-center justify-between bg-secondary/40 rounded-lg px-4 py-2">
              <span className="text-sm truncate">{file.name}</span>
              <button onClick={() => removeFile(i)} className="text-muted-foreground hover:text-destructive">
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
          <Button className="w-full mt-3 bg-primary text-primary-foreground hover:bg-primary/90">
            <Upload className="h-4 w-4 mr-2" /> Analyze {files.length} file{files.length > 1 ? "s" : ""}
          </Button>
        </div>
      )}
    </div>
  );
}

function DropZone({
  dragOver, setDragOver, handleDrop, accept, icon, hint, onFiles,
}: {
  dragOver: boolean;
  setDragOver: (v: boolean) => void;
  handleDrop: (e: React.DragEvent) => void;
  accept: string;
  icon: React.ReactNode;
  hint: string;
  onFiles: (f: File[]) => void;
}) {
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
        dragOver ? "border-primary bg-primary/5" : "border-border/50 hover:border-primary/30"
      }`}
      onClick={() => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = accept;
        input.multiple = true;
        input.onchange = () => {
          if (input.files) onFiles(Array.from(input.files));
        };
        input.click();
      }}
    >
      <div className="flex flex-col items-center gap-3">
        {icon}
        <p className="text-sm text-muted-foreground">{hint}</p>
        <p className="text-xs text-muted-foreground/60">or click to browse</p>
      </div>
    </div>
  );
}
