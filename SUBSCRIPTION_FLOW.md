# Subscription & Paywall Flow

This document describes the first-launch paywall and trial logic.

## Logic

1. **App Launch**:
   - Checks if user has `premium` entitlement via RevenueCat.
   - Checks if `trialStartAt` exists in SecureStore.

2. **First Launch (No Premium, No Trial)**:
   - `startTrial()` is called immediately.
   - `trialStartAt` is set to `new Date().toISOString()`.
   - `PaywallModal` (Teaser) is shown.
   - User gets 1 day of free Premium access.

3. **Trial Period (1 Day)**:
   - User has full access to Premium features.
   - `canAccessPremiumFeatures()` returns `true`.

4. **Trial Expired (> 1 Day)**:
   - `canAccessPremiumFeatures()` returns `false`.
   - Accessing premium features triggers `PremiumGate`.
   - `PremiumGate` shows `PaywallModal` or locks the UI.

5. **Purchase**:
   - User can purchase via `PurchaseScreen`.
   - Successful purchase updates RevenueCat status to `premium`.

## Storage Keys (SecureStore)

- `trialStartAt`: ISO date string of when the trial started.
- `hasSeenPaywall`: Boolean string ('true'/'false') if user has seen the initial paywall.

## Components

- `PaywallModal.tsx`: The "Teaser" modal shown on first launch or when access is denied.
- `PurchaseScreen.tsx`: The full paywall screen with all features and purchase options.
- `PremiumGate.tsx`: HOC to protect premium features.

## Configuration

- **Trial Duration**: 1 Day (Configurable in `hooks/use-subscription-store.tsx`)
