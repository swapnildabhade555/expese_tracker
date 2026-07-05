import express from 'express';
import { protect } from '../../../../middlewares/auth.js';
import { validate } from '../../../../middlewares/validate.js';
import {
  createGroup,
  updateGroup,
  softDeleteGroup,
  archiveGroup,
  unarchiveGroup,
  getGroupDetails,
  listUserGroups,
} from '../controllers/groupController.js';
import {
  approveMember,
  rejectMember,
  updateMemberRole,
  transferOwnership,
  removeMember,
  leaveGroup,
} from '../../members/controllers/memberController.js';
import {
  createEmailInvitation,
  getJoinCode,
  joinWithCode,
  joinWithInviteToken,
} from '../../invitations/controllers/invitationController.js';
import {
  createExpense,
  updateExpense,
  deleteExpense,
  listExpenses,
} from '../../expenses/controllers/expenseController.js';
import {
  getSuggestedSettlements,
  recordSettlement,
  updateSettlementStatus,
  listSettlements,
} from '../../settlements/controllers/settlementController.js';
import { getActivityLogs } from '../../activityLogs/controllers/activityLogController.js';
import {
  getGroupSummary,
  getCategorySummary,
  getMonthlySummary,
} from '../../reports/controllers/reportController.js';
import {
  createGroupSchema,
  updateGroupSchema,
  memberActionSchema,
  updateRoleSchema,
  createInvitationSchema,
  joinWithCodeSchema,
  joinWithInviteTokenSchema,
  createExpenseSchema,
  updateExpenseSchema,
  recordSettlementSchema,
  updateSettlementStatusSchema,
} from '../validations/groupValidation.js';

const router = express.Router();

// All group endpoints require authentication
router.use(protect);

router.route('/')
  .post(validate(createGroupSchema), createGroup)
  .get(listUserGroups);

// Join routes (must be placed BEFORE /:id parameter route to prevent routing mismatch issues!)
router.post('/join/code', validate(joinWithCodeSchema), joinWithCode);
router.post('/join/invite', validate(joinWithInviteTokenSchema), joinWithInviteToken);

router.route('/:id')
  .get(getGroupDetails)
  .patch(validate(updateGroupSchema), updateGroup)
  .delete(softDeleteGroup);

router.post('/:id/archive', archiveGroup);
router.post('/:id/unarchive', unarchiveGroup);

// Member Management Routes
router.patch('/:id/members/approve', validate(memberActionSchema), approveMember);
router.patch('/:id/members/reject', validate(memberActionSchema), rejectMember);
router.patch('/:id/members/role', validate(updateRoleSchema), updateMemberRole);
router.post('/:id/members/transfer-owner', validate(memberActionSchema), transferOwnership);
router.post('/:id/members/leave', leaveGroup);
router.delete('/:id/members/remove', validate(memberActionSchema), removeMember);

// Invitation Routes
router.post('/:id/invitations/email', validate(createInvitationSchema), createEmailInvitation);
router.get('/:id/invitations/code', getJoinCode);

// Expense Routes
router.route('/:id/expenses')
  .post(validate(createExpenseSchema), createExpense)
  .get(listExpenses);

router.route('/:id/expenses/:expenseId')
  .patch(validate(updateExpenseSchema), updateExpense)
  .delete(deleteExpense);

// Settlement Routes
router.get('/:id/settlements/suggested', getSuggestedSettlements);

router.route('/:id/settlements')
  .post(validate(recordSettlementSchema), recordSettlement)
  .get(listSettlements);

router.patch('/:id/settlements/:settlementId', validate(updateSettlementStatusSchema), updateSettlementStatus);

// Activity Logs Route
router.get('/:id/activity-logs', getActivityLogs);

// Report Routes
router.get('/:id/reports/summary', getGroupSummary);
router.get('/:id/reports/category', getCategorySummary);
router.get('/:id/reports/monthly', getMonthlySummary);

export default router;
