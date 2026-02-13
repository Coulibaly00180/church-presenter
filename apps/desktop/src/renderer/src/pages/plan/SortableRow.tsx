import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { PlanItem } from "./types";

type SortableRowProps = {
  item: PlanItem;
  onProject: () => void;
  onRemove: () => void;
};

function cls(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function SortableRow(props: SortableRowProps) {
  const { item, onProject, onRemove } = props;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const badge = (() => {
    if (item.kind === "SONG_BLOCK") return { label: "Chant", className: "cp-kind-badge--song" };
    if (item.kind === "BIBLE_VERSE") return { label: "Verset", className: "cp-kind-badge--verse" };
    if (item.kind === "BIBLE_PASSAGE") return { label: "Passage", className: "cp-kind-badge--passage" };
    if (item.kind === "ANNOUNCEMENT_TEXT") return { label: "Annonce", className: "cp-kind-badge--announce" };
    return null;
  })();

  const titleAttr =
    item.kind === "SONG_BLOCK" && item.refId
      ? `Chant source: ${item.title || ""} (id: ${item.refId}${item.refSubId ? " / bloc " + item.refSubId : ""})`
      : item.kind;

  return (
    <div ref={setNodeRef} style={style} title={titleAttr} className={cls("cp-sort-row", isDragging && "is-dragging")}>
      <div
        {...attributes}
        {...listeners}
        title="Drag"
        className="cp-sort-handle"
      >
        #
      </div>

      <div className="cp-flex-1">
        <div className="cp-field-label">
          #{item.order} - {item.title || item.kind}{" "}
          {badge ? <span className={cls("cp-kind-badge", badge.className)}>{badge.label}</span> : null}
        </div>
        <div className="cp-date-muted">
          {item.kind}
          {item.content ? ` * ${item.content.slice(0, 80)}${item.content.length > 80 ? "..." : ""}` : ""}
        </div>
      </div>

      <button onClick={onProject} className="cp-btn-slim">
        Projeter
      </button>
      <button onClick={onRemove} className="cp-btn-slim">
        Suppr
      </button>
    </div>
  );
}
