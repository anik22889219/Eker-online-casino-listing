export type UserRole = 'super_admin' | 'admin' | 'moderator' | 'user';
export type UserStatus = 'active' | 'suspended' | 'pending';
export type CasinoStatus = 'draft' | 'ai_generated' | 'pending_review' | 'published' | 'archived';

export interface UserProfile {
  id?: string;
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  status: UserStatus;
  photoURL?: string;
  bio?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Casino {
  id: string;
  slug: string;
  affiliateLink: string;
  casinoName: string;
  casinoLogo: string;
  bannerImage: string;
  shortDescription: string;
  landingContent: string;
  manualReview: string;
  welcomeBonus: string;
  category: string;
  country: string;
  seoTitle: string;
  metaDescription: string;
  keywords: string[];
  status: CasinoStatus;
  logoStatus?: 'missing' | 'found';
  aiGenerated: boolean;
  featured: boolean;
  averageRating: number;
  totalReviews: number;
  createdAt: string;
  updatedAt: string;
  isDeleted?: boolean;
}

export interface Review {
  id: string;
  casinoId: string;
  userId: string;
  rating: number;
  title: string;
  comment: string;
  approved: boolean;
  createdAt: string;
  jackpotScreenshot?: string;
  balanceScreenshot?: string;
  casinoName?: string;
  gameName?: string;
  gameIcon?: string;
}

export interface Rating {
  casinoId: string;
  userId: string;
  rating: number;
  createdAt: string;
  updatedAt: string;
}

export interface Bonus {
  id: string;
  casinoId: string;
  title: string;
  description: string;
  bonusType: string;
  amount: number;
  expiryDate: string;
  active: boolean;
}

export interface PromoOffer {
  id: string;
  casinoId: string;
  promoCode: string;
  title: string;
  description: string;
  active: boolean;
  expiryDate: string;
}

export interface JackpotScreenshot {
  id: string;
  casinoId: string;
  image: string;
  amount: number;
  approved: boolean;
  uploadedBy: string;
  uploadedAt: string;
  gameName?: string;
  gameIcon?: string;
}

export interface SellRequest {
  id: string;
  name: string;
  email: string;
  casinoName: string;
  gameName?: string;
  affiliateLink: string;
  screenshot?: string;
  balanceScreenshot?: string;
  bikashNumber?: string;
  dateTime?: string;
  amount: number;
  message: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt?: string;
}

export interface AiHistoryEntry {
  id: string;
  casinoId: string;
  prompt: string;
  response: string;
  generatedAt: string;
  generatedBy: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  read: boolean;
  type: string;
  createdAt: string;
}

export interface SystemSettings {
  id: string;
  maintenanceMode: boolean;
  defaultCategory: string;
  allowedCountries: string[];
  aiModelName: string;
  maxUploadSizeMb: number;
  systemEmail: string;
  updatedAt: string;
  demoScreenshotUrl?: string;
  demoBalanceUrl?: string;
}

export interface ThemeGlobalSettings {
  logoText: string;
  logoUrl: string;
  faviconText: string;
  faviconUrl: string;
  fontFamily: string;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  cardBackgroundColor: string;
  layoutType: "boxed" | "wide";
  cardBorderRadius: string;
  sectionSpacing: string;
}

export interface ThemeSection {
  id: string;
  type: "hero" | "featured_operators" | "latest_listings" | "top_rated" | "sell_cta" | "faq" | "custom" | "most_winning_games";
  title: string;
  subtitle?: string;
  enabled: boolean;
  content?: string;
  actionText?: string;
  actionUrl?: string;
  backgroundGradientStart?: string;
  backgroundGradientEnd?: string;
  customBackgroundColor?: string;
  customTextColor?: string;
  tier1Range?: string;
  tier1Reward?: string;
  tier2Range?: string;
  tier2Reward?: string;
  faqs?: Array<{ question: string; answer: string }>;
  carouselCategory?: string;
  displayCount?: number;
  slideCount?: number;
  autoSlide?: boolean;
  slideSpeed?: number;
}

export interface ThemeMenuItem {
  id: string;
  label: string;
  url: string;
  openInNewTab: boolean;
  isButton?: boolean;
}

export interface SingleCasinoSettings {
  sidebarLocation: "left" | "right" | "none";
  showRelatedJackpots: boolean;
  showVerifiedBadge: boolean;
  reviewBtnText: string;
  disclaimerText: string;
}

export interface BlogPageSettings {
  bannerTitle: string;
  bannerSubtitle: string;
  postsPerPage: number;
  columns: number;
  enableFilters: boolean;
}

export interface SingleBlogSettings {
  showAuthorBox: boolean;
  showShareButtons: boolean;
  showReadTime: boolean;
  showRelatedPosts: boolean;
  enableComments: boolean;
}

export interface ContactPageSettings {
  title: string;
  description: string;
  email: string;
  phone: string;
  address: string;
  mapIframeUrl: string;
}

export interface MostWinningGameItem {
  id: string;
  name: string;
  brandName?: string;
  logoUrl: string;
  winRate?: string;
  multiplier?: string;
  playUrl?: string;
}

export interface AffiliateLink {
  id?: string;
  casinoId?: string;
  title?: string;
  url?: string;
  active?: boolean;
  name?: string;
  isArchived?: boolean;
  imageUrl?: string;
  rewardText?: string;
  originalUrl?: string;
  createdAt?: string;
}

export interface ThemeConfig {
  id: string;
  globalSettings: ThemeGlobalSettings;
  sections: ThemeSection[];
  updatedAt: string;
  menuItems?: ThemeMenuItem[];
  categoriesList?: string[];
  singleCasinoSettings?: SingleCasinoSettings;
  blogPageSettings?: BlogPageSettings;
  singleBlogSettings?: SingleBlogSettings;
  contactPageSettings?: ContactPageSettings;
  mostWinningGames?: MostWinningGameItem[];
}

export type AgentCategory = 'content' | 'seo' | 'moderation' | 'casino' | 'analytics' | 'customer_support' | 'general' | string;
export type AgentStatus = 'active' | 'inactive' | 'archived' | 'draft';

export interface AgentPermissions {
  canReadData: boolean;
  canWriteData: boolean;
  canExecuteActions: boolean;
  canManageUsers: boolean;
  allowedCollections?: string[];
  allowedEndpoints?: string[];
}

export interface AgentModelConfig {
  modelName: string;
  temperature: number;
  maxTokens?: number;
  topP?: number;
  topK?: number;
}

export interface Agent {
  id: string;
  name: string;
  role: string;
  description: string;
  avatar: string;
  category: AgentCategory;
  status: AgentStatus;
  
