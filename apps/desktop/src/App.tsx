import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ShellLayout } from "./components/ShellLayout";
import { AccountDetailPage } from "./features/accounts/AccountDetailPage";
import { AnalyticsPage } from "./features/analytics/AnalyticsPage";
import { AttachmentsPage } from "./features/attachments/AttachmentsPage";
import { CategoriesPage } from "./features/categories/CategoriesPage";
import { DashboardPage } from "./features/dashboard/DashboardPage";
import { SettingsPage } from "./features/settings/SettingsPage";
import { TransactionsPage } from "./features/transactions/TransactionsPage";
import { WebhooksPage } from "./features/webhooks/WebhooksPage";
import { TransactionDetailPage } from "./features/transactions/TransactionDetailPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<ShellLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/transactions" element={<TransactionsPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="/attachments" element={<AttachmentsPage />} />
          <Route path="/webhooks" element={<WebhooksPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/accounts/:id" element={<AccountDetailPage />} />
          <Route path="/transactions/:id" element={<TransactionDetailPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
