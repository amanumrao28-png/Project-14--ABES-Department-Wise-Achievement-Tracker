import { v4 as uuidv4 } from 'uuid';

const LEVELS = ['international', 'national', 'state', 'university', 'institutional'];

const DEPT_CATEGORIES = [
  {
    code: 'DEPT_AWARD',
    name: 'Department Awards',
    description: 'Institutional or external honors awarded to the department unit.',
    weights: { international: 100, national: 80, state: 60, university: 45, institutional: 30 }
  },
  {
    code: 'DEPT_ACCREDITATION',
    name: 'Department Accreditations',
    description: 'Program accreditations such as NBA, NAAC, or ABET.',
    weights: { international: 150, national: 120, state: 90, university: 70, institutional: 50 }
  },
  {
    code: 'DEPT_RANKING',
    name: 'Department Rankings',
    description: 'National or global ranking outcomes (NIRF, QS, Times, etc.).',
    weights: { international: 140, national: 110, state: 75, university: 55, institutional: 40 }
  },
  {
    code: 'INSTITUTIONAL_RECOGNITION',
    name: 'Institutional Recognitions',
    description: 'Centers of excellence, statutory recognitions, and citations.',
    weights: { international: 110, national: 85, state: 65, university: 50, institutional: 35 }
  },
  {
    code: 'INDUSTRY_COLLABORATION',
    name: 'Industry Collaborations',
    description: 'Formal MoUs, sponsored laboratories, and industry partnerships.',
    weights: { international: 95, national: 75, state: 55, university: 45, institutional: 35 }
  },
  {
    code: 'DEPT_RESEARCH_PROJECT',
    name: 'Department-Level Research Projects',
    description: 'Department-wide funded research infrastructure grants (DST-FIST, AICTE-MODROBS, etc.).',
    weights: { international: 130, national: 100, state: 75, university: 55, institutional: 40 }
  },
  {
    code: 'DEPT_ORGANIZED_EVENT',
    name: 'Department-Organized Events',
    description: 'Conferences, FDPs, workshops, and symposia hosted by the department.',
    weights: { international: 80, national: 60, state: 45, university: 35, institutional: 25 }
  }
];

const FACULTY_CATEGORIES = [
  {
    code: 'FACULTY_PUBLICATION',
    name: 'Research Publications',
    description: 'Peer-reviewed journal articles (SCI, SCIE, Scopus, UGC-CARE).',
    weights: { international: 50, national: 35, state: 25, university: 20, institutional: 15 }
  },
  {
    code: 'FACULTY_PATENT',
    name: 'Patents',
    description: 'Filed, published, or granted patents and utility models.',
    weights: { international: 70, national: 55, state: 40, university: 30, institutional: 20 }
  },
  {
    code: 'FACULTY_BOOK_CHAPTER',
    name: 'Books & Chapters',
    description: 'Authored/edited technical books and peer-reviewed book chapters.',
    weights: { international: 45, national: 30, state: 22, university: 18, institutional: 12 }
  },
  {
    code: 'FACULTY_AWARD',
    name: 'Faculty Awards',
    description: 'Individual teaching, research, or best-paper awards.',
    weights: { international: 60, national: 45, state: 32, university: 24, institutional: 15 }
  },
  {
    code: 'FACULTY_FDP',
    name: 'FDP Participation',
    description: 'Completed Faculty Development Programs and ATAL/NITTTR training.',
    weights: { international: 25, national: 20, state: 15, university: 12, institutional: 10 }
  },
  {
    code: 'FACULTY_CERTIFICATION',
    name: 'Certifications',
    description: 'Professional, NPTEL, cloud, or domain certifications.',
    weights: { international: 30, national: 22, state: 16, university: 12, institutional: 10 }
  },
  {
    code: 'FACULTY_GUEST_LECTURE',
    name: 'Guest Lectures',
    description: 'Invited expert talks, keynote addresses, and resource person sessions.',
    weights: { international: 40, national: 28, state: 20, university: 15, institutional: 10 }
  },
  {
    code: 'FACULTY_CONFERENCE',
    name: 'Conference Participation',
    description: 'Paper presentations, session chairs, and IEEE/ACM conference tracks.',
    weights: { international: 38, national: 26, state: 18, university: 14, institutional: 10 }
  },
  {
    code: 'FACULTY_RESEARCH_GRANT',
    name: 'Research Grants',
    description: 'Principal Investigator / Co-PI sponsored research grants.',
    weights: { international: 80, national: 65, state: 45, university: 32, institutional: 20 }
  }
];

