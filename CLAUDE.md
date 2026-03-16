# CLAUDE.md - PolyPay App

## Project Overview

PolyPay is a privacy-preserving payroll platform built on Horizen blockchain. It enables organizations, DAOs, and global teams to run payroll privately using zero-knowledge proofs (Noir circuits). Key features: private payments, private multisig approvals, escrow/milestone-based transfers, real-time notifications via WebSocket, and JWT authentication.

## Tech Stack

**Monorepo** (Yarn Workspaces, Node.js >= 20.18.3)

| Layer | Stack |
|-------|-------|
| Frontend | Next.js 15, React 19, TypeScript 5.8, Tailwind CSS 4 + DaisyUI 5 |
| State | Zustand 5 (persist middleware), TanStack React Query 5 |
| Forms | React Hook Form 7 + Zod 3 |
| Web3 | wagmi 2, viem 2, RainbowKit 2, Uniswap SDK |
| ZK | @noir-lang/noir_js, @aztec/bb.js |
| UI | Radix UI + shadcn/ui pattern, CVA for variants, Lucide React icons |
| Notifications | Sonner (primary), react-hot-toast (secondary) |
| Real-time | socket.io-client |
| Backend | NestJS 11, TypeScript 5.7, Prisma 7 (PostgreSQL), JWT auth |
| Smart Contracts | Hardhat 2, Solidity, OpenZeppelin 5, Poseidon circuits |
| Shared | @polypay/shared - DTOs with class-validator/class-transformer |

## Folder Structure

```
/
├── docker/                    # Docker Compose, Dockerfiles, .env.example
├── docs/                      # Gitbook documentation
├── packages/
│   ├── nextjs/                # Frontend (Next.js App Router)
│   │   ├── app/               # Pages (dashboard, transfer, batch, contact-book, quest, leaderboard)
│   │   ├── components/
│   │   │   ├── ui/            # Base UI components (shadcn pattern: button, input, dialog...)
│   │   │   ├── form/          # Form components (Form, FormField, FormInput, FormTextarea)
│   │   │   ├── Common/        # Shared components (Sidebar, DisclaimerChecker)
│   │   │   ├── Dashboard/     # Dashboard feature components
│   │   │   ├── Transfer/      # Transfer flow components
│   │   │   ├── Batch/         # Batch operation components
│   │   │   ├── NewAccount/    # Account creation components
│   │   │   ├── modals/        # Modal dialogs (~22 modals, lazy-loaded via ModalRegistry)
│   │   │   ├── skeletons/     # Loading skeleton components
│   │   │   └── icons/         # Custom icon components
│   │   ├── hooks/
│   │   │   ├── api/           # React Query hooks (useTransaction, useAccount, useNotifications...)
│   │   │   ├── app/           # App logic hooks (useAuth, useGenerateProof, useSocketEvent...)
│   │   │   ├── form/          # Form hooks (useZodForm)
│   │   │   └── scaffold-eth/  # Scaffold-eth hooks
│   │   ├── services/
│   │   │   ├── api/           # Axios API services (apiClient, authApi, transactionApi...)
│   │   │   ├── store/         # Zustand stores (useIdentityStore, useAccountStore...)
│   │   │   ├── web3/          # Web3 utilities
│   │   │   ├── socket/        # Socket.io client
│   │   │   └── queryClient.ts # React Query config
│   │   ├── utils/             # Utilities (formatError, errorHandler, signer, network...)
│   │   ├── lib/form/          # Form schemas (Zod) and validation helpers
│   │   ├── types/             # TypeScript types (modal, form, abitype)
│   │   ├── constants/         # Constants (API_BASE_URL, timing)
│   │   ├── configs/           # Route config, scaffold config
│   │   └── contracts/         # Contract ABIs
│   ├── backend/               # NestJS Backend
│   │   └── src/
│   │       ├── auth/          # JWT authentication module
│   │       ├── account/       # Multi-sig account management
│   │       ├── transaction/   # Transaction CRUD & voting
│   │       ├── user/          # User management with ZK commitments
│   │       ├── notification/  # Real-time notifications (WebSocket)
│   │       ├── quest/         # Quest/gamification system
│   │       ├── admin/         # Admin analytics
│   │       ├── zkverify/      # ZK proof verification (Horizen)
│   │       ├── common/        # Shared utilities & middleware
│   │       ├── database/      # Prisma module
│   │       └── ...            # ~24 feature modules total
│   ├── shared/                # Shared DTOs and types (@polypay/shared)
│   └── hardhat/               # Smart contracts & deployment
```

