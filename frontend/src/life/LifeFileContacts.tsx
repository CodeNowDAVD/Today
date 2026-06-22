import { useCallback, useEffect, useState } from "react";
import {
  isSessionExpired,
  LifeContact,
  listLifeContacts,
  listLifeFileContacts,
  setLifeFileContacts,
} from "../api";

type Props = {
  fileId: number;
  onSessionLost: () => void;
  onError: (msg: string) => void;
};

export default function LifeFileContacts({ fileId, onSessionLost, onError }: Props) {
  const [allContacts, setAllContacts] = useState<LifeContact[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [contacts, linked] = await Promise.all([listLifeContacts(), listLifeFileContacts(fileId)]);
      setAllContacts(contacts);
      setSelectedIds(linked.map((c) => c.id));
      setDirty(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error";
      if (isSessionExpired(msg)) onSessionLost();
      else onError(msg);
    } finally {
      setLoading(false);
    }
  }, [fileId, onError, onSessionLost]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSave() {
    setSaving(true);
    try {
      await setLifeFileContacts(fileId, selectedIds);
      setDirty(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error";
      if (isSessionExpired(msg)) onSessionLost();
      else onError(msg);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="life-file-contacts__status muted">Personas…</p>;
  }

  if (allContacts.length === 0) {
    return (
      <p className="life-file-contacts__status muted">
        Crea contactos en Vida → Personas para vincularlos a archivos.
      </p>
    );
  }

  return (
    <div className="life-file-contacts">
      <div className="life-file-contacts__head">
        <span className="life-file-contacts__title">Personas vinculadas</span>
        {dirty && (
          <button type="button" className="btn primary sm" disabled={saving} onClick={() => void handleSave()}>
            {saving ? "Guardando…" : "Guardar"}
          </button>
        )}
      </div>
      <div className="life-contact-picks">
        {allContacts.map((c) => (
          <label key={c.id}>
            <input
              type="checkbox"
              checked={selectedIds.includes(c.id)}
              onChange={(e) => {
                setDirty(true);
                setSelectedIds((prev) =>
                  e.target.checked ? [...prev, c.id] : prev.filter((id) => id !== c.id),
                );
              }}
            />
            <span>
              {c.name}
              {c.roleLabel ? ` · ${c.roleLabel}` : ""}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}
