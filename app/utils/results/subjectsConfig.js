export const subjectsConfig = {
  primary: [
    "English Reading",
    "English Writing",
    "Urdu Reading",
    "Urdu Writing",
    "General Knowledge",
    "Science",
    "Drawing",
    "Islamiat",
    "Math"
  ],
  middle: [
    "English",
    "Urdu",
    "Math",
    "Science",
    "Islamiat",
    "Geography",
    "Drawing"
  ],
  secondary: [
    "English",
    "Urdu",
    "Math",
    "Physics",
    "Chemistry",
    "Biology/Computer",
    "Islamiat",
    "Pak Studies",
    "Quran"
  ]
};

const subjectsByClass = {
  1: ["English", "Urdu", "Mathematics", "Tajveedi Qaida", "General Knowledge", "Islamiat / Ethics"],
  2: ["English", "Urdu", "Mathematics", "Nazra Quran Majeed", "General Knowledge", "Islamiat / Ethics"],
  3: ["English", "Urdu", "Mathematics", "Nazra Quran Majeed", "General Knowledge", "Islamiat / Ethics"],
  4: ["English", "Urdu", "Mathematics", "Nazra Quran Majeed", "Science", "Social Studies", "Islamiat / Ethics"],
  5: ["English", "Urdu", "Mathematics", "Nazra Quran Majeed", "Science", "Social Studies", "Islamiat / Ethics"],
  6: ["English", "Urdu", "Mathematics", "Science", "Tarjuma Tul Quran Majeed", "History and Geography", "Islamiat / Ethics", "Optional Subject 1", "Optional Subject 2"],
  7: ["English", "Urdu", "Mathematics", "Science", "Tarjuma Tul Quran Majeed", "History and Geography", "Islamiat / Ethics", "Optional Subject 1", "Optional Subject 2"],
  8: ["English", "Urdu", "Mathematics", "Science", "Tarjuma Tul Quran Majeed", "History and Geography", "Islamiat / Ethics", "Optional Subject 1", "Optional Subject 2"]
};

const seniorCompulsorySubjects = [
  "English",
  "Urdu",
  "Math",
  "Islamiat Compulsory",
  "TARJUMA TUL QURAAN MAJEED",
];
const seniorGroupSubjects = {
  biology: ["Physics", "Chemistry", "Biology"],
  computer: ["Physics", "Chemistry", "Computer"],
  tech: ["Physics Tech.", "Chemistry Tech.", "Biology Tech."],
  arts: ["General Sc.", "Islamiat Optional", "Punjabi"]
};

export const getDefaultSubjectTotal = (className, subject) => {
  const classMatch = String(className || '').match(/\d+/);
  const numClass = classMatch ? Number(classMatch[0]) : NaN;

  if (numClass === 9 && subject === 'Islamiat Compulsory') return 50;
  if (numClass === 10 && subject === 'Pak. Study') return 50;
  return 100;
};

export const getResultEntrySubjects = (className, group) => {
  const classMatch = String(className || '').match(/\d+/);
  const numClass = classMatch ? Number(classMatch[0]) : NaN;

  if (numClass !== 9 && numClass !== 10) {
    return getSubjectsByClass(className);
  }

  const normalizedGroup = String(group || '').trim().toLowerCase();
  let groupSubjects = [];

  if (normalizedGroup.includes('computer')) groupSubjects = seniorGroupSubjects.computer;
  else if (normalizedGroup.includes('tech')) groupSubjects = seniorGroupSubjects.tech;
  else if (normalizedGroup.includes('biolog')) groupSubjects = seniorGroupSubjects.biology;
  else if (normalizedGroup.includes('science')) groupSubjects = seniorGroupSubjects.biology;
  else if (normalizedGroup.includes('arts')) groupSubjects = seniorGroupSubjects.arts;

  return [
    ...seniorCompulsorySubjects,
    ...(numClass === 10 ? ["Pak. Study"] : []),
    ...groupSubjects,
  ];
};

export const getSubjectsByClass = (className) => {
  // Handle string class names
  if (!className) return subjectsConfig.primary;
  
  const classMatch = String(className).match(/\d+/);
  const numClass = classMatch ? Number(classMatch[0]) : NaN;
  
  // Check for non-numeric early-years class names
  if (isNaN(numClass)) {
    if (String(className).trim().toLowerCase() === 'ecce') {
      return [];
    }
    if (["Pre-Nursery", "KG"].includes(className)) {
      return subjectsConfig.primary;
    }
    return subjectsConfig.primary;
  }
  
  // Numeric class names
  if (subjectsByClass[numClass]) return subjectsByClass[numClass];
  return subjectsConfig.secondary;
};

export const getResultCardSubjects = (className, group) => {
  const subjects = getResultEntrySubjects(className, group);
  const classMatch = String(className || '').match(/\d+/);
  const numClass = classMatch ? Number(classMatch[0]) : NaN;

  if (numClass !== 9 && numClass !== 10) return subjects;

  return subjects;
};