## Validation Commands

```bash
# Root level
yarn lint                      # ESLint (frontend + hardhat)
yarn next:check-types          # TypeScript type checking (frontend)
yarn next:build                # Production build (frontend)
yarn build                     # Build all packages (shared → backend → frontend)
yarn test                      # Run hardhat tests
yarn format                    # Prettier format all packages

# Frontend (packages/nextjs)
yarn dev                       # Dev server (port 3000)
yarn build                     # Next.js production build
yarn lint                      # ESLint
yarn check-types               # TypeScript check
yarn format                    # Prettier

# Backend (packages/backend)
yarn start:dev                 # Dev server with watch (port 4000)
yarn lint                      # ESLint
yarn format                    # Prettier
yarn test                      # Jest unit tests
yarn test:cov                  # Jest with coverage
yarn test:e2e                  # End-to-end tests
yarn test:e2e:staging          # Staging E2E tests

# Smart Contracts (packages/hardhat)
yarn chain                     # Local Hardhat node
yarn compile                   # Compile contracts
yarn deploy                    # Deploy contracts
yarn test                      # Hardhat tests
```

## Code Style & Conventions

### Naming
- **Components**: PascalCase files and exports (`FormField.tsx`, `NotificationPanel.tsx`)
- **Hooks**: camelCase with `use` prefix (`useZodForm.ts`, `useTransaction.ts`)
- **Utils/Services**: camelCase (`apiClient.ts`, `formatError.ts`)
- **Types/Interfaces**: PascalCase (`ModalProps`, `IdentityState`)
- **Stores**: camelCase with `use` prefix (`useIdentityStore.ts`, `useAccountStore.ts`)
- **API services**: camelCase with `Api` suffix (`transactionApi`, `authApi`)
- **Constants**: UPPER_SNAKE_CASE (`API_BASE_URL`, `DEFAULT_PAGE_SIZE`)

### Import Order
1. React / Next.js
2. Third-party libraries
3. @heroicons
4. @polypay/shared
5. Local imports (`~~/...`)

### Formatting (Prettier)
- Print width: 120
- Tab width: 2 spaces
- Arrow parens: avoid
- Trailing comma: all
- Path alias: `~~/*` → project root, `@polypay/shared` → shared package

### Component Pattern
- "use client" directive for client-side components
- Functional components with hooks
- Named exports for UI components, default exports for pages
- Props interfaces defined inline in component files

## Common Patterns

### Design Tokens & Colors
- **Source of truth**: `packages/nextjs/styles/tokens.ts` — all color definitions live here
- **Sync script**: `packages/nextjs/styles/sync-colors.ts` — generates CSS variables into `globals.css` and Tailwind color config into `tailwind.config.ts`
- **Command**: `yarn sync-colors` (from `packages/nextjs`)
- **Flow**: Edit `tokens.ts` → run `yarn sync-colors` → CSS vars + Tailwind config auto-updated
- **Never edit colors directly** in `globals.css` or `tailwind.config.ts` — they will be overwritten by the sync script

