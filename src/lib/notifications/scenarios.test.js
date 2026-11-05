// FE-014: every bell row opens the page the event table names.
import { describe, expect, it } from 'vitest';
import { CATALOGUE_EVENT_IDS, IN_APP_EVENTS, alertHref, inboxHref, inboxItemHref } from './scenarios';

const ID = 'job-1';
const job = (event) => ({ event, resource_type: 'edu_video_job', resource_id: ID });

const WANT = {
  faculty: {
    pipeline_completed: `/faculty/videos?job=${ID}`,
    content_ready_for_review: `/faculty/videos?job=${ID}`,
    changes_requested: `/faculty/videos?job=${ID}`,
    content_published: `/faculty/videos?job=${ID}`,
    mcq_ready_for_review: `/faculty/mcq?job=${ID}`,
    assessment_available: `/faculty/mcq?job=${ID}`,
    assessment_result: '/faculty/students',
  },
  admin: {
    pipeline_completed: '/admin/content',
    content_ready_for_review: '/admin/content',
    changes_requested: '/admin/content',
    content_published: '/admin/content',
    mcq_ready_for_review: `/admin/mcq?job=${ID}`,
    assessment_available: `/admin/mcq?job=${ID}`,
    assessment_result: '/admin/analytics',
  },
  student: {
    pipeline_completed: `/student/subjects?chapter=${ID}`,
    content_ready_for_review: `/student/subjects?chapter=${ID}`,
    changes_requested: `/student/subjects?chapter=${ID}`,
    content_published: `/student/subjects?chapter=${ID}`,
    mcq_ready_for_review: `/student/subjects?chapter=${ID}`,
    assessment_available: `/student/subjects?chapter=${ID}`,
    assessment_result: `/student/assessment?job=${ID}&view=review`,
  },
  superadmin: Object.fromEntries(IN_APP_EVENTS.map((e) => [e, '/superadmin/content'])),
};

describe('inboxItemHref', () => {
  Object.entries(WANT).forEach(([portal, table]) => {
    IN_APP_EVENTS.forEach((event) => {
      it(`${portal} ${event} with a job`, () => {
        expect(inboxItemHref(job(event), portal)).toBe(table[event]);
      });
    });
  });

  it('accepts college_admin as the admin portal', () => {
    expect(inboxItemHref(job('assessment_result'), 'college_admin')).toBe('/admin/analytics');
  });

  it('treats a row with an id and no type as a job', () => {
    expect(inboxItemHref({ event: 'assessment_available', resource_id: ID }, 'faculty')).toBe(`/faculty/mcq?job=${ID}`);
  });

  CATALOGUE_EVENT_IDS.forEach((event) => {
    ['superadmin', 'admin', 'faculty', 'student'].forEach((portal) => {
      it(`${portal} ${event} without a job falls back to the table or the inbox`, () => {
        const row = { event, resource_type: 'user', resource_id: 'u-1' };
        expect(inboxItemHref(row, portal)).toBe(alertHref(event, portal) || inboxHref(portal));
      });
    });
  });

  it('never follows a link outside the portals', () => {
    expect(inboxItemHref({ event: 'x', link: 'https://evil.example/' }, 'student')).toBe('/student/notifications');
  });
});
