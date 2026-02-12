import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { PlanItem } from "./types";

type SortableRowProps = {
  item: PlanItem;
  onProject: () => void;
  onRemove: () => void;
};

export function SortableRow(props: SortableRowProps) {
  const { item, onProject, onRemove } = props;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    border: "1px solid #ddd",
    borderRadius: 10,
    padding: 10,
    background: isDragging ? "#f0f0f0" : "white",
    display: "flex",
    alignItems: "center",
    gap: 10,
  };

  const badge = (() => {
    if (item.kind === "SONG_BLOCK") return { label: "Chant", color: "#eef2ff", border: "#cbd5ff", text: "#303e82" };
    if (item.kind === "BIBLE_VERSE") return { label: "Verset", color: "#e6fffa", border: "#9ae6b4", text: "#13624d" };
    if (item.kind === "BIBLE_PASSAGE") return { label: "Passage", color: "#e0f4ff", border: "#a7dcff", text: "#0f4c75" };
    if (item.kind === "ANNOUNCEMENT_TEXT") return { label: "Annonce", color: "#f4f4f5", border: "#d4d4d8", text: "#3f3f46" };
    return null;
  })();

  const titleAttr =
    item.kind === "SONG_BLOCK" && item.refId
      ? `Chant source: ${item.title || ""} (id: ${item.refId}${item.refSubId ? " / bloc " + item.refSubId : ""})`
      : item.kind;

  return (
    <div ref={setNodeRef} style={style} title={titleAttr}>
      <div
        {...attributes}
        {...listeners}
        title="Drag"
        style={{
          cursor: "grab",
          userSelect: "none",
          fontWeight: 800,
          padding: "6px 10px",
          border: "1px solid #ddd",
          borderRadius: 8,
          background: "#fafafa",
        }}
      >
        #
      </div>

      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 800 }}>
          #{item.order} - {item.title || item.kind}{" "}
          {badge ? (
            <span
              style={{
                fontSize: 11,
                fontWeight: 800,
                padding: "2px 6px",
                borderRadius: 999,
                background: badge.color,
                border: "1px solid " + badge.border,
                color: badge.text,
                marginLeft: 6,
              }}
            >
              {badge.label}
            </span>
          ) : null}
        </div>
        <div style={{ opacity: 0.75, fontSize: 13 }}>
          {item.kind}
          {item.content ? ` * ${item.content.slice(0, 80)}${item.content.length > 80 ? "..." : ""}` : ""}
        </div>
      </div>

      <button onClick={onProject} style={{ padding: "8px 10px" }}>
        Projeter
      </button>
      <button onClick={onRemove} style={{ padding: "8px 10px" }}>
        Suppr
      </button>
    </div>
  );
}
