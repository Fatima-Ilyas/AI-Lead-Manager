import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { createSampleLeads, previewAnalysis } from "../data/sampleLeads";

const STORAGE_KEY = "lead-manager-preview-v1";
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api",
  timeout: 15000,
});

function storedPreview() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (
      Array.isArray(parsed) &&
      parsed.every(
        (lead) =>
          lead &&
          typeof lead.id === "string" &&
          typeof lead.name === "string" &&
          typeof lead.email === "string",
      )
    )
      return parsed;
  } catch {
    /* Browser storage may be unavailable. Preview still works in memory. */
  }
  return createSampleLeads();
}

export function useLeads() {
  const [leads, setLeads] = useState([]);
  const [mode, setMode] = useState("loading");
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(new Set());
  const modeRef = useRef("loading");

  const refresh = useCallback(async (signal) => {
    setRefreshing(true);
    setError("");
    try {
      const { data } = await api.get("/leads", { signal, timeout: 4000 });
      if (!Array.isArray(data)) throw new Error("Unexpected response");
      setLeads(
        data.map((lead) => ({
          ...lead,
          status: ["new", "contacted", "qualified", "closed"].includes(
            lead.status,
          )
            ? lead.status
            : "new",
        })),
      );
      modeRef.current = "live";
      setMode("live");
      return true;
    } catch (failure) {
      if (axios.isCancel(failure)) return false;
      if (modeRef.current === "live") {
        setError(
          "We couldn’t refresh your leads. Your last loaded information is still available.",
        );
      } else {
        setLeads(storedPreview());
        modeRef.current = "sample";
        setMode("sample");
      }
      return false;
    } finally {
      if (!signal?.aborted) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    // eslint-disable-next-line react/set-state-in-effect -- Synchronize the workspace with the external API on mount.
    refresh(controller.signal);
    return () => controller.abort();
  }, [refresh]);

  useEffect(() => {
    if (mode !== "sample") return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(leads));
    } catch {
      /* Keep the workspace usable without storage. */
    }
  }, [leads, mode]);

  const perform = async (key, action) => {
    setPending((previous) => new Set(previous).add(key));
    try {
      return await action();
    } catch {
      toast.error("Your change couldn’t be saved.", {
        description:
          "Check your connection and refresh your leads before trying again.",
      });
      return false;
    } finally {
      setPending((previous) => {
        const next = new Set(previous);
        next.delete(key);
        return next;
      });
    }
  };

  const updateLead = (id, field, value) =>
    perform(`${id}:${field}`, async () => {
      if (modeRef.current === "live") {
        const endpoint = field === "status" ? "status" : "follow-up";
        const { data } = await api.put(
          `/leads/${encodeURIComponent(id)}/${endpoint}`,
          null,
          { params: { [field]: value } },
        );
        if (data.error) throw new Error(data.error);
      }
      setLeads((previous) =>
        previous.map((lead) =>
          lead.id === id ? { ...lead, [field]: value } : lead,
        ),
      );
      toast.success(
        field === "status" ? "Lead stage updated" : "Follow-up scheduled",
        {
          description:
            modeRef.current === "sample"
              ? "Saved to this browser’s sample workspace."
              : undefined,
        },
      );
      return true;
    });

  const createLead = (form) =>
    perform("create", async () => {
      if (modeRef.current === "sample") {
        const lead = {
          ...form,
          ...previewAnalysis(form),
          id: `sample-${crypto.randomUUID()}`,
          status: "new",
          created_at: new Date().toISOString(),
        };
        setLeads((previous) => [lead, ...previous]);
        toast.success("Sample lead added", {
          description:
            "Saved locally with an illustrative score, not live AI analysis.",
        });
        return lead.id;
      }
      const { data } = await api.post("/leads", form, { timeout: 60000 });
      if (data.error) throw new Error(data.error);
      const refreshed = await refresh();
      if (!refreshed)
        setLeads((previous) => [
          {
            ...form,
            id: data.lead_id,
            lead_score: data.lead_score,
            score_reason: data.score_reason,
            ai_response: data.ai_response,
            status: "new",
            created_at: new Date().toISOString(),
            follow_up_date: null,
          },
          ...previous,
        ]);
      toast.success("Lead added and analyzed");
      return data.lead_id;
    });

  return {
    leads,
    mode,
    error,
    pending,
    refreshing,
    refresh,
    updateLead,
    createLead,
  };
}
