import { Router } from 'express';
import { bankAccountController, bankTransactionController } from '../controllers';
import { protect, requireOrganization } from '@/core/middleware/auth.middleware';
import { validateBody, validateQuery } from '@/core/middleware/validate.middleware';
import {
  createBankAccountSchema,
  updateBankAccountSchema,
  bankAccountQuerySchema,
  updateBankTransactionSchema,
  matchTransactionSchema,
  bankTransactionQuerySchema,
  csvImportSchema,
} from '../schemas';

const router = Router();

// Apply auth middleware to all routes
router.use(protect);
router.use(requireOrganization);

// ============ Bank Account Routes (/tracking/bank-accounts) ============

router.get(
  '/bank-accounts',
  validateQuery(bankAccountQuerySchema.shape.query),
  bankAccountController.getBankAccounts
);
router.post(
  '/bank-accounts',
  validateBody(createBankAccountSchema.shape.body),
  bankAccountController.createBankAccount
);
router.get('/bank-accounts/:id', bankAccountController.getBankAccountById);
router.put(
  '/bank-accounts/:id',
  validateBody(updateBankAccountSchema.shape.body),
  bankAccountController.updateBankAccount
);
router.delete('/bank-accounts/:id', bankAccountController.archiveBankAccount);

// CSV Import
router.post(
  '/bank-accounts/:id/import',
  validateBody(csvImportSchema.shape.body),
  bankTransactionController.importFromCSV
);

// ============ Bank Transaction Routes (/tracking/bank-transactions) ============

// Analytics and bulk operations (before :id)
router.get('/bank-transactions/unmatched', bankTransactionController.getUnmatchedTransactions);
router.post('/bank-transactions/auto-match', bankTransactionController.autoMatchTransactions);

// CRUD
router.get(
  '/bank-transactions',
  validateQuery(bankTransactionQuerySchema.shape.query),
  bankTransactionController.getBankTransactions
);
router.get('/bank-transactions/:id', bankTransactionController.getBankTransactionById);
router.put(
  '/bank-transactions/:id',
  validateBody(updateBankTransactionSchema.shape.body),
  bankTransactionController.updateBankTransaction
);

// Reconciliation operations
router.post(
  '/bank-transactions/:id/match',
  validateBody(matchTransactionSchema.shape.body),
  bankTransactionController.matchTransaction
);
router.post('/bank-transactions/:id/unmatch', bankTransactionController.unmatchTransaction);
router.post('/bank-transactions/:id/reconcile', bankTransactionController.reconcileTransaction);
router.post('/bank-transactions/:id/ignore', bankTransactionController.ignoreTransaction);

export default router;