### State Management (Zustand)
```typescript
// services/store/useIdentityStore.ts
// All stores use create() with persist middleware for localStorage
const useIdentityStore = create<IdentityState>()(
  persist(
    (set) => ({
      accessToken: null,
      // ...state and actions
      setTokens: (access, refresh) => set({ accessToken: access, refreshToken: refresh }),
      logout: () => set({ accessToken: null, isAuthenticated: false }),
    }),
    { name: "identity-storage" }
  )
);
// Use getState() for sync access outside React (e.g., in Axios interceptors)
```

### API Services
```typescript
// services/api/transactionApi.ts
// Object export pattern with typed async methods
export const transactionApi = {
  getAll: async (params) => { const { data } = await apiClient.get(...); return data; },
  create: async (dto) => { const { data } = await apiClient.post(...); return data; },
};
```

### React Query Hooks
```typescript
// hooks/api/useTransaction.ts
// Query key factory pattern for cache invalidation
const transactionKeys = { all: ["transactions"], list: (filters) => [...] };
// useInfiniteQuery for pagination, useMutation with onSuccess invalidation
```

### Forms (React Hook Form + Zod)
```typescript
// useZodForm hook → Form component → FormField with Controller
const form = useZodForm({ schema: contactSchema });
// Zod schemas in lib/form/schemas.ts, reusable validators in lib/form/validation.ts
```

### Error Handling
```typescript
// utils/formatError.ts - pattern matching for friendly error messages
// utils/errorHandler.ts - ErrorCode enum, parseError(), handleError()
// Axios interceptor handles 401 auto-refresh with token rotation
```

### Notifications
```typescript
import { notification } from "~~/utils/scaffold-eth";
notification.success("Transaction submitted!");
notification.error(formatErrorMessage(error));
```

### Real-time (Socket.io)
```typescript
// hooks/app/useSocketEvent.ts - wrapper with auto-cleanup on unmount
useSocketEvent("transaction:updated", (data) => { /* handle */ });
```

### Modals
```typescript
// Lazy-loaded via ModalRegistry with dynamic imports to prevent SSR issues
// components/modals/ - ~22 modal components
```

### Authenticated Queries
```typescript
// hooks/api/useAuthenticatedQuery.ts
// Wrapper that auto-disables queries when user is not authenticated
```

### Routes
```typescript
// configs/routes.config.ts - centralized route definitions
// hooks/app/useAppRouter.ts - type-safe navigation (goToDashboard, goToTransfer, etc.)
```

## Environment Setup

### Prerequisites
- Node.js >= 20.18.3
- Yarn (workspaces)
- Docker & Docker Compose (for PostgreSQL)

## Do's and Don'ts

### Do's
- Use `@polypay/shared` DTOs for API contracts between frontend and backend
- Use `useZodForm` hook for all forms with Zod schemas
- Use `notification.success/error/info` for user feedback
- Use `formatErrorMessage()` for user-friendly error messages
- Use `useAuthenticatedQuery` wrapper for queries requiring auth
- Use query key factory pattern for React Query cache management
- Use `useSocketEvent` hook for real-time subscriptions (auto-cleanup)
- Use `~~/*` path alias for local imports
- Use Zustand `persist` middleware for state that needs to survive refresh
- Use `apiClient` (configured Axios instance) for all API calls
- Follow feature-based component organization
- Use Radix UI + CVA for new UI components (shadcn pattern)

### Don'ts
- Don't import from `@polypay/shared` directly in smart contracts
- Don't make API calls without going through `apiClient` (it handles auth tokens)
- Don't create new notification systems - use existing `notification` utility or Sonner
- Don't hardcode API URLs - use `API_BASE_URL` from constants
- Don't skip Zod validation for forms - always define schemas
- Don't store auth tokens manually - use `useIdentityStore`
- Don't create new Zustand stores without `persist` middleware unless state is truly ephemeral
- Don't use `useQuery` directly for authenticated endpoints - use `useAuthenticatedQuery`
- Don't put business logic in components - extract to custom hooks in `hooks/app/`
- Don't use inline styles - use Tailwind CSS classes
- Don't commit `.env` files or expose secrets
