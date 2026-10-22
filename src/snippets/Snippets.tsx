import { useEffect, useState } from "react";
import { ClipboardList, Plus } from "lucide-react";
import type { Snippet } from "../../core/snippets";
import { failure } from "../lib/format";
import { Editor } from "./Editor";
import { Row } from "./Row";
import "./snippets.css";

export function Snippets() {
  const [list, setList] = useState<Snippet[]>([]);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fail = (e: unknown) => setError(failure(e));

  useEffect(() => {
    window.radar.snippets().then(setList, fail);
  }, []);

  const save = async (next: Snippet[]) => {
    setError(null);
    try {
      await window.radar.setSnippets(next);
      setList(next);
    } catch (e) {
      fail(e);
    }
  };

  return (
    <>
      <button
        className="icon-btn snippets-btn"
        popoverTarget="snippets-pop"
        aria-label="Snippets"
        data-tip="Snippets"
      >
        <ClipboardList size={20} />
      </button>
      <div id="snippets-pop" popover="auto" className="pop snippets-pop">
        <h3>
          <ClipboardList size={18} /> Snippets
          <button
            className="icon-btn"
            aria-label="Add snippet"
            aria-pressed={adding}
            onClick={() => setAdding(!adding)}
          >
            <Plus size={20} />
          </button>
        </h3>
        {adding && (
          <Editor
            onCancel={() => setAdding(false)}
            onSave={(label, value) => {
              save([...list, { id: crypto.randomUUID(), label, value }]);
              setAdding(false);
            }}
          />
        )}
        <ul>
          {list.map((s) => (
            <Row
              key={s.id}
              snippet={s}
              onError={fail}
              onChange={(c) => save(list.map((x) => (x.id === c.id ? c : x)))}
              onDelete={() => save(list.filter((x) => x.id !== s.id))}
            />
          ))}
        </ul>
        {!list.length && !adding && (
          <p className="snip-empty">No snippets yet</p>
        )}
        {error && <p className="opt-error">{error}</p>}
      </div>
    </>
  );
}
