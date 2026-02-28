import { createBrowserRouter } from 'react-router';
import { Layout } from './Layout';
import { Dashboard } from './pages/Dashboard';
import { Tokenize } from './pages/Tokenize';
import { Marketplace } from './pages/Marketplace';
import { Analytics } from './pages/Analytics';
import { Governance } from './pages/Governance';
import { Verify } from './pages/Verify';
import { NotFound } from './pages/NotFound';
import { Portfolio } from './pages/Portfolio';
import { Income } from './pages/Income';
import { History } from './pages/History';
import KYCPage from './pages/KYC';
import MobileKYCPage from './pages/MobileKYC';
import NotificationsPage from './pages/Notifications';
import AdminPage from './pages/Admin';
import FAQPage from './pages/FAQ';
import DocumentationPage from './pages/Documentation';
import CompliancePage from './pages/Compliance';
import WhitepaperPage from './pages/Whitepaper';
import SupportPage from './pages/Support';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: Layout,
    children: [
      { index: true, Component: Dashboard },
      { path: 'tokenize', Component: Tokenize },
      { path: 'marketplace', Component: Marketplace },
      { path: 'analytics', Component: Analytics },
      { path: 'governance', Component: Governance },
      { path: 'verify', Component: Verify },
      { path: 'portfolio', Component: Portfolio },
      { path: 'income', Component: Income },
      { path: 'history', Component: History },
      { path: 'kyc', Component: KYCPage },
      { path: 'kyc/mobile', Component: MobileKYCPage },
      { path: 'notifications', Component: NotificationsPage },
      { path: 'admin', Component: AdminPage },
      { path: 'faq', Component: FAQPage },
      { path: 'docs', Component: DocumentationPage },
      { path: 'compliance', Component: CompliancePage },
      { path: 'whitepaper', Component: WhitepaperPage },
      { path: 'support', Component: SupportPage },
      { path: '*', Component: NotFound },
    ],
  },
]);