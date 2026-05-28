export type McqQuestion = {
  id: string;
  prompt: string;
  options: string[];
  field: keyof McqAnswers;
};

export type McqAnswers = {
  name?: string;
  username?: string;
  describes_you?: string;
  skills?: string;
  remote?: string;
  looking_for?: string;
  experience?: string;
  availability?: string;
  seriousness?: string;
};

export const OWNERR_NETWORK_ONBOARDING_STEPS: McqQuestion[] = [
  {
    id: "describes_you",
    field: "describes_you",
    prompt: "What best describes you?",
    options: [
      "Freelancer",
      "Student",
      "Founder",
      "Job Seeker",
      "Recruiter",
      "Connector",
      "Operator",
      "Other",
    ],
  },
  {
    id: "skills",
    field: "skills",
    prompt: "Primary skills / sector",
    options: [
      "Tech",
      "Design",
      "Marketing",
      "Sales",
      "Operations",
      "Finance",
      "Other",
    ],
  },
  {
    id: "remote",
    field: "remote",
    prompt: "Remote or local?",
    options: ["Full remote", "Hybrid", "On-site", "Flexible"],
  },
  {
    id: "looking_for",
    field: "looking_for",
    prompt: "What are you looking for?",
    options: [
      "Gigs",
      "Full-time",
      "Collaborators",
      "Clients",
      "Community",
      "Opportunities",
    ],
  },
  {
    id: "experience",
    field: "experience",
    prompt: "Experience level",
    options: ["Early", "Mid", "Senior", "Lead", "Exploring"],
  },
  {
    id: "availability",
    field: "availability",
    prompt: "Availability",
    options: ["Immediate", "This month", "Part-time", "Exploring"],
  },
  {
    id: "seriousness",
    field: "seriousness",
    prompt: "How serious are you?",
    options: [
      "Exploring",
      "Ready this month",
      "All-in now",
      "Building long-term",
    ],
  },
];
