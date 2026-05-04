import { useEffect, useState, useRef } from 'react';
import { postAIChat, getAIHistory } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function AIAssistant() {
  const { user } = useAuth();
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => () => { mountedRef.current = false; }, []);

  useEffect(() => {
    if (!sessionId) return;
    getAIHistory(sessionId)
      .then((res) => setMessages(res.data.messages || []))
      .catch(() => {});
  }, [sessionId]);

  async function send() {
    if (!input.trim()) return;
    setLoading(true);
    const userMessage = { role: 'user', text: input };
    setMessages((m) => [...m, userMessage]);
    try {
      const res = await postAIChat({ sessionId, message: input });
      if (!mountedRef.current) return;
      setSessionId(res.data.sessionId);
      setMessages((m) => [...m, { role: 'assistant', text: res.data.reply }]);
      setInput('');
    } catch (err) {
      setMessages((m) => [...m, { role: 'assistant', text: 'AI error: failed to respond' }]);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">AI Assistant</h1>
      <div className="border rounded p-4 mb-4 h-80 overflow-auto bg-white">
        {messages.length === 0 && <div className="text-gray-500">No messages yet. Say hi!</div>}
        {messages.map((m, i) => (
          <div key={i} className={`mb-3 ${m.role === 'assistant' ? 'text-left' : 'text-right'}`}>
            <div className="inline-block px-3 py-2 rounded shadow-sm bg-gray-100">{m.text}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          className="flex-1 px-3 py-2 border rounded"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask the assistant..."
          onKeyDown={(e) => { if (e.key === 'Enter') send(); }}
        />
        <button className="px-4 py-2 bg-primary-500 text-white rounded" onClick={send} disabled={loading}>
          {loading ? '...' : 'Send'}
        </button>
      </div>
    </div>
  );
}
