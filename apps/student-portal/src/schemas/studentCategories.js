export const STUDENT_CATEGORY_FIELDS = {
  STUDENT_HACKATHON: [
    { key: 'position_or_rank', label: 'Position / Outcome', type: 'text', placeholder: 'Winner / Runner-Up / Finalist' },
    { key: 'team_size', label: 'Team Size', type: 'number', placeholder: 'e.g. 4' }
  ],
  STUDENT_INTERNSHIP: [
    { key: 'role_title', label: 'Internship Role', type: 'text', placeholder: 'e.g. Software Engineer Intern' },
    { key: 'duration_weeks', label: 'Duration (Weeks)', type: 'number', placeholder: 'e.g. 12' },
    { key: 'stipend_band', label: 'Stipend (Optional)', type: 'text', placeholder: 'e.g. 40,000 / month' },
    { key: 'ppo_received', label: 'PPO Received? (true / false)', type: 'text', placeholder: 'true or false' }
  ],
  STUDENT_PLACEMENT: [
    { key: 'role_title', label: 'Offered Role', type: 'text', placeholder: 'e.g. Software Development Engineer' },
    { key: 'offer_type', label: 'Offer Tier', type: 'text', placeholder: 'Super-Dream / Dream / Core / PPO' },
    { key: 'ctc_band', label: 'CTC Package Band', type: 'text', placeholder: 'e.g. 18 LPA' }
  ],
  STUDENT_SPORTS: [
    { key: 'sport_name', label: 'Sport / Event', type: 'text', placeholder: 'e.g. Badminton / Athletics' },
    { key: 'position_or_rank', label: 'Medal / Rank', type: 'text', placeholder: 'Gold / Silver / 1st Place' }
  ],
  STUDENT_TECH_COMPETITION: [
    { key: 'domain', label: 'Competition Domain', type: 'text', placeholder: 'ICPC / Robotics / Kaggle / CTF' },
    { key: 'position_or_rank', label: 'Position / Rank', type: 'text', placeholder: 'Winner / Top 5%' }
  ],
  STUDENT_CERTIFICATION: [
    { key: 'credential_id', label: 'Credential ID', type: 'text', placeholder: 'Certificate ID or URL ref' },
    { key: 'score_or_grade', label: 'Score / Grade', type: 'text', placeholder: 'e.g. 95%' }
  ],
  STUDENT_RESEARCH_PROJECT: [
    { key: 'outcome_type', label: 'Outcome (Paper / Prototype / Patent)', type: 'text', placeholder: 'Published Paper' },
    { key: 'mentor_name', label: 'Faculty Mentor (Display Only)', type: 'text', placeholder: 'Mentor name (non-scoring metadata)' }
  ],
  STUDENT_INNOVATION_AWARD: [
    { key: 'innovation_title', label: 'Innovation / Prototype Name', type: 'text', placeholder: 'Prototype name' },
    { key: 'position_or_rank', label: 'Award Tier', type: 'text', placeholder: '1st Prize / Best Innovation' }
  ]
};

export function validateStudentSubmission(values) {
  if (!values.title || values.title.trim().length < 3) {
    return 'Achievement title must be at least 3 characters.';
  }
  if (!values.description || values.description.trim().length < 10) {
    return 'Description must be at least 10 characters.';
  }
  if (!values.category_id) {
    return 'Please select a student achievement category.';
  }
  if (!values.achieved_on) {
    return 'Please select the achievement or offer date.';
  }
  if (!values.organization || values.organization.trim().length < 2) {
    return 'Please enter the company, organizer, or awarding body.';
  }
  if (!/^\d{4}-\d{2}$/.test(values.academic_year || '')) {
    return 'Academic year must use format YYYY-YY (e.g. 2025-26).';
  }
  return null;
}
