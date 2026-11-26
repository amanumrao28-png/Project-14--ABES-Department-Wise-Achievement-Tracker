export const DEPT_CATEGORY_FIELDS = {
  DEPT_AWARD: [
    { key: 'award_title', label: 'Award Citation / Title', type: 'text', placeholder: 'e.g. Best Emerging CSE Department' },
    { key: 'citation_number', label: 'Reference / Citation No', type: 'text', placeholder: 'Optional reference ID' }
  ],
  DEPT_ACCREDITATION: [
    { key: 'accreditation_body', label: 'Accreditation Body', type: 'text', placeholder: 'NBA / NAAC / ABET' },
    { key: 'grade_or_status', label: 'Grade / Accreditation Status', type: 'text', placeholder: 'e.g. Accredited / A+' },
    { key: 'validity_years', label: 'Validity Duration (Years)', type: 'number', placeholder: 'e.g. 6' }
  ],
  DEPT_RANKING: [
    { key: 'ranking_agency', label: 'Ranking Agency', type: 'text', placeholder: 'NIRF / QS / Times' },
    { key: 'rank_or_band', label: 'Rank / Rank Band', type: 'text', placeholder: 'e.g. Band 101-150' }
  ],
  INSTITUTIONAL_RECOGNITION: [
    { key: 'recognition_type', label: 'Recognition Type', type: 'text', placeholder: 'e.g. Center of Excellence' },
    { key: 'reference_code', label: 'Approval / Order Ref', type: 'text', placeholder: 'Letter / Order number' }
  ],
  INDUSTRY_COLLABORATION: [
    { key: 'collaboration_type', label: 'Collaboration Type', type: 'text', placeholder: 'MoU / Sponsored Lab / CoE' },
    { key: 'outcomes', label: 'Key Outcomes', type: 'text', placeholder: 'e.g. Joint curriculum & lab setup' }
  ],
  DEPT_RESEARCH_PROJECT: [
    { key: 'funding_agency', label: 'Funding Agency', type: 'text', placeholder: 'DST-FIST / AICTE-MODROBS' },
    { key: 'sanctioned_amount_lakhs', label: 'Sanctioned Grant (INR Lakhs)', type: 'number', placeholder: 'e.g. 25' }
  ],
  DEPT_ORGANIZED_EVENT: [
    { key: 'event_type', label: 'Event Format', type: 'text', placeholder: 'International Conference / FDP / Workshop' },
    { key: 'participant_count', label: 'Total Participants', type: 'number', placeholder: 'e.g. 150' }
  ]
};

export function validateDeptSubmission(values) {
  if (!values.title || values.title.trim().length < 3) {
    return 'Achievement title must be at least 3 characters.';
  }
  if (!values.description || values.description.trim().length < 10) {
    return 'Description must be at least 10 characters.';
  }
  if (!values.category_id) {
    return 'Please select a department achievement category.';
  }
  if (!values.achieved_on) {
    return 'Please select the achievement date.';
  }
  if (!values.organization || values.organization.trim().length < 2) {
    return 'Please enter the awarding or partner organization.';
  }
  if (!/^\d{4}-\d{2}$/.test(values.academic_year || '')) {
    return 'Academic year must follow YYYY-YY format (e.g. 2025-26).';
  }
  return null;
}
