import { useCallback, useEffect, useRef, useState } from "react";

type Message = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  tools?: ToolActivity[];
};

type ToolActivity = {
  name: string;
  args: Record<string, unknown>;
  result?: { success: boolean; output: string; error?: string };
  dangerous?: boolean;
  pendingApproval?: boolean;
  toolCallId?: string;
};

type HealthInfo = {
  ok: boolean;
  hasApiKey: boolean;
  workspace: string;
  model: string;
};

function uid() {
  return Math.random().toString(36).slice(2);
}

export default function App() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: uid(),
      role: "assistant",
      content:
        "Good evening. I am JARVIS — Just A Rather Very Intelligent System. I can manage your files, run commands, inspect your system, and open URLs. How may I assist you?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [health, setHealth] = useState<HealthInfo | null>(null);
  const [listening, setListening] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const sessionId = useRef("default");

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then(setHealth)
      .catch(() => setHealth(null));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const streamChat = useCallback(
    async (url: string, body: Record<string, unknown>, assistantId: string) => {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, sessionId: sessionId.current }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error ?? "Request failed");
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response stream");

      const decoder = new TextDecoder();
      let buffer = "";
      const tools: ToolActivity[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const event = JSON.parse(line.slice(6));

          if (event.type === "text_delta") {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, content: m.content + event.content }
                  : m
              )
            );
          } else if (event.type === "tool_call") {
            tools.push({
              name: event.name,
              args: event.args,
              dangerous: event.dangerous,
              pendingApproval: event.dangerous,
            });
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, tools: [...tools] } : m
              )
            );
          } else if (event.type === "tool_result") {
            const last = tools[tools.length - 1];
            if (last) {
              last.result = event.result;
              last.pendingApproval = event.result.error === "Awaiting user approval";
            }
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, tools: [...tools] } : m
              )
            );
          } else if (event.type === "error") {
            throw new Error(event.message);
          }
        }
      }
    },
    []
  );

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: Message = { id: uid(), role: "user", content: text.trim() };
    const assistantId = uid();
    const assistantMsg: Message = {
      id: assistantId,
      role: "assistant",
      content: "",
      tools: [],
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput("");
    setLoading(true);

    try {
      await streamChat("/api/chat", { message: text.trim() }, assistantId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId ? { ...m, content: `Error: ${msg}` } : m
        )
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const toggleVoice = () => {
    const SpeechRecognition =
      (window as unknown as { webkitSpeechRecognition?: typeof window.SpeechRecognition })
        .webkitSpeechRecognition ?? window.SpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    if (listening) {
      setListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      sendMessage(transcript);
    };

    recognition.start();
  };

  const speak = (text: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 0.9;
    window.speechSynthesis.speak(utterance);
  };

  const resetChat = async () => {
    await fetch("/api/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: sessionId.current }),
    });
    setMessages([
      {
        id: uid(),
        role: "assistant",
        content: "Session reset. How may I assist you?",
      },
    ]);
  };

  return (
    <div className="jarvis-app">
      <div className="grid-bg" />
      <header className="header">
        <div className="logo">
          <div className="arc-reactor" />
          <div>
            <h1>J.A.R.V.I.S.</h1>
            <p className="subtitle">Just A Rather Very Intelligent System</p>
          </div>
        </div>
        <div className="status-bar">
          {health && (
            <>
              <span className={`status-dot ${health.hasApiKey ? "online" : "offline"}`} />
              <span className="status-text">
                {health.hasApiKey ? "ONLINE" : "NO API KEY"}
              </span>
              <span className="divider">|</span>
              <span className="meta">{health.model}</span>
              <span className="divider">|</span>
              <span className="meta workspace" title={health.workspace}>
                {health.workspace}
              </span>
            </>
          )}
          <button className="btn-ghost" onClick={resetChat} type="button">
            Reset
          </button>
        </div>
      </header>

      <main className="chat-area">
        <div className="messages">
          {messages.map((msg) => (
            <div key={msg.id} className={`message ${msg.role}`}>
              <div className="message-label">
                {msg.role === "user" ? "YOU" : "JARVIS"}
              </div>
              <div className="message-content">
                {msg.content || (loading && msg.role === "assistant" ? "..." : "")}
                {msg.tools && msg.tools.length > 0 && (
                  <div className="tool-log">
                    {msg.tools.map((t, i) => (
                      <div key={i} className={`tool-entry ${t.result?.success === false ? "error" : ""}`}>
                        <span className="tool-name">{t.name}</span>
                        <code className="tool-args">{JSON.stringify(t.args)}</code>
                        {t.result && (
                          <pre className="tool-output">
                            {t.result.error ?? t.result.output.slice(0, 500)}
                          </pre>
                        )}
                        {t.pendingApproval && (
                          <span className="approval-badge">Awaiting approval</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {msg.role === "assistant" && msg.content && (
                <button
                  className="btn-speak"
                  onClick={() => speak(msg.content)}
                  type="button"
                  title="Read aloud"
                >
                  🔊
                </button>
              )}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </main>

      <footer className="input-area">
        <form onSubmit={handleSubmit}>
          <button
            type="button"
            className={`btn-voice ${listening ? "active" : ""}`}
            onClick={toggleVoice}
            title="Voice input"
          >
            {listening ? "●" : "🎤"}
          </button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask JARVIS to control your computer..."
            disabled={loading}
            autoFocus
          />
          <button type="submit" disabled={loading || !input.trim()} className="btn-send">
            {loading ? "..." : "Send"}
          </button>
        </form>
      </footer>
    </div>
  );
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onstart: ((this: SpeechRecognition, ev: Event) => void) | null;
  onend: ((this: SpeechRecognition, ev: Event) => void) | null;
  onerror: ((this: SpeechRecognition, ev: Event) => void) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void) | null;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  [index: number]: SpeechRecognitionResult;
  length: number;
}

interface SpeechRecognitionResult {
  [index: number]: SpeechRecognitionAlternative;
  length: number;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}
