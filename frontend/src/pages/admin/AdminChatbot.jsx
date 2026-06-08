import React, { useEffect, useState } from "react";
import { adminApi } from "../../lib/api";
import { toast } from "sonner";
import { Save, Bot } from "lucide-react";

const inputCls = "w-full mt-1 rounded-lg border border-sand-300 bg-white px-3 py-2 text-sm focus:outline-none focus:border-clinic-forest";

export default function AdminChatbot() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await adminApi.get("/admin/chatbot-config");
      setConfig(data);
    } catch { toast.error("Failed to load chatbot config"); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    try {
      const { data } = await adminApi.patch("/admin/chatbot-config", {
        system_prompt: config.system_prompt,
        training_context: config.training_context,
        guardrails: config.guardrails,
        provider: config.provider,
        model: config.model,
        api_key_override: config.api_key_override || null,
        active: config.active,
      });
      setConfig(data);
      toast.success("Chatbot config saved");
    } catch { toast.error("Failed to save"); }
  };

  if (loading || !config) return <div className="text-clinic-mist">Loading...</div>;

  return (
    <div data-testid="admin-chatbot">
      <div className="flex items-center gap-3">
        <Bot className="h-6 w-6 text-clinic-forest" />
        <div>
          <div className="text-xs uppercase tracking-[0.22em] font-semibold text-clinic-forest">AI Assistant</div>
          <h1 className="font-display text-3xl font-extrabold text-clinic-navy mt-1">Chatbot Settings</h1>
        </div>
      </div>
      <p className="text-clinic-mist text-sm mt-2 max-w-2xl">
        Configure the chatbot's personality, knowledge, guardrails, and LLM provider. Changes take effect immediately.
      </p>

      <div className="mt-8 space-y-6 max-w-3xl">
        {/* Active toggle */}
        <label className="flex items-center gap-3 text-sm font-semibold text-clinic-navy">
          <input
            type="checkbox"
            checked={config.active}
            onChange={(e) => setConfig({ ...config, active: e.target.checked })}
            className="h-4 w-4"
          />
          Chatbot active
        </label>

        {/* LLM Config */}
        <div className="bg-white rounded-xl border border-sand-300/60 p-5">
          <div className="text-xs uppercase tracking-widest font-bold text-clinic-forest mb-3">LLM Configuration</div>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="text-[10px] uppercase tracking-widest font-bold text-clinic-mist">Provider</label>
              <select
                value={config.provider}
                onChange={(e) => setConfig({ ...config, provider: e.target.value })}
                className={inputCls}
              >
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
                <option value="gemini">Gemini</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest font-bold text-clinic-mist">Model</label>
              <input
                value={config.model}
                onChange={(e) => setConfig({ ...config, model: e.target.value })}
                placeholder="gpt-4o-mini"
                className={inputCls}
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest font-bold text-clinic-mist">API Key Override</label>
              <input
                value={config.api_key_override || ""}
                onChange={(e) => setConfig({ ...config, api_key_override: e.target.value })}
                placeholder="Leave empty to use default"
                type="password"
                className={inputCls}
              />
              <div className="text-[10px] text-clinic-mist mt-1">Leave empty to use the deployed OPENAI_API_KEY</div>
            </div>
          </div>
        </div>

        {/* System Prompt */}
        <div className="bg-white rounded-xl border border-sand-300/60 p-5">
          <div className="text-xs uppercase tracking-widest font-bold text-clinic-forest mb-1">System Prompt</div>
          <p className="text-xs text-clinic-mist mb-3">The core personality and knowledge base of the chatbot.</p>
          <textarea
            value={config.system_prompt}
            onChange={(e) => setConfig({ ...config, system_prompt: e.target.value })}
            rows={12}
            className="w-full rounded-lg border border-sand-300 bg-sand-50 px-4 py-3 text-sm leading-relaxed focus:outline-none focus:border-clinic-forest"
          />
        </div>

        {/* Training Context */}
        <div className="bg-white rounded-xl border border-sand-300/60 p-5">
          <div className="text-xs uppercase tracking-widest font-bold text-clinic-forest mb-1">Additional Training Context</div>
          <p className="text-xs text-clinic-mist mb-3">Add extra knowledge, FAQs, policies, or notes for the bot to reference. This is appended to the system prompt.</p>
          <textarea
            value={config.training_context}
            onChange={(e) => setConfig({ ...config, training_context: e.target.value })}
            rows={8}
            placeholder="e.g. We currently have a promotion on dental cleanings through March. the veterinarian will be out the first week of April..."
            className="w-full rounded-lg border border-sand-300 bg-sand-50 px-4 py-3 text-sm leading-relaxed focus:outline-none focus:border-clinic-forest placeholder:text-clinic-mist/40"
          />
        </div>

        {/* Guardrails */}
        <div className="bg-white rounded-xl border border-sand-300/60 p-5">
          <div className="text-xs uppercase tracking-widest font-bold text-clinic-forest mb-1">Guardrails</div>
          <p className="text-xs text-clinic-mist mb-3">Rules and boundaries. What the bot should and should not do.</p>
          <textarea
            value={config.guardrails}
            onChange={(e) => setConfig({ ...config, guardrails: e.target.value })}
            rows={8}
            className="w-full rounded-lg border border-sand-300 bg-sand-50 px-4 py-3 text-sm leading-relaxed focus:outline-none focus:border-clinic-forest"
          />
        </div>

        <button
          onClick={save}
          className="inline-flex items-center gap-2 rounded-full bg-clinic-forest hover:bg-clinic-forest/90 text-white px-6 py-3 font-semibold"
          data-testid="chatbot-save"
        >
          <Save className="h-4 w-4" /> Save Chatbot Config
        </button>
      </div>
    </div>
  );
}
