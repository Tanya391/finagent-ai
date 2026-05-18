import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '../services/api';

export const useCashflow = () =>
  useQuery({
    queryKey: ['cashflow'],
    queryFn: () => analyticsService.cashflow().then((d) => d.cashflow),
    staleTime: 5 * 60 * 1000,
  });

export const useMonthlySummary = (year) =>
  useQuery({
    queryKey: ['monthly-summary', year],
    queryFn: () => analyticsService.monthlySummary(year).then((d) => d.monthly_summary || []),
    staleTime: 5 * 60 * 1000,
  });

export const useCategoryBreakdown = () =>
  useQuery({
    queryKey: ['category-breakdown'],
    queryFn: () => analyticsService.categoryBreakdown().then((d) => d.category_breakdown || []),
    staleTime: 5 * 60 * 1000,
  });

export const useTopMerchants = (limit = 10) =>
  useQuery({
    queryKey: ['top-merchants', limit],
    queryFn: () => analyticsService.topMerchants(limit).then((d) => d.top_merchants || []),
    staleTime: 5 * 60 * 1000,
  });

export const useSubscriptions = () =>
  useQuery({
    queryKey: ['subscriptions'],
    queryFn: () => analyticsService.subscriptions().then((d) => d.subscriptions || []),
    staleTime: 10 * 60 * 1000,
  });

export const useAnomalies = () =>
  useQuery({
    queryKey: ['anomalies'],
    queryFn: () => analyticsService.anomalies().then((d) => d.anomalies || []),
    staleTime: 10 * 60 * 1000,
  });

export const useServerStatus = () =>
  useQuery({
    queryKey: ['status'],
    queryFn: () => analyticsService.status(),
    refetchInterval: 30000,
    staleTime: 15000,
  });
