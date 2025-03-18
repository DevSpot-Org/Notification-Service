export enum NotificationType {
  EMAIL = "email",
  SMS = "sms",
  IN_APP = "in-app",
}

export enum UserRole {
  BUILDER = "builder",
  TECH_OWNER = "tech_owner",
  ADMIN = "admin",
}

export enum NotificationCategory {
  // Builder categories
  ACCOUNT_PROFILE = "account_profile",
  HACKATHONS = "hackathons",
  BOUNTIES_GIGS = "bounties_gigs",
  COMMUNITY_SOCIAL = "community_social",
  PAYMENTS_REWARDS = "payments_rewards",

  // Tech Owner categories
  TO_ACCOUNT_SETUP = "to_account_setup",
  TO_HACKATHON_ENGAGEMENT = "to_hackathon_engagement",
  TO_BOUNTIES_GIGS = "to_bounties_gigs",
  TO_ADMIN_COMPLIANCE = "to_admin_compliance",
  TO_PERFORMANCE_INSIGHTS = "to_performance_insights",

  // System categories
  SYSTEM_GLOBAL = "system_global",
}

export enum NotificationEventType {
  // Builder - Account & Profile
  WELCOME_SIGNUP = "welcome_signup",
  PROFILE_COMPLETION_REMINDER = "profile_completion_reminder",
  TOKEN_ACHIEVEMENT = "token_achievement",

  // Builder - Hackathons
  HACKATHON_INVITATION = "hackathon_invitation",
  NEW_HACKATHON_PUBLISHED = "new_hackathon_published",
  HACKATHON_REGISTRATION_CONFIRMED = "hackathon_registration_confirmed",
  TEAM_REQUEST = "team_request",
  TEAM_REQUEST_RESPONSE = "team_request_response",
  SUBMISSION_DEADLINE_REMINDER = "submission_deadline_reminder",
  PROJECT_SUBMITTED = "project_submitted",
  HACKATHON_RESULTS = "hackathon_results",
  JUDGE_FEEDBACK_AVAILABLE = "judge_feedback_available",

  // Builder - Bounties & Gigs
  NEW_BOUNTY_POSTED = "new_bounty_posted",
  SELECTED_FOR_BOUNTY = "selected_for_bounty",
  PAYMENT_RELEASED = "payment_released",
  BOUNTY_COMPLETION = "bounty_completion",
  BOUNTY_DEADLINE_REMINDER = "bounty_deadline_reminder",

  // Builder - Community & Social
  PROJECT_COMMENT = "project_comment",
  NEW_TEAM_MESSAGE = "new_team_message",
  NEW_FOLLOWER = "new_follower",
  MENTIONED_IN_COMMENT = "mentioned_in_comment",
  EVENT_REMINDER = "event_reminder",

  // Builder - Payments & Rewards
  PRIZE_PAYOUT = "prize_payout",
  BONUS_REWARD = "bonus_reward",
  WALLET_STATUS = "wallet_status",

  // Tech Owner - Account & Setup
  TO_WELCOME = "to_welcome",
  HACKATHON_DRAFT_SAVED = "hackathon_draft_saved",
  HACKATHON_PUBLISHED = "hackathon_published",

  // Tech Owner - Hackathon Engagement
  NEW_BUILDER_REGISTERED = "new_builder_registered",
  NEW_PROJECT_SUBMITTED = "new_project_submitted",
  BUILDER_LEFT_HACKATHON = "builder_left_hackathon",
  JUDGE_RESPONSE = "judge_response",
  WINNER_SELECTION_REMINDER = "winner_selection_reminder",
  JUDGE_FEEDBACK_SUBMITTED = "judge_feedback_submitted",

  // Tech Owner - Bounties & Gigs
  NEW_BOUNTY_APPLICANT = "new_bounty_applicant",
  BOUNTY_COMPLETION_CONFIRMATION = "bounty_completion_confirmation",
  PAYMENT_RELEASE_PROMPT = "payment_release_prompt",

  // Tech Owner - Admin & Compliance
  PAYMENT_REQUIREMENT_REMINDER = "payment_requirement_reminder",
  HACKATHON_FLAGGED = "hackathon_flagged",
  AGREEMENT_SIGNED = "agreement_signed",

  // Tech Owner - Performance Insights
  WEEKLY_ENGAGEMENT_SUMMARY = "weekly_engagement_summary",
  SUGGESTED_IMPROVEMENTS = "suggested_improvements",

  // System & Global
  MAINTENANCE_ALERT = "maintenance_alert",
  PLATFORM_UPDATE = "platform_update",
  SECURITY_ALERT = "security_alert",
  CONSENT_REQUEST = "consent_request",
  ADMIN_MESSAGE = "admin_message",
}

export interface NotificationEvent {
  eventType: NotificationEventType;
  category: NotificationCategory;
  payload: any;
  targetUserIds: string[];
  metadata?: Record<string, any>;
}

export interface NotificationTemplate {
  id: string;
  eventType: NotificationEventType;
  title: string;
  body: string;
  data?: Record<string, any>;
}

export interface Notification {
  id?: string;
  userId: string;
  eventType: NotificationEventType;
  category: NotificationCategory;
  title: string;
  body: string;
  read: boolean;
  data?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface NotificationPreference {
  userId: string;
  eventType: NotificationEventType;
  channels: NotificationType[];
  enabled: boolean;
}

export interface DeliveryStatus {
  id: string;
  notificationId: string;
  channel: NotificationType;
  provider: string;
  status: "pending" | "sent" | "delivered" | "failed";
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}
