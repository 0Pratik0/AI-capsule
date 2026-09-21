// Must match CATEGORIES and USEFULNESS in server/validation.js.
// The server is the authority; these lists only drive the form's dropdowns.
export const CATEGORIES = ['Coding', 'Writing', 'Research', 'Debugging', 'Study', 'Other'];
export const USEFULNESS = ['Good', 'Needs Improvement', 'Not Useful'];

export const EMPTY_CAPSULE = {
  project_name: '',
  prompt_title: '',
  prompt_version: 'v1',
  prompt_text: '',
  response_summary: '',
  category: '',
  usefulness: '',
  reviewed: false,
  improved: false,
  screenshot_url: '',
  notes: '',
};
