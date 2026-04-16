"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Edge,
  type Node,
  type NodeChange,
  type EdgeChange,
  type Connection,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { saveFlowAction } from "@/actions/flows";
import type { Flow } from "@/lib/ai/flows";

type NodeKind = "send_message" | "wait" | "tag_member" | "transfer_human" | "condition";

const NODE_PALETTE: Array<{ kind: NodeKind; label: string; description: string }> = [
  { kind: "send_message", label: "Enviar mensagem", description: "IA envia texto para o membro" },
  { kind: "wait", label: "Esperar", description: "Pausa antes do próximo passo" },
  { kind: "tag_member", label: "Tag no membro", description: "Adiciona uma tag ao cadastro" },
  { kind: "transfer_human", label: "Transferir humano", description: "Encaminha para pastor" },
  { kind: "condition", label: "Condição", description: "Ramifica baseado em dados" },
];

function nodeDefaults(kind: NodeKind): Record<string, unknown> {
  switch (kind) {
    case "send_message":
      return { label: "Enviar mensagem", text: "Olá!" };
    case "wait":
      return { label: "Esperar", seconds: 60 };
    case "tag_member":
      return { label: "Tag", tag: "" };
    case "transfer_human":
      return { label: "Transferir", reason: "" };
    case "condition":
      return { label: "Condição", expression: "member.status === 'visitante'" };
  }
}

export function FlowEditor({ flow }: { flow: Flow }) {
  const [name, setName] = useState(flow.name);
  const [description, setDescription] = useState(flow.description ?? "");
  const [enabled, setEnabled] = useState(flow.enabled);
  const [triggerType, setTriggerType] = useState<Flow["trigger_type"]>(flow.trigger_type);
  const [triggerKeyword, setTriggerKeyword] = useState(
    String((flow.trigger_config as { keyword?: string })?.keyword ?? ""),
  );

  const [nodes, setNodes] = useState<Node[]>(
    flow.nodes.map((n) => ({ id: n.id, type: "default", position: n.position, data: n.data })),
  );
  const [edges, setEdges] = useState<Edge[]>(
    flow.edges.map((e) => ({ id: e.id, source: e.source, target: e.target })),
  );

  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  const onNodesChange = useCallback((changes: NodeChange[]) => setNodes((ns) => applyNodeChanges(changes, ns)), []);
  const onEdgesChange = useCallback((changes: EdgeChange[]) => setEdges((es) => applyEdgeChanges(changes, es)), []);
  const onConnect = useCallback((conn: Connection) => setEdges((es) => addEdge(conn, es)), []);

  const addNode = (kind: NodeKind) => {
    const id = `${kind}-${Date.now()}`;
    const base = nodeDefaults(kind);
    setNodes((ns) => [
      ...ns,
      {
        id,
        type: "default",
        position: { x: 200 + ns.length * 30, y: 120 + ns.length * 40 },
        data: { ...base, kind, label: `${base.label}` },
      },
    ]);
  };

  const updateSelectedNode = (id: string, patch: Record<string, unknown>) => {
    setNodes((ns) => ns.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...patch } } : n)));
  };

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = nodes.find((n) => n.id === selectedId) ?? null;

  const save = () => {
    start(async () => {
      const res = await saveFlowAction({
        id: flow.id,
        name,
        description: description || null,
        enabled,
        trigger_type: triggerType,
        trigger_config: triggerType === "keyword" ? { keyword: triggerKeyword } : {},
        nodes: nodes.map((n) => ({ id: n.id, type: (n.data?.kind as string) ?? "trigger", position: n.position, data: n.data })),
        edges: edges.map((e) => ({ id: e.id, source: e.source, target: e.target })),
      });
      setMessage({ ok: res.ok, text: res.message ?? (res.ok ? "Salvo" : "Erro") });
      setTimeout(() => setMessage(null), 3000);
    });
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        save();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges, name, description, enabled, triggerType, triggerKeyword]);

  return (
    <div className="flex h-[calc(100vh-14rem)] flex-col gap-3">
      <div className="flex items-center gap-3 rounded-lg bg-card p-4 shadow-card">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 rounded-full bg-forest-green/[0.04] px-4 py-2 font-display text-sm font-bold text-forest-green outline-none"
        />
        <select
          value={triggerType}
          onChange={(e) => setTriggerType(e.target.value as Flow["trigger_type"])}
          className="rounded-full bg-forest-green/[0.04] px-4 py-2 font-sans text-xs text-forest-green outline-none"
        >
          <option value="welcome">Boas-vindas</option>
          <option value="keyword">Palavra-chave</option>
          <option value="first_contact">Primeiro contato</option>
          <option value="member_updated">Cadastro atualizado</option>
          <option value="event_registered">Inscrição em evento</option>
          <option value="manual">Manual</option>
        </select>
        {triggerType === "keyword" ? (
          <input
            value={triggerKeyword}
            onChange={(e) => setTriggerKeyword(e.target.value)}
            placeholder="palavra exata"
            className="w-40 rounded-full bg-forest-green/[0.04] px-4 py-2 font-sans text-xs text-forest-green outline-none"
          />
        ) : null}
        <label className="flex items-center gap-2 font-sans text-xs text-forest-green/70">
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
          Ativo
        </label>
        <button
          onClick={save}
          disabled={pending}
          className="rounded-full bg-gradient-to-br from-forest-green to-action-green px-5 py-2 font-display text-xs font-bold uppercase tracking-widest text-card disabled:opacity-50"
        >
          {pending ? "Salvando..." : "Salvar"}
        </button>
        {message ? (
          <span className={`font-sans text-xs ${message.ok ? "text-action-green" : "text-red-500"}`}>{message.text}</span>
        ) : null}
      </div>

      <div className="grid flex-1 grid-cols-[200px_1fr_280px] gap-3 overflow-hidden">
        <aside className="overflow-y-auto rounded-lg bg-card p-3 shadow-card">
          <p className="px-2 pb-2 font-display text-[10px] font-bold uppercase tracking-widest text-forest-green/60">
            Adicionar nó
          </p>
          {NODE_PALETTE.map((p) => (
            <button
              key={p.kind}
              onClick={() => addNode(p.kind)}
              className="mb-2 w-full rounded-lg bg-forest-green/[0.04] p-3 text-left hover:bg-forest-green/[0.08]"
            >
              <p className="font-display text-xs font-bold text-forest-green">{p.label}</p>
              <p className="mt-1 font-sans text-[10px] text-forest-green/60">{p.description}</p>
            </button>
          ))}
        </aside>

        <div className="overflow-hidden rounded-lg bg-card shadow-card">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={(_, n) => setSelectedId(n.id)}
            fitView
          >
            <Background />
            <Controls />
          </ReactFlow>
        </div>

        <aside className="overflow-y-auto rounded-lg bg-card p-4 shadow-card">
          {!selected ? (
            <>
              <p className="font-display text-[10px] font-bold uppercase tracking-widest text-forest-green/60">
                Descrição do fluxo
              </p>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Para que serve este fluxo?"
                rows={5}
                className="mt-2 w-full rounded-lg bg-forest-green/[0.04] p-3 font-sans text-xs text-forest-green outline-none"
              />
              <p className="mt-4 font-sans text-[10px] text-forest-green/50">
                Selecione um nó para editar.
              </p>
            </>
          ) : (
            <NodeEditor node={selected} onChange={(patch) => updateSelectedNode(selected.id, patch)} />
          )}
        </aside>
      </div>
    </div>
  );
}

