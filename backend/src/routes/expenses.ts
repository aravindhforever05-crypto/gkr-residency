import { Router } from 'express';
import * as expenseController from '../controllers/expenseController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Expenses
router.get('/categories', authenticate, expenseController.getExpenseCategories);
router.get('/', authenticate, expenseController.getExpenses);
router.post('/', authenticate, expenseController.createExpense);
router.put('/:id', authenticate, expenseController.updateExpense);
router.delete('/:id', authenticate, expenseController.deleteExpense);

// Employees
router.get('/employees', authenticate, expenseController.getEmployees);
router.post('/employees', authenticate, expenseController.createEmployee);
router.put('/employees/:id', authenticate, expenseController.updateEmployee);

// Salary
router.get('/salary', authenticate, expenseController.getSalaryPayments);
router.post('/salary', authenticate, expenseController.addSalaryPayment);

// Water bills
router.get('/water-bills', authenticate, expenseController.getWaterBills);
router.post('/water-bills', authenticate, expenseController.createWaterBill);
router.put('/water-bills/:id', authenticate, expenseController.updateWaterBill);

export default router;
