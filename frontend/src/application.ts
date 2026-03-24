export type UploadedFile = { name: string; size?: number; type?: string };

export type EducationItem = {
  id: string;
  institution: string;
  degree: string;
  startYear: string;
  endYear: string;
  gpa: string;
};

export type ExperienceItem = {
  id: string;
  jobTitle: string;
  organization: string;
  startDate: string;
  endDate: string;
  responsibilities: string;
};

export type AwardItem = {
  id: string;
  name: string;
  year: string;
  description: string;
};

export type CommunityItem = {
  id: string;
  organization: string;
  role: string;
  startDate: string;
  endDate: string;
  description: string;
};

export type ApplicationData = {
  personalInfo: {
    fullName: string;
    email: string;
    dateOfBirth: string;
    country: string;
    program: string;
    university: string;
    gpa: string;
    graduationYear: string;
    ieltsScore: string;
  };
  personalStatement: {
    valuesGoals: string;
    whyMajor: string;
    interests: string;
    summary: string;
    uploadedFile: File[];
  };
  resume: {
    uploadedFile: File[];
    education: EducationItem[];
    experience: ExperienceItem[];
    skills: string[];
    awards: AwardItem[];
    community: CommunityItem[];
  };
  portfolio: {
    links: string[];
    files: File[];
  };
  documents: {
    transcript: File[];
    ielts: File[];
    cvOptional: File[];
    statementOptional: File[];
    additional: File[];
  };
};
