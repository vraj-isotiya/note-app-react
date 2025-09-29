import React, { useEffect, useState, useCallback, useMemo } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { v4 as uuidv4 } from "uuid";

const STORAGE_KEY = "notes_app";

const saveToStorage = (notes) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  } catch (e) {
    console.error("Failed to save notes", e);
  }
};

const loadFromStorage = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error("Failed to load notes", e);
    return [];
  }
};

// Minimal debounce
function debounce(fn, wait = 300) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

// Simple strip HTML for searching
const stripHtml = (html = "") => html.replace(/<[^>]*>?/gm, "").toLowerCase();

// Editor style presets
const EDITOR_PRESETS = {
  style: { minHeight: "300px" },
  toolbar: [
    [{ header: [1, 2, false] }],
    ["bold", "italic", "underline", "strike", "blockquote"],
    [
      { list: "ordered" },
      { list: "bullet" },
      { indent: "-1" },
      { indent: "+1" },
    ],
    ["link", "image"],
  ],
};

export default function App() {
  const [notes, setNotes] = useState(() => loadFromStorage());
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  useEffect(() => {
    saveToStorage(notes);
  }, [notes]);

  // Memoized search results
  const filteredNotes = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [...notes].sort((a, b) => b.updatedAt - a.updatedAt);
    return notes
      .filter(
        (n) =>
          n.title.toLowerCase().includes(q) || stripHtml(n.body).includes(q)
      )
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }, [notes, query]);

  const resetForm = () => {
    setEditingId(null);
    setTitle("");
    setBody("");
  };

  const handleAdd = useCallback(() => {
    if (!title.trim() && !stripHtml(body).trim()) {
      return;
    }
    const newNote = {
      id: uuidv4(),
      title: title.trim() || "Untitled",
      body,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setNotes((prev) => [newNote, ...prev]);
    resetForm();
  }, [title, body]);

  const handleSaveEdit = useCallback(() => {
    if (!editingId) return;
    setNotes((prev) =>
      prev.map((n) =>
        n.id === editingId
          ? {
              ...n,
              title: title.trim() || "Untitled",
              body,
              updatedAt: Date.now(),
            }
          : n
      )
    );
    resetForm();
  }, [editingId, title, body]);

  const handleDelete = useCallback(
    (id) => {
      if (!confirm("Delete this note?")) return;
      setNotes((prev) => prev.filter((n) => n.id !== id));
      if (editingId === id) resetForm();
    },
    [editingId]
  );

  const handleEdit = useCallback(
    (id) => {
      const n = notes.find((x) => x.id === id);
      if (!n) return;
      setEditingId(id);
      setTitle(n.title);
      setBody(n.body);
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [notes]
  );

  // Debounced search setter
  const debouncedSetQuery = useMemo(
    () => debounce((v) => setQuery(v), 250),
    []
  );

  const onSearchChange = (e) => debouncedSetQuery(e.target.value);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold mb-1">Notes Rich Text</h1>
        </header>

        {/* Editor card */}
        <section className="bg-white rounded-2xl shadow p-4 mb-6">
          <div className="flex items-center justify-between gap-4 mb-3">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Note title..."
              className="flex-1 border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </div>

          <div className="mb-3">
            <ReactQuill
              value={body}
              onChange={setBody}
              modules={{ toolbar: EDITOR_PRESETS.toolbar }}
              style={EDITOR_PRESETS.style}
            />
          </div>

          <div className="flex gap-2 justify-end">
            <button
              onClick={resetForm}
              className="px-4 py-2 rounded-md bg-gray-100 hover:bg-gray-200"
            >
              Clear
            </button>

            {editingId ? (
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700"
              >
                Save Changes
              </button>
            ) : (
              <button
                onClick={handleAdd}
                className="px-4 py-2 rounded-md bg-green-600 text-white hover:bg-green-700"
              >
                Add Note
              </button>
            )}
          </div>
        </section>

        {/* Search & list */}
        <section className="bg-white rounded-2xl shadow p-4">
          <div className="flex items-center gap-3 mb-4">
            <input
              onChange={onSearchChange}
              placeholder="Search by title or content..."
              className="flex-1 border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </div>

          {filteredNotes.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No notes found.
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {filteredNotes.map((n) => (
                <article
                  key={n.id}
                  className="border rounded-lg p-4 bg-gray-50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-medium text-lg">{n.title}</h3>
                      <div className="text-xs text-gray-500">
                        Updated: {new Date(n.updatedAt).toLocaleString("en-IN")}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(n.id)}
                        className="px-2 py-1 rounded bg-indigo-100 text-indigo-700 text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(n.id)}
                        className="px-2 py-1 rounded bg-red-100 text-red-700 text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  <div
                    className="mt-3 prose max-w-none"
                    dangerouslySetInnerHTML={{ __html: n.body }}
                  />
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
