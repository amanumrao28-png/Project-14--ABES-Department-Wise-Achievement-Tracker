export const FACULTY_CATEGORY_FIELDS = {
  FACULTY_PUBLICATION: [
    { key: 'journal_name', label: 'Journal / Publisher Name', type: 'text', placeholder: 'e.g. IEEE Transactions' },
    { key: 'indexing', label: 'Indexing (SCI / SCIE / Scopus / UGC)', type: 'text', placeholder: 'SCI / Scopus' },
    { key: 'doi', label: 'DOI / ISSN', type: 'text', placeholder: '10.1109/...' },
    { key: 'impact_factor', label: 'Impact Factor', type: 'number', placeholder: 'e.g. 4.2' }
  ],
  FACULTY_PATENT: [
    { key: 'application_no', label: 'Patent Application Number', type: 'text', placeholder: 'e.g. 202511048291' },
    { key: 'patent_status', label: 'Patent Stage (Filed / Published / Granted)', type: 'text', placeholder: 'Granted' },
    { key: 'jurisdiction', label: 'Jurisdiction', type: 'text', placeholder: 'India / US / PCT' }
  ],
  FACULTY_BOOK_CHAPTER: [
    { key: 'publisher', label: 'Publisher', type: 'text', placeholder: 'Springer / Elsevier / Wiley' },
    { key: 'isbn', label: 'ISBN', type: 'text', placeholder: '978-...' },
    { key: 'publication_type', label: 'Type (Authored Book / Chapter)', type: 'text', placeholder: 'Book Chapter' }
  ],
  FACULTY_AWARD: [
    { key: 'award_title', label: 'Award Citation', type: 'text', placeholder: 'e.g. Best Researcher Award' }
  ],
  FACULTY_FDP: [
    { key: 'duration_days', label: 'Duration (Days)', type: 'number', placeholder: 'e.g. 5' },
    { key: 'mode', label: 'Mode (Online / Offline / Hybrid)', type: 'text', placeholder: 'Online' }
  ],
  FACULTY_CERTIFICATION: [
    { key: 'credential_id', label: 'Credential / Certificate ID', type: 'text', placeholder: 'Certificate serial number' },
    { key: 'score_or_grade', label: 'Score / Elite Grade', type: 'text', placeholder: 'e.g. 92% / Elite Gold' }
  ],
  FACULTY_GUEST_LECTURE: [
    { key: 'topic', label: 'Session Topic', type: 'text', placeholder: 'Topic delivered' },
    { key: 'audience_type', label: 'Audience', type: 'text', placeholder: 'Faculty / Industry / Students' }
  ],
  FACULTY_CONFERENCE: [
    { key: 'role_type', label: 'Role (Presenter / Keynote / Chair)', type: 'text', placeholder: 'Presenter' },
    { key: 'indexing', label: 'Proceedings Indexing', type: 'text', placeholder: 'IEEE Xplore / Scopus' }
  ],
  FACULTY_RESEARCH_GRANT: [
    { key: 'grant_role', label: 'Role (PI / Co-PI)', type: 'text', placeholder: 'PI' },
    { key: 'sanctioned_amount_lakhs', label: 'Sanctioned Amount (INR Lakhs)', type: 'number', placeholder: 'e.g. 12' }
  ]
};

export function validateFacultySubmission(values) {
  if (!values.title || values.title.trim().length < 3) {
    return 'Achievement title must be at least 3 characters.';
  }
  if (!values.description || values.description.trim().length < 10) {
    return 'Description must be at least 10 characters.';
  }
  if (!values.category_id) {
    return 'Please select a faculty achievement category.';
  }
  if (!values.achieved_on) {
    return 'Please enter the achievement or publication date.';
  }
  if (!values.organization || values.organization.trim().length < 2) {
    return 'Please specify the publisher, awarding body, or host organization.';
  }
  if (!/^\d{4}-\d{2}$/.test(values.academic_year || '')) {
    return 'Academic year must use format YYYY-YY (e.g. 2025-26).';
  }
  return null;
}