function NodeEditor({ node, onChange }: { node: Node; onChange: (p: Record<string, unknown>) => void }) {
  const kind = (node.data?.kind as string) ?? "trigger";
  const label = (node.data?.label as string) ?? "";

  return (
    <div className="space-y-3">
      <p className="font-display text-[10px] font-bold uppercase tracking-widest text-forest-green/60">
        {kind === "trigger" ? "Gatilho" : kind}
      </p>
      <input
        value={label}
        onChange={(e) => onChange({ label: e.target.value })}
        className="w-full rounded-full bg-forest-green/[0.04] px-4 py-2 font-sans text-xs text-forest-green outline-none"
      />
      {kind === "send_message" ? (
        <textarea
          value={String(node.data?.text ?? "")}
          onChange={(e) => onChange({ text: e.target.value })}
          rows={5}
          placeholder="Texto da mensagem. Use {nome} para o primeiro nome do membro."
          className="w-full rounded-lg bg-forest-green/[0.04] p-3 font-sans text-xs text-forest-green outline-none"
        />
      ) : null}
      {kind === "wait" ? (
        <input
          type="number"
          min={1}
          value={Number(node.data?.seconds ?? 60)}
          onChange={(e) => onChange({ seconds: Number(e.target.value) })}
          className="w-full rounded-full bg-forest-green/[0.04] px-4 py-2 font-sans text-xs text-forest-green outline-none"
        />
      ) : null}
      {kind === "tag_member" ? (
        <input
          value={String(node.data?.tag ?? "")}
          onChange={(e) => onChange({ tag: e.target.value })}
          placeholder="nome-da-tag"
          className="w-full rounded-full bg-forest-green/[0.04] px-4 py-2 font-sans text-xs text-forest-green outline-none"
        />
      ) : null}
      {kind === "transfer_human" ? (
        <input
          value={String(node.data?.reason ?? "")}
          onChange={(e) => onChange({ reason: e.target.value })}
          placeholder="Motivo da transferência"
          className="w-full rounded-full bg-forest-green/[0.04] px-4 py-2 font-sans text-xs text-forest-green outline-none"
        />
      ) : null}
      {kind === "condition" ? (
        <input
          value={String(node.data?.expression ?? "")}
          onChange={(e) => onChange({ expression: e.target.value })}
          placeholder="member.neighborhood === 'Centro'"
          className="w-full rounded-full bg-forest-green/[0.04] px-4 py-2 font-sans text-xs text-forest-green outline-none"
        />
      ) : null}
    </div>
  );
}
