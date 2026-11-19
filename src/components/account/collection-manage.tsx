"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LogOut, MessageSquareText, Pencil, Trash2, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api, apiError } from "@/lib/api-client";
import { initials } from "@/lib/format";

export function CollectionSettings({ id, name, description, isOwner, myMemberId }: { id: string; name: string; description: string | null; isOwner: boolean; myMemberId: string | null }) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [draft, setDraft] = useState({ name, description: description ?? "" });
  const [pending, setPending] = useState(false);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setPending(true);
    const r = await api(`/api/collections/${id}`, { method: "PATCH", json: { name: draft.name, description: draft.description || null } });
    setPending(false);
    if (!r.ok) return toast.error(apiError(r));
    setEditOpen(false);
    router.refresh();
  };
  const remove = async () => {
    setPending(true);
    const r = isOwner ? await api(`/api/collections/${id}`, { method: "DELETE" }) : await api(`/api/collections/${id}/members/${myMemberId}`, { method: "DELETE" });
    setPending(false);
    if (!r.ok) return toast.error(apiError(r));
    toast.success(isOwner ? "Collection deleted" : "You left the collection");
    router.push("/account/collections");
    router.refresh();
  };

  return (
    <>
      {isOwner && (
        <Dialog open={editOpen} onOpenChange={(v) => { setEditOpen(v); if (v) setDraft({ name, description: description ?? "" }); }}>
          <DialogTrigger asChild>
            <Button variant="outline" size="lg" className="rounded-full"><Pencil className="size-4" aria-hidden /> Edit</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <form onSubmit={save} className="grid gap-4">
              <DialogHeader><DialogTitle>Edit collection</DialogTitle></DialogHeader>
              <div className="space-y-1.5">
                <Label htmlFor="ec-name">Name</Label>
                <Input id="ec-name" required maxLength={80} value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ec-desc">Description</Label>
                <Textarea id="ec-desc" rows={2} maxLength={300} value={draft.description} onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))} />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={pending || !draft.name.trim()}>{pending && <Loader2 className="size-4 animate-spin" aria-hidden />} Save</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="lg" className="rounded-full text-muted-foreground">
            {isOwner ? <Trash2 className="size-4" aria-hidden /> : <LogOut className="size-4" aria-hidden />} {isOwner ? "Delete" : "Leave"}
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{isOwner ? "Delete this collection?" : "Leave this collection?"}</DialogTitle>
            <DialogDescription>
              {isOwner ? "Shopping partners lose access and shared notes are removed. Your saved homes stay saved." : "You'll need a new invitation to rejoin."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={remove} disabled={pending}>{pending && <Loader2 className="size-4 animate-spin" aria-hidden />} {isOwner ? "Delete collection" : "Leave"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export interface MemberRow {
  id: string;
  label: string;
  sublabel: string | null;
  role: "EDITOR" | "VIEWER";
  isAgent: boolean;
  accepted: boolean;
}

export function CollectionMembers({ collectionId, isOwner, ownerName, members }: { collectionId: string; isOwner: boolean; ownerName: string; members: MemberRow[] }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"EDITOR" | "VIEWER">("EDITOR");
  const [isAgent, setIsAgent] = useState(false);
  const [pending, setPending] = useState<string | null>(null);

  const invite = async (event: React.FormEvent) => {
    event.preventDefault();
    setPending("invite");
    const r = await api<{ resent: boolean }>(`/api/collections/${collectionId}/members`, { method: "POST", json: { email, role, isAgent } });
    setPending(null);
    if (!r.ok) return toast.error(apiError(r));
    toast.success(r.data.resent ? "Invitation sent again" : "Invitation sent", { description: `We emailed ${email} a link to join.` });
    setEmail("");
    setIsAgent(false);
    router.refresh();
  };
  const remove = async (m: MemberRow) => {
    setPending(m.id);
    const r = await api(`/api/collections/${collectionId}/members/${m.id}`, { method: "DELETE" });
    setPending(null);
    if (!r.ok) return toast.error(apiError(r));
    toast.success(m.accepted ? `Removed ${m.label}` : "Invitation revoked");
    router.refresh();
  };

  return (
    <section aria-labelledby="members-title" className="rounded-3xl border bg-surface p-5">
      <h2 id="members-title" className="font-display text-base font-semibold">Shopping partners</h2>
      <ul className="mt-3 space-y-2.5">
        <li className="flex items-center gap-3">
          <Avatar label={ownerName} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{ownerName}</p>
            <p className="text-xs text-muted-foreground">Owner</p>
          </div>
        </li>
        {members.map((m) => (
          <li key={m.id} className="flex items-center gap-3">
            <Avatar label={m.label} muted={!m.accepted} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{m.label}</p>
              {m.sublabel && m.sublabel !== m.label && <p className="truncate text-xs text-muted-foreground">{m.sublabel}</p>}
              <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                {m.role === "VIEWER" ? "Can view" : "Can edit"}
                {m.isAgent && <Badge variant="secondary">Agent</Badge>}
                {!m.accepted && <Badge variant="outline">Invite pending</Badge>}
              </p>
            </div>
            {isOwner && (
              <Button variant="ghost" size="icon-sm" onClick={() => remove(m)} disabled={pending === m.id} aria-label={m.accepted ? `Remove ${m.label}` : `Revoke invitation for ${m.label}`}>
                {pending === m.id ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <X className="size-3.5" aria-hidden />}
              </Button>
            )}
          </li>
        ))}
      </ul>
      {isOwner && (
        <form onSubmit={invite} className="mt-5 space-y-3 border-t pt-4">
          <Label htmlFor="invite-email" className="text-sm font-semibold">Invite a partner, family member or your agent</Label>
          <Input id="invite-email" type="email" required placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={254} autoComplete="off" />
          <div className="flex flex-wrap items-center gap-3">
            <Select value={role} onValueChange={(v) => setRole(v as "EDITOR" | "VIEWER")}>
              <SelectTrigger className="w-36" aria-label="Access level"><SelectValue>{role === "VIEWER" ? "Can view" : "Can edit"}</SelectValue></SelectTrigger>
              <SelectContent>
                <SelectItem value="EDITOR">Can edit</SelectItem>
                <SelectItem value="VIEWER">Can view</SelectItem>
              </SelectContent>
            </Select>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={isAgent} onCheckedChange={(v) => setIsAgent(v === true)} /> They&apos;re my agent
            </label>
          </div>
          <Button type="submit" className="w-full" disabled={pending === "invite"}>
            {pending === "invite" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <UserPlus className="size-4" aria-hidden />} Send invitation
          </Button>
        </form>
      )}
    </section>
  );
}

function Avatar({ label, muted = false }: { label: string; muted?: boolean }) {
  return (
    <span aria-hidden className={muted ? "grid size-9 shrink-0 place-items-center rounded-full border border-dashed text-xs font-semibold text-muted-foreground" : "grid size-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-600 to-brand-800 text-xs font-semibold text-white"}>
      {initials(label)}
    </span>
  );
}

/** Shared note on a collection item — visible to everyone in the collection. */
export function CollectionItemNote({ collectionId, listingId, note, canEdit, addedBy }: { collectionId: string; listingId: string; note: string | null; canEdit: boolean; addedBy: string | null }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(note ?? "");
  const [pending, setPending] = useState<"save" | "remove" | null>(null);

  const save = async () => {
    setPending("save");
    const r = await api(`/api/collections/${collectionId}/items/${listingId}`, { method: "PATCH", json: { sharedNote: value } });
    setPending(null);
    if (!r.ok) return toast.error(apiError(r));
    setEditing(false);
    router.refresh();
  };
  const remove = async () => {
    setPending("remove");
    const r = await api(`/api/collections/${collectionId}/items/${listingId}`, { method: "DELETE" });
    setPending(null);
    if (!r.ok) return toast.error(apiError(r));
    toast.success("Removed from collection");
    router.refresh();
  };

  return (
    <div className="mt-2 rounded-2xl border bg-muted/40 p-3 text-sm">
      {editing ? (
        <div className="space-y-2">
          <Label htmlFor={`note-${listingId}`} className="sr-only">Shared note</Label>
          <Textarea id={`note-${listingId}`} rows={3} maxLength={2000} value={value} onChange={(e) => setValue(e.target.value)} placeholder="Visible to everyone in this collection" autoFocus />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => { setEditing(false); setValue(note ?? ""); }}>Cancel</Button>
            <Button size="sm" onClick={save} disabled={pending === "save"}>{pending === "save" && <Loader2 className="size-3.5 animate-spin" aria-hidden />} Save note</Button>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-2">
          <MessageSquareText className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
          <div className="min-w-0 flex-1">
            {note ? <p className="whitespace-pre-line">{note}</p> : <p className="text-muted-foreground">No shared note yet.</p>}
            {addedBy && <p className="mt-1 text-xs text-muted-foreground">Added by {addedBy}</p>}
          </div>
        </div>
      )}
      {canEdit && !editing && (
        <div className="mt-2 flex justify-end gap-1">
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)}><Pencil className="size-3.5" aria-hidden /> {note ? "Edit note" : "Add note"}</Button>
          <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={remove} disabled={pending === "remove"}>
            {pending === "remove" ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <Trash2 className="size-3.5" aria-hidden />} Remove
          </Button>
        </div>
      )}
    </div>
  );
}
