import { ROLES } from '../constants/roles.js';

/**
 * Returns ONLY navigation links the logged-in user is explicitly authorized to access.
 * Unauthorized dashboards and admin links are completely omitted from the navigation tree.
 */
export function getNavigationForUser(user) {
  if (!user) return [];

  if (user.role === ROLES.SUPER_ADMIN) {
    return [
      {
        section: 'Institutional Governance',
        items: [
          {
            label: 'College Dashboard',
            to: '/college/dashboard',
            icon: 'layout-dashboard'
          },
          {
            label: 'User Management',
            to: '/college/users',
            icon: 'users'
          },
          {
            label: 'Departments',
            to: '/college/departments',
            icon: 'building'
          }
        ]
      },
      {
        section: 'Achievement Trackers',
        items: [
          {
            label: 'Department Tracker',
            to: '/college/department-tracker',
            icon: 'building'
          },
          {
            label: 'Faculty Tracker',
            to: '/college/faculty-tracker',
            icon: 'award'
          },
          {
            label: 'Student Tracker',
            to: '/college/student-tracker',
            icon: 'graduation-cap'
          }
        ]
      },
      {
        section: 'Intelligence & Reports',
        items: [
          {
            label: 'Leaderboards',
            to: '/college/leaderboards',
            icon: 'trophy'
          },
          {
            label: 'Annual Reports',
            to: '/college/reports',
            icon: 'file-bar-chart'
          },
          {
            label: 'AI Insights',
            to: '/college/insights',
            icon: 'sparkles'
          }
        ]
      }
    ];
  }

  if (user.role === ROLES.HOD) {
    const workspaceItems = [
      {
        label: 'Department Dashboard',
        to: '/department/dashboard',
        icon: 'layout-dashboard'
      }
    ];

    if (user.can_manage_dept_users === true) {
      workspaceItems.push({
        label: 'Department Users',
        to: '/department/users',
        icon: 'users'
      });
    }

    return [
      {
        section: 'Department Workspace',
        items: workspaceItems
      },
      {
        section: 'Department Trackers',
        items: [
          {
            label: 'Department Tracker',
            to: '/department/department-tracker',
            icon: 'building'
          },
          {
            label: 'Faculty Tracker',
            to: '/department/faculty-tracker',
            icon: 'award'
          },
          {
            label: 'Student Tracker',
            to: '/department/student-tracker',
            icon: 'graduation-cap'
          }
        ]
      },
      {
        section: 'Intelligence & Reports',
        items: [
          {
            label: 'Leaderboards',
            to: '/department/leaderboards',
            icon: 'trophy'
          },
          {
            label: 'Annual Reports',
            to: '/department/reports',
            icon: 'file-bar-chart'
          },
          {
            label: 'AI Insights',
            to: '/department/insights',
            icon: 'sparkles'
          }
        ]
      }
    ];
  }

  if (user.role === ROLES.FACULTY) {
    return [
      {
        section: 'Faculty Workspace',
        items: [
          {
            label: 'Faculty Dashboard',
            to: '/faculty/dashboard',
            icon: 'layout-dashboard'
          },
          {
            label: 'My Faculty Achievements',
            to: '/faculty/achievements',
            icon: 'award'
          },
          {
            label: 'Submit Achievement',
            to: '/faculty/achievements/new',
            icon: 'plus-circle'
          },
          {
            label: 'Personal Portfolio',
            to: '/faculty/portfolio',
            icon: 'briefcase'
          }
        ]
      },
      {
        section: 'Department Visibility',
        items: [
          {
            label: 'Dept Students (Read-Only)',
            to: '/faculty/department-students',
            icon: 'graduation-cap'
          }
        ]
      },
      {
        section: 'Intelligence & Reports',
        items: [
          {
            label: 'Leaderboards',
            to: '/faculty/leaderboards',
            icon: 'trophy'
          },
          {
            label: 'Annual Reports',
            to: '/faculty/reports',
            icon: 'file-bar-chart'
          },
          {
            label: 'AI Insights',
            to: '/faculty/insights',
            icon: 'sparkles'
          }
        ]
      }
    ];
  }

  if (user.role === ROLES.STUDENT) {
    return [
      {
        section: 'Student Workspace',
        items: [
          {
            label: 'Student Dashboard',
            to: '/student/dashboard',
            icon: 'layout-dashboard'
          },
          {
            label: 'My Achievements',
            to: '/student/achievements',
            icon: 'graduation-cap'
          },
          {
            label: 'Submit Achievement',
            to: '/student/achievements/new',
            icon: 'plus-circle'
          },
          {
            label: 'Competition History',
            to: '/student/competitions',
            icon: 'trophy'
          },
          {
            label: 'Internship Records',
            to: '/student/internships',
            icon: 'briefcase'
          },
          {
            label: 'Placement Achievements',
            to: '/student/placements',
            icon: 'award'
          },
          {
            label: 'Personal Portfolio',
            to: '/student/portfolio',
            icon: 'file-text'
          }
        ]
      },
      {
        section: 'Intelligence & Reports',
        items: [
          {
            label: 'Annual Reports',
            to: '/student/reports',
            icon: 'file-bar-chart'
          },
          {
            label: 'AI Insights',
            to: '/student/insights',
            icon: 'sparkles'
          }
        ]
      }
    ];
  }

  return [];
}