const STUDENT_CATEGORIES = [
  {
    code: 'STUDENT_HACKATHON',
    name: 'Hackathons',
    description: 'Smart India Hackathon, global/national coding & product hackathons.',
    weights: { international: 60, national: 45, state: 32, university: 22, institutional: 15 }
  },
  {
    code: 'STUDENT_INTERNSHIP',
    name: 'Internships',
    description: 'Verified industry or research internships.',
    weights: { international: 50, national: 38, state: 28, university: 20, institutional: 15 }
  },
  {
    code: 'STUDENT_PLACEMENT',
    name: 'Placements',
    description: 'Full-time job offers, dream/super-dream placements, and PPOs.',
    weights: { international: 65, national: 50, state: 35, university: 25, institutional: 18 }
  },
  {
    code: 'STUDENT_SPORTS',
    name: 'Sports Achievements',
    description: 'Inter-university, state, national, and international sports medals.',
    weights: { international: 55, national: 42, state: 30, university: 20, institutional: 12 }
  },
  {
    code: 'STUDENT_TECH_COMPETITION',
    name: 'Technical Competitions',
    description: 'Robotics, ICPC, Kaggle, IEEE coding, and engineering design contests.',
    weights: { international: 55, national: 40, state: 28, university: 20, institutional: 14 }
  },
  {
    code: 'STUDENT_CERTIFICATION',
    name: 'Certifications',
    description: 'Industry cloud, security, NPTEL, and technical certifications.',
    weights: { international: 30, national: 22, state: 16, university: 12, institutional: 10 }
  },
  {
    code: 'STUDENT_RESEARCH_PROJECT',
    name: 'Research Projects',
    description: 'Student research papers, funded prototypes, and patents.',
    weights: { international: 52, national: 38, state: 26, university: 18, institutional: 12 }
  },
  {
    code: 'STUDENT_INNOVATION_AWARD',
    name: 'Innovation Awards',
    description: 'Startup challenges, IIC innovation prizes, and patent/product awards.',
    weights: { international: 58, national: 44, state: 30, university: 22, institutional: 15 }
  }
];

async function seedTrackerCategoriesAndRules(knex, categoryTable, ruleTable, entries) {
  for (const item of entries) {
    await knex(categoryTable)
      .insert({
        id: uuidv4(),
        code: item.code,
        name: item.name,
        description: item.description,
        is_active: true
      })
      .onConflict('code')
      .ignore();

    const categoryRow = await knex(categoryTable).where({ code: item.code }).first();
    if (!categoryRow) continue;

    for (const level of LEVELS) {
      const existingRule = await knex(ruleTable)
        .where({
          category_id: categoryRow.id,
          academic_year: '*',
          achievement_level: level,
          is_active: true
        })
        .first();

      if (!existingRule) {
        await knex(ruleTable).insert({
          id: uuidv4(),
          category_id: categoryRow.id,
          academic_year: '*',
          achievement_level: level,
          base_points: item.weights[level],
          rule_version: 1,
          is_active: true
        });
      }
    }
  }
}

export async function seed(knex) {
  await seedTrackerCategoriesAndRules(
    knex,
    'dept_categories',
    'dept_scoring_rules',
    DEPT_CATEGORIES
  );
  await seedTrackerCategoriesAndRules(
    knex,
    'faculty_categories',
    'faculty_scoring_rules',
    FACULTY_CATEGORIES
  );
  await seedTrackerCategoriesAndRules(
    knex,
    'student_categories',
    'student_scoring_rules',
    STUDENT_CATEGORIES
  );
}
