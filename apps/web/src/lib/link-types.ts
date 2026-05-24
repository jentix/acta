export const linkTypeDescriptions: Record<string, { outgoing: string; incoming: string }> = {
  related: {
    outgoing: "Loose semantic connection — context shared, no dependency.",
    incoming: "Other documents that mark this one as related context.",
  },
  supersedes: {
    outgoing: "This document replaces the linked documents.",
    incoming: "Documents that replace this one (this one is superseded).",
  },
  replacedBy: {
    outgoing: "The linked documents replace this one.",
    incoming: "Documents that this one replaces.",
  },
  decidedBy: {
    outgoing: "Decisions (ADRs) that drive this document.",
    incoming: "Documents driven by the decision recorded here.",
  },
  dependsOn: {
    outgoing: "Documents this one depends on.",
    incoming: "Documents that depend on this one.",
  },
  validates: {
    outgoing: "Documents this one validates (e.g. tests/specs verify decisions).",
    incoming: "Documents that validate this one.",
  },
  references: {
    outgoing: "External URLs cited from this document.",
    incoming: "External references pointing here.",
  },
};
