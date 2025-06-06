import React, { useEffect, useRef, useState } from "react";

const LogWindow: React.FC = () => {
  const [logs, setLogs] = useState<string>("");
  const logRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Handler to capture errors and logs
    const handleLog = (msg: string) => {
      setLogs((prev) => prev + msg + "\n");
    };
    const handleError = (event: ErrorEvent) => {
      handleLog("[ERROR] " + event.message + (event.filename ? ` (at ${event.filename}:${event.lineno})` : ""));
    };
    const handleRejection = (event: PromiseRejectionEvent) => {
      handleLog("[UNHANDLED REJECTION] " + event.reason);
    };
    const handleConsole = (type: string) => (...args: any[]) => {
      handleLog(`[${type.toUpperCase()}] ` + args.map(String).join(" "));
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleRejection);
    const origLog = console.log;
    const origWarn = console.warn;
    const origError = console.error;
    console.log = handleConsole("log");
    console.warn = handleConsole("warn");
    console.error = handleConsole("error");

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleRejection);
      console.log = origLog;
      console.warn = origWarn;
      console.error = origError;
    };
  }, []);

  const handleCopy = () => {
    if (logRef.current) {
      logRef.current.select();
      document.execCommand("copy");
    }
  };

  return (
    <div style={{ position: "fixed", bottom: 20, right: 20, width: 400, zIndex: 10000, background: "#222", color: "#fff", borderRadius: 8, boxShadow: "0 2px 8px #0008", padding: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontWeight: "bold" }}>Log Window</span>
        <button onClick={handleCopy} style={{ background: "#444", color: "#fff", border: "none", borderRadius: 4, padding: "4px 8px", cursor: "pointer" }}>Copy</button>
      </div>
      <textarea
        ref={logRef}
        value={logs}
        readOnly
        style={{ width: "100%", height: 180, background: "#111", color: "#fff", border: "none", borderRadius: 4, resize: "none", fontFamily: "monospace", fontSize: 12 }}
      />
    </div>
  );
};

export default LogWindow;
