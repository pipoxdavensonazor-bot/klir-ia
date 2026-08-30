import { resolveBodyTemplateId } from "@/lib/studio/templates/catalog";
import { TEMPLATES } from "@/lib/studio/templates/bodies";

export function templateHtml(id: string): string {
  const bodyId = resolveBodyTemplateId(id);
  return TEMPLATES[bodyId] ?? TEMPLATES["corporate-klir"];
}
