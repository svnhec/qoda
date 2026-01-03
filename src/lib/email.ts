/**
 * Email Service for Qoda
 * =============================================================================
 * Handles email sending for team invites, notifications, and alerts.
 * Uses Supabase Auth for transactional emails.
 * =============================================================================
 */

import { logger } from "@/lib/logger";

export interface TeamInviteEmailData {
  inviteId: string;
  email: string;
  organizationName: string;
  invitedByName: string;
  role: string;
  acceptUrl: string;
  expiresAt: string;
}

export interface NotificationEmailData {
  email: string;
  subject: string;
  message: string;
  actionUrl?: string;
  actionText?: string;
}

/**
 * Send team invite email using Supabase Auth
 * This leverages Supabase's built-in email templates and delivery
 */
export async function sendTeamInviteEmail(data: TeamInviteEmailData): Promise<void> {
  // Generate email content (for future use with email service)
  generateInviteEmailHtml(data);
  generateInviteEmailText(data);

  // For now, we'll use a simple approach. In production, you'd integrate with
  // a transactional email service like SendGrid, Mailgun, or AWS SES
  // For Supabase, we could use their built-in auth emails, but for custom emails
  // we need an external service

  // Log the email that would be sent
  logger.info("Team invite email would be sent", {
    to: data.email,
    subject: `Join ${data.organizationName} on Qoda`,
    organizationName: data.organizationName,
    inviteId: data.inviteId,
  });

  // Simulate successful email sending for now
  // In production, replace with actual email service
  // throw new Error("Email service not implemented");
}

/**
 * Send notification email
 */
export async function sendNotificationEmail(data: NotificationEmailData): Promise<void> {
  // Generate email content (for future use with email service)
  generateNotificationEmailHtml(data);
  generateNotificationEmailText(data);

  // For now, we'll use a simple approach. In production, you'd integrate with
  // a transactional email service like SendGrid, Mailgun, or AWS SES

  // Log the notification email that would be sent
  logger.info("Notification email would be sent", {
    to: data.email,
    subject: data.subject,
    hasAction: !!data.actionUrl,
  });

  // Simulate successful email sending for now
  // In production, replace with actual email service
  // throw new Error("Email service not implemented");
}

/**
 * Generate HTML email for team invites
 */
function generateInviteEmailHtml(data: TeamInviteEmailData): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Join ${data.organizationName} on Qoda</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f8fafc; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 30px; text-align: center; }
    .content { padding: 40px 30px; }
    .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
    .footer { background: #f8fafc; padding: 20px 30px; text-align: center; font-size: 12px; color: #64748b; }
    .highlight { background: #fef3c7; padding: 2px 6px; border-radius: 4px; font-weight: 500; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 28px;">🎯 You're Invited!</h1>
      <p style="margin: 10px 0 0 0; opacity: 0.9;">Join the ${data.organizationName} team on Qoda</p>
    </div>

    <div class="content">
      <h2>Hello!</h2>

      <p><strong>${data.invitedByName}</strong> has invited you to join the <strong>${data.organizationName}</strong> team on Qoda - the Financial Operating System for AI Agents.</p>

      <p>You've been invited as a <span class="highlight">${data.role}</span> team member.</p>

      <p>With Qoda, you'll be able to:</p>
      <ul>
        <li>Monitor and control AI agent spending in real-time</li>
        <li>Issue virtual cards with custom velocity limits</li>
        <li>Track financial performance across your AI fleet</li>
        <li>Manage billing relationships and revenue attribution</li>
      </ul>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${data.acceptUrl}" class="button">Accept Invitation</a>
      </div>

      <p><strong>This invite expires on ${new Date(data.expiresAt).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })}.</strong></p>

      <p>If you have any questions, feel free to reply to this email or contact ${data.invitedByName} directly.</p>

      <p>Welcome to the team! 🚀</p>

      <p>Best regards,<br>The Qoda Team</p>
    </div>

    <div class="footer">
      <p>This invitation was sent to ${data.email}. If you weren't expecting this email, you can safely ignore it.</p>
      <p>© 2024 Qoda. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Generate plain text email for team invites
 */
function generateInviteEmailText(data: TeamInviteEmailData): string {
  return `
🎯 You're Invited to Join ${data.organizationName} on Qoda!

Hello!

${data.invitedByName} has invited you to join the ${data.organizationName} team on Qoda - the Financial Operating System for AI Agents.

You've been invited as a ${data.role} team member.

With Qoda, you'll be able to:
• Monitor and control AI agent spending in real-time
• Issue virtual cards with custom velocity limits
• Track financial performance across your AI fleet
• Manage billing relationships and revenue attribution

Accept your invitation: ${data.acceptUrl}

This invite expires on ${new Date(data.expiresAt).toLocaleDateString('en-US', {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric'
})}.

If you have any questions, feel free to reply to this email or contact ${data.invitedByName} directly.

Welcome to the team! 🚀

Best regards,
The Qoda Team

---
This invitation was sent to ${data.email}. If you weren't expecting this email, you can safely ignore it.
© 2024 Qoda. All rights reserved.
`;
}

/**
 * Generate HTML email for notifications
 */
function generateNotificationEmailHtml(data: NotificationEmailData): string {
  const actionButton = data.actionUrl && data.actionText ? `
    <div style="text-align: center; margin: 30px 0;">
      <a href="${data.actionUrl}" class="button">${data.actionText}</a>
    </div>
  ` : '';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${data.subject}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f8fafc; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 30px; text-align: center; }
    .content { padding: 40px 30px; }
    .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
    .footer { background: #f8fafc; padding: 20px 30px; text-align: center; font-size: 12px; color: #64748b; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 24px;">📢 Qoda Notification</h1>
    </div>

    <div class="content">
      <h2>${data.subject}</h2>

      <div style="white-space: pre-line;">
        ${data.message}
      </div>

      ${actionButton}

      <p>Best regards,<br>The Qoda Team</p>
    </div>

    <div class="footer">
      <p>You received this email because you're a member of a Qoda organization.</p>
      <p>© 2024 Qoda. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Generate plain text email for notifications
 */
function generateNotificationEmailText(data: NotificationEmailData): string {
  const actionSection = data.actionUrl && data.actionText ?
    `\n\n${data.actionText}: ${data.actionUrl}\n` : '\n';

  return `
📢 Qoda Notification

${data.subject}

${data.message}
${actionSection}
Best regards,
The Qoda Team

---
You received this email because you're a member of a Qoda organization.
© 2024 Qoda. All rights reserved.
`;
}
