import { db } from '@/lib/db';
import type { PaymentMilestoneRow } from '@/lib/payment/service';
import { JOB_CATEGORIES, type JobCategory, serializeTags } from './constants';

export { JOB_CATEGORIES, CATEGORY_ICON, isJobCategory, parseTags, serializeTags, type JobCategory } from './constants';

export interface SubcontractorRow {
  id: number;
  installer_id: number;
  name: string;
  phone: string | null;
  specialty_tags: string;
  line_user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface JobAssignmentRow {
  id: number;
  milestone_id: number;
  category: JobCategory;
  subcontractor_id: number;
  status: 'assigned' | 'in_progress' | 'submitted' | 'approved' | 'rejected';
  submitted_note: string | null;
  submitted_at: string | null;
  rejected_reason: string | null;
  rejected_at: string | null;
  approved_at: string | null;
  previous_subcontractor_id: number | null;
  reassigned_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Roster list for the "ทีมช่าง" tab — includes active (not yet approved) job-assignment count per sub-contractor. */
export async function getRoster(installerId: number) {
  return db
    .prepare(
      `SELECT s.*,
         (SELECT COUNT(*) FROM job_assignments ja WHERE ja.subcontractor_id = s.id AND ja.status IN ('assigned','in_progress','submitted')) AS active_job_count
       FROM subcontractors s
       WHERE s.installer_id = ?
       ORDER BY s.created_at DESC`
    )
    .all(installerId) as Promise<(SubcontractorRow & { active_job_count: number })[]>;
}

export async function createSubcontractor(opts: { installerId: number; name: string; phone: string | null; tags: string[] }): Promise<SubcontractorRow> {
  return db
    .prepare(
      `INSERT INTO subcontractors (installer_id, name, phone, specialty_tags) VALUES (?, ?, ?, ?) RETURNING *`
    )
    .get(opts.installerId, opts.name, opts.phone, serializeTags(opts.tags)) as Promise<SubcontractorRow>;
}

export async function updateSubcontractor(opts: { id: number; installerId: number; name: string; phone: string | null; tags: string[] }): Promise<SubcontractorRow | undefined> {
  return db
    .prepare(
      `UPDATE subcontractors SET name = ?, phone = ?, specialty_tags = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND installer_id = ? RETURNING *`
    )
    .get(opts.name, opts.phone, serializeTags(opts.tags), opts.id, opts.installerId) as Promise<SubcontractorRow | undefined>;
}

export async function getSubcontractor(id: number, installerId: number): Promise<SubcontractorRow | undefined> {
  return db.prepare('SELECT * FROM subcontractors WHERE id = ? AND installer_id = ?').get(id, installerId) as Promise<SubcontractorRow | undefined>;
}

/** Shared ownership check for the per-milestone job-assignment routes — mirrors the pattern
 * already used by the milestone start/complete routes (project by id+installerId, then milestone
 * by id+projectId), so job routes never trust a bare milestone id from the URL. */
export async function getOwnedMilestone(installerId: number, projectId: number | string, milestoneId: number | string): Promise<PaymentMilestoneRow | undefined> {
  const project = (await db.prepare('SELECT id FROM payment_projects WHERE id = ? AND installer_id = ?').get(projectId, installerId)) as
    | { id: number }
    | undefined;
  if (!project) return undefined;
  return db.prepare('SELECT * FROM payment_milestones WHERE id = ? AND project_id = ?').get(milestoneId, project.id) as Promise<PaymentMilestoneRow | undefined>;
}

/** Assigns an existing roster sub-contractor to a (milestone, category) — fails if that category is already assigned on this milestone (use reassign instead). */
export async function assignJob(opts: { milestoneId: number; category: JobCategory; subcontractorId: number }): Promise<JobAssignmentRow> {
  return db
    .prepare(
      `INSERT INTO job_assignments (milestone_id, category, subcontractor_id, status) VALUES (?, ?, ?, 'assigned') RETURNING *`
    )
    .get(opts.milestoneId, opts.category, opts.subcontractorId) as Promise<JobAssignmentRow>;
}

export async function getJobAssignment(id: number): Promise<JobAssignmentRow | undefined> {
  return db.prepare('SELECT * FROM job_assignments WHERE id = ?').get(id) as Promise<JobAssignmentRow | undefined>;
}

/** Reassignment (design decision #9): only valid from 'assigned'/'in_progress'. Mutates the row
 * in place — resets to 'assigned' for the new sub-contractor, clears any stale rejection note
 * (it belonged to the previous assignee's context), and records who it changed from/when. History
 * already logged in job_assignment_updates keeps its own subcontractor_id, untouched. */
export async function reassignJob(opts: { jobAssignmentId: number; newSubcontractorId: number }): Promise<JobAssignmentRow | undefined> {
  return db
    .prepare(
      `UPDATE job_assignments SET
         previous_subcontractor_id = subcontractor_id,
         subcontractor_id = ?,
         status = 'assigned',
         submitted_note = NULL,
         submitted_at = NULL,
         rejected_reason = NULL,
         rejected_at = NULL,
         approved_at = NULL,
         reassigned_at = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND status IN ('assigned','in_progress')
       RETURNING *`
    )
    .get(opts.newSubcontractorId, opts.jobAssignmentId) as Promise<JobAssignmentRow | undefined>;
}

export async function approveJob(jobAssignmentId: number): Promise<JobAssignmentRow | undefined> {
  return db
    .prepare(
      `UPDATE job_assignments SET status = 'approved', approved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND status = 'submitted' RETURNING *`
    )
    .get(jobAssignmentId) as Promise<JobAssignmentRow | undefined>;
}

/** Rejects a submitted job back to 'in_progress' (per confirmed spec, 'rejected' is transient — never persisted as its own state). */
export async function rejectJob(jobAssignmentId: number, reason: string): Promise<JobAssignmentRow | undefined> {
  return db
    .prepare(
      `UPDATE job_assignments SET status = 'in_progress', rejected_reason = ?, rejected_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND status = 'submitted' RETURNING *`
    )
    .get(reason, jobAssignmentId) as Promise<JobAssignmentRow | undefined>;
}

export interface JobAssignmentUpdateRow {
  id: number;
  job_assignment_id: number;
  subcontractor_id: number;
  kind: 'text' | 'photo' | 'system';
  body: string;
  created_at: string;
}

export async function logJobUpdate(opts: { jobAssignmentId: number; subcontractorId: number; kind: 'text' | 'photo' | 'system'; body: string }): Promise<JobAssignmentUpdateRow> {
  return db
    .prepare(`INSERT INTO job_assignment_updates (job_assignment_id, subcontractor_id, kind, body) VALUES (?, ?, ?, ?) RETURNING *`)
    .get(opts.jobAssignmentId, opts.subcontractorId, opts.kind, opts.body) as Promise<JobAssignmentUpdateRow>;
}

export async function getJobUpdates(jobAssignmentId: number): Promise<JobAssignmentUpdateRow[]> {
  return db
    .prepare('SELECT * FROM job_assignment_updates WHERE job_assignment_id = ? ORDER BY created_at ASC')
    .all(jobAssignmentId) as Promise<JobAssignmentUpdateRow[]>;
}

/** Looks up a sub-contractor by their linked LINE userId — used by the webhook to attribute an
 * incoming text/photo message once they've completed the add-friend+code flow. */
export async function getSubcontractorByLineUserId(lineUserId: string): Promise<SubcontractorRow | undefined> {
  return db.prepare('SELECT * FROM subcontractors WHERE line_user_id = ?').get(lineUserId) as Promise<SubcontractorRow | undefined>;
}

/** Best-effort "which job is this LINE message about" — since the sub-contractor has no UI to
 * pick a job explicitly, this picks their most recently touched non-terminal job (submitted
 * counts too, e.g. for a follow-up photo while the installer is still reviewing). Undefined if
 * they have no open job right now. */
export async function findActiveJobForSubcontractor(subcontractorId: number): Promise<JobAssignmentRow | undefined> {
  return db
    .prepare(`SELECT * FROM job_assignments WHERE subcontractor_id = ? AND status IN ('assigned','in_progress','submitted') ORDER BY updated_at DESC LIMIT 1`)
    .get(subcontractorId) as Promise<JobAssignmentRow | undefined>;
}

/** LINE-driven transition: sub-contractor signals they've started work. */
export async function startJobFromLine(jobAssignmentId: number): Promise<JobAssignmentRow | undefined> {
  return db
    .prepare(`UPDATE job_assignments SET status = 'in_progress', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'assigned' RETURNING *`)
    .get(jobAssignmentId) as Promise<JobAssignmentRow | undefined>;
}

/** LINE-driven transition: sub-contractor signals the job is done, with their note. */
export async function submitJobFromLine(jobAssignmentId: number, note: string): Promise<JobAssignmentRow | undefined> {
  return db
    .prepare(
      `UPDATE job_assignments SET status = 'submitted', submitted_note = ?, submitted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND status = 'in_progress' RETURNING *`
    )
    .get(note, jobAssignmentId) as Promise<JobAssignmentRow | undefined>;
}

export type CustomerJobStage = 'done' | 'active' | 'pending';

/**
 * Customer-facing rollup (design spec §4): project-wide, not per-milestone. For each of the 4
 * fixed categories, looks at the *latest* job_assignments row for that category across every
 * milestone in the project: approved -> done; assigned/in_progress/submitted -> active (the
 * submitted/awaiting-review nuance is installer-internal, collapsed to "active" here); no
 * assignment at all -> pending. Never returns subcontractor identity — callers must only read
 * `category`/`stage` off the result.
 */
export async function computeProjectJobStageRollup(projectId: number): Promise<{ category: JobCategory; stage: CustomerJobStage }[]> {
  const rows = (await db
    .prepare(
      `SELECT DISTINCT ON (ja.category) ja.category, ja.status
       FROM job_assignments ja
       JOIN payment_milestones pm ON pm.id = ja.milestone_id
       WHERE pm.project_id = ?
       ORDER BY ja.category, ja.updated_at DESC`
    )
    .all(projectId)) as { category: JobCategory; status: string }[];

  const byCategory = new Map(rows.map((r) => [r.category, r.status]));

  return JOB_CATEGORIES.map((category) => {
    const status = byCategory.get(category);
    let stage: CustomerJobStage = 'pending';
    if (status === 'approved') stage = 'done';
    else if (status === 'assigned' || status === 'in_progress' || status === 'submitted') stage = 'active';
    return { category, stage };
  });
}
