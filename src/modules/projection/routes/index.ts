import { Router } from 'express';
import { cashFlowRoutes } from '../cash-flow/routes';
import { runwayRoutes } from '../runway/routes';
import { forecastRoutes } from '../forecasting/routes';
import { financialModelRoutes } from '../financial-model/routes';

const router = Router();

/**
 * Projection Module Routes
 *
 * Base path: /api/v1/projection
 *
 * Sub-modules:
 * - /cash-flow - Cash flow forecasting and projections
 * - /runway - Runway calculations and what-if analysis
 * - /forecast - Revenue/expense forecasting with multiple methods
 * - /financial-model - 3-statement financial models (P&L, Balance Sheet, Cash Flow)
 */

// Cash Flow: /projection/cash-flow/*
router.use('/cash-flow', cashFlowRoutes);

// Runway: /projection/runway/*
router.use('/runway', runwayRoutes);

// Forecast: /projection/forecast/*
router.use('/forecast', forecastRoutes);

// Financial Model: /projection/financial-model/*
router.use('/financial-model', financialModelRoutes);

export default router;