  systemInstructions: string;
  shortContext?: string;
  longContext?: string;
  personality?: string;
  writingStyle?: string;
  tone?: string;
  
  modelConfig: AgentModelConfig;
  permissions: AgentPermissions;
  
  skillIds?: string[];
  knowledgeIds?: string[];
  toolIds?: string[];
  
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  lastRunAt?: string | null;
  
  isSystemAgent?: boolean;
  version?: number;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface Skill {
  id: string;
  name: string;
  category: string;
  description: string;
  instructions: string;
  inputSchema?: Record<string, any> | string;
  outputSchema?: Record<string, any> | string;
  version: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeDoc {
  id: string;
  title: string;
  category: string;
  content: string;
  tags?: string[];
  version: number;
  status?: 'active' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export interface AgentTool {
  id: string;
  name: string;
  description: string;
  category?: string;
  enabled: boolean;
  parameters?: Record<string, any>;
  requiresPermission?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AgentSkillConfig {
  id: string;
  agentId: string;
  skillId: string;
  enabled: boolean;
  priority: number;
}

export interface AgentRunLog {
  id: string;
  agentId: string;
  agentName?: string;
  task: string;
  input?: any;
  output?: any;
  status: 'pending' | 'running' | 'completed' | 'failed';
  error?: string;
  executionTimeMs?: number;
  modelUsed?: string;
  tokensUsed?: number;
  skillIdsUsed?: string[];
  knowledgeIdsUsed?: string[];
  toolCallsExecuted?: Array<{ toolId: string; params: any; result: any }>;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowNodeConfig {
  agentId?: string;
  skillsOverride?: string[];
  promptTemplate?: string;
  inputMapping?: string;
  outputMapping?: string;
  maxRetries?: number;
  timeoutSeconds?: number;
  failureBehavior?: 'stop' | 'continue' | 'branch';
  condition?: {
    leftOperand?: string;
    operator?: 'contains' | 'not_contains' | 'equals' | 'not_equals' | 'gt' | 'lt';
    rightOperand?: string;
    trueBranchNodeId?: string;
    falseBranchNodeId?: string;
  };
  transformTemplate?: string;
  requiredApproval?: boolean;
  approverRole?: 'admin' | 'editor' | 'moderator';
  approvalMessage?: string;
  rejectBehavior?: 'stop' | 'fail' | 'retry';
  approvedNodeId?: string;
  rejectedNodeId?: string;
  notificationTitle?: string;
  notificationMessage?: string;
  delaySeconds?: number;
  autoPublishAction?: boolean;
}

export interface WorkflowNode {
  id: string;
  type: 'start' | 'agent' | 'condition' | 'transform' | 'approval' | 'notification' | 'delay' | 'end';
  label: string;
  config: WorkflowNodeConfig;
  position?: { x: number; y: number };
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  label?: string; // 'true' | 'false' | 'approve' | 'reject' | 'default'
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  category?: string;
  status: 'active' | 'draft' | 'archived';
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface WorkflowRunContext {
  input: Record<string, any>;
  nodes: Record<string, {
    output?: any;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'waiting_approval' | 'skipped';
    executionTimeMs?: number;
    error?: string;
  }>;
  approvedBy?: string;
  approvalNotes?: string;
  stepCount?: number;
}

export interface WorkflowRun {
  id: string;
  workflowId: string;
  workflowName: string;
  status: 'running' | 'completed' | 'failed' | 'waiting_approval' | 'paused' | 'cancelled';
  initialInput: Record<string, any>;
  context: WorkflowRunContext;
  currentNodeId?: string;
  error?: string;
  startedAt: string;
  finishedAt?: string;
  updatedAt: string;
}

export interface WorkflowStepLog {
  id?: string;
  runId: string;
  workflowId: string;
  nodeId: string;
  nodeType: string;
  nodeLabel: string;
  status: 'started' | 'completed' | 'failed' | 'waiting_approval' | 'skipped' | 'cancelled';
  input: any;
  output: any;
  error?: string;
  retryCount: number;
  executionTimeMs: number;
  timestamp: string;
}

export interface MigrationLog {
  id?: string;
  feature: string;
  mappedAgentId: string;
  mappedAgentName: string;
  status: 'success' | 'fallback' | 'failed';
  inputSummary: string;
  outputSummary: string;
  timestamp: string;
}



