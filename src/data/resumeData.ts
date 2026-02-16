export const ABOUT = `Hey I'm Neel 👋🏽, a Senior ML Engineer with 4+ years of experience based out of Austin, TX. Currently at realtor.com building ML pipelines and ranking models. I have a strong background in Math (B.S. UT Austin '22) and Computer Science (M.S. Georgia Tech '24), and I love building cool stuff with data 🤖.

My professional interests include Machine Learning, Data Science, Full Stack Dev, Cloud, and Startups 👨🏽‍💻.

When I'm not writing code, you can find me playing racket sports 🎾, lifting weights 🏋🏽‍♂️, eating food 🍔, traveling ✈️, and grinding games like Super Smash Bros Ultimate 🥊 and Chess ♟️.`;

export const EDUCATION = [
  {
    school: "Georgia Institute of Technology",
    degree: "MS Computer Science — Machine Learning Specialization",
    year: "2024",
    location: "Atlanta, GA (Remote)",
  },
  {
    school: "The University of Texas at Austin",
    degree: "BS Applied Mathematics | Minors in Computer Science and Statistics",
    year: "2022",
    location: "Austin, TX",
  },
];

export const SKILLS: Record<string, string[]> = {
  "Languages and Tools": ["Python", "SQL", "R"],
  "Data Analysis & Visualization": [
    "NumPy",
    "Pandas",
    "Plotly/Dash",
    "Seaborn",
    "Streamlit",
    "Matplotlib",
    "Looker",
  ],
  "Machine Learning": [
    "Scikit-Learn",
    "TensorFlow",
    "Keras",
    "PyTorch",
    "XGBoost",
    "LightGBM",
    "Metaflow",
  ],
  "Data Science & Modeling": [
    "Classification",
    "Regression",
    "Clustering",
    "Deep Learning",
    "Reinforcement Learning",
    "Time Series Analysis",
    "NLP",
    "Bayesian Networks",
    "Dimensionality Reduction",
    "Feature Engineering",
  ],
  Cloud: [
    "AWS (Sagemaker, Bedrock, S3, EC2)",
    "Snowflake",
    "DBT",
    "Docker",
    "Airflow",
    "Supabase",
  ],
};

export const WORK_EXPERIENCE = [
  {
    company: "realtor.com",
    role: "Senior Machine Learning Engineer",
    duration: "August 2025 - Present",
    location: "Austin, TX (Hybrid)",
    description:
      "Metaflow ML pipelines with Argo/Outerbounds CI/CD, XGBoost ranking for home search, AI-assisted coding tooling.",
  },
  {
    company: "Transfix",
    role: "Data Scientist II",
    duration: "July 2023 - August 2025",
    location: "Austin, TX (Remote)",
    description:
      "Pricing algorithms, lane-level forecasting, recommender systems. Reduced win-rate bias 80%, improved engagement 45%.",
  },
  {
    company: "Dell Technologies",
    role: "Data Scientist I",
    duration: "June 2022 - July 2023",
    location: "Austin, TX",
    description:
      "Ensemble model predicting server backup failures (~$1.2M/yr savings). BERT-based case summarization. Prophet demand forecasting.",
  },
  {
    company: "Dell Technologies (Intern)",
    role: "Data Science Intern",
    duration: "June - Aug 2020 | May - Aug 2021",
    location: "Remote",
    description:
      "Demand forecasting for 10+ enterprise products. Ensemble time-series models (Prophet, SARIMA, ETS) for operational accuracy.",
  },
];

export const CONTACT = [
  { label: "Email", value: "neelpanging@live.com", link: "mailto:neelpanging@live.com" },
  {
    label: "LinkedIn",
    value: "linkedin.com/in/neelpanging",
    link: "https://linkedin.com/in/neelpanging",
  },
  { label: "GitHub", value: "github.com/neelpanging", link: "https://github.com/neelpanging" },
];

export const ASCII_BANNER = `
\x1b[cyan]╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   ███╗   ██╗███████╗███████╗██╗                               ║
║   ████╗  ██║██╔════╝██╔════╝██║                               ║
║   ██╔██╗ ██║█████╗  █████╗  ██║                               ║
║   ██║╚██╗██║██╔══╝  ██╔══╝  ██║                               ║
║   ██║ ╚████║███████╗███████╗███████╗                          ║
║   ╚═╝  ╚═══╝╚══════╝╚══════╝╚══════╝                          ║
║                                                               ║
║   Senior ML Engineer · Data Scientist · Builder               ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝\x1b[/cyan]

Type \x1b[cmd:help]help\x1b[/cmd] to see available commands.
`;

export const AVAILABLE_COMMANDS = [
  "help",
  "about",
  "education",
  "skills",
  "experience",
  "contact",
  "resume",
  "clear",
];
