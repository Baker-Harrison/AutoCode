function generatePlanning(prompt) {
  const questions = [
    {
      id: "q_audience",
      text: "Primary target audience?",
      options: [
        { id: "general", label: "General users", implications: "Broad UX, moderation, scale" },
        { id: "pro", label: "Professionals", implications: "Workflow-centric UX, integrations" },
        { id: "niche", label: "Niche community", implications: "Focused features, small scale" }
      ],
      recommendedOption: "general"
    },
    {
      id: "q_scale",
      text: "Expected initial scale?",
      options: [
        { id: "small", label: "<10K users", implications: "Simpler infra, monolith" },
        { id: "medium", label: "10K-100K users", implications: "Moderate infra, caching" },
        { id: "large", label: "100K+ users", implications: "Scalable infra" }
      ],
      recommendedOption: "small"
    },
    {
      id: "q_timeline",
      text: "Preferred launch timeline?",
      options: [
        { id: "fast", label: "MVP ASAP", implications: "Minimal scope" },
        { id: "beta", label: "Polished beta", implications: "More features, QA" },
        { id: "iterative", label: "Iterative rollout", implications: "Incremental planning" }
      ],
      recommendedOption: "fast"
    }
  ];

  const spec = {
    prompt,
    generatedAt: new Date().toISOString(),
    summary: "Auto-generated MVP specification with default assumptions.",
    assumptions: [
      "Focus on MVP scope",
      "Single workspace execution",
      "Local-first persistence"
    ]
  };

  return { questions, spec };
}

module.exports = {
  generatePlanning
};
