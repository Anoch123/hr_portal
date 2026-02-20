import nodemailer from "nodemailer"
import { supabaseAdmin } from "./supabase-admin"

const transporter = nodemailer.createTransport({
  host: "mail.lencar.lk",
  port: 465,
  secure: true,
  auth: {
    user: "noreply@lencar.lk",
    pass: "}b;vz]3V{;~eGyX%",
  },
})

interface EmailOptions {
  to: string
  subject: string
  html: string
}

export async function sendEmail({ to, subject, html }: EmailOptions) {
  try {
    // Skip email if SMTP not configured
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
      console.log("SMTP not configured - skipping email send. Would send to:", to)
      return { success: true }
    }

    // Log the email attempt
    const { data: emailLog, error: createError } = await supabaseAdmin
      .from("email_logs")
      .insert({
        to_email: to,
        subject,
        body: html,
        status: "PENDING",
      })
      .select()
      .single()

    if (createError) {
      throw createError
    }

    // Send the email
    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to,
      subject,
      html,
    })

    // Update log on success
    await supabaseAdmin
      .from("email_logs")
      .update({
        status: "SENT",
        sent_at: new Date().toISOString(),
      })
      .eq("id", emailLog.id)

    return { success: true }
  } catch (error) {
    console.error("Email sending failed:", error)

    // Log the error
    await supabaseAdmin.from("email_logs").insert({
      to_email: to,
      subject,
      body: html,
      status: "FAILED",
      error: error instanceof Error ? error.message : "Unknown error",
    })

    return { success: false, error }
  }
}

// Email templates
export const emailTemplates = {
  leaveRequestSubmitted: (
    employeeName: string,
    leaveType: string,
    startDate: string,
    endDate: string,
    managerName: string
  ) => ({
    subject: `Leave Request Submitted - ${employeeName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">New Leave Request</h2>
        <p>Dear ${managerName},</p>
        <p><strong>${employeeName}</strong> has submitted a leave request that requires your approval.</p>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Leave Type:</strong> ${leaveType}</p>
          <p><strong>Start Date:</strong> ${startDate}</p>
          <p><strong>End Date:</strong> ${endDate}</p>
        </div>
        <p>Please log in to the Leave Management System to review and take action on this request.</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/approvals" style="display: inline-block; background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Review Request</a>
      </div>
    `,
  }),

  leaveRequestApproved: (
    employeeName: string,
    leaveType: string,
    startDate: string,
    endDate: string,
    approverName: string
  ) => ({
    subject: `Leave Request Approved - ${leaveType}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #28a745;">Leave Request Approved</h2>
        <p>Dear ${employeeName},</p>
        <p>Your leave request has been <strong style="color: #28a745;">approved</strong> by ${approverName}.</p>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Leave Type:</strong> ${leaveType}</p>
          <p><strong>Start Date:</strong> ${startDate}</p>
          <p><strong>End Date:</strong> ${endDate}</p>
        </div>
        <p>Enjoy your time off!</p>
      </div>
    `,
  }),

  leaveRequestRejected: (
    employeeName: string,
    leaveType: string,
    startDate: string,
    endDate: string,
    approverName: string,
    reason: string
  ) => ({
    subject: `Leave Request Rejected - ${leaveType}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc3545;">Leave Request Rejected</h2>
        <p>Dear ${employeeName},</p>
        <p>Your leave request has been <strong style="color: #dc3545;">rejected</strong> by ${approverName}.</p>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Leave Type:</strong> ${leaveType}</p>
          <p><strong>Start Date:</strong> ${startDate}</p>
          <p><strong>End Date:</strong> ${endDate}</p>
          <p><strong>Reason:</strong> ${reason}</p>
        </div>
        <p>Please contact your manager if you have any questions.</p>
      </div>
    `,
  }),

  leaveRequestCancelled: (
    employeeName: string,
    leaveType: string,
    startDate: string,
    endDate: string,
    managerName: string,
    reason?: string
  ) => ({
    subject: `Leave Request Cancelled - ${employeeName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #ffc107;">Leave Request Cancelled</h2>
        <p>Dear ${managerName},</p>
        <p><strong>${employeeName}</strong> has cancelled their approved leave request.</p>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Leave Type:</strong> ${leaveType}</p>
          <p><strong>Start Date:</strong> ${startDate}</p>
          <p><strong>End Date:</strong> ${endDate}</p>
          ${reason ? `<p><strong>Cancellation Reason:</strong> ${reason}</p>` : ''}
        </div>
        <p>This leave request was previously approved and has now been cancelled by the employee. The leave balance has been restored.</p>
      </div>
    `,
  }),

  welcomeEmployee: (employeeName: string, email: string, tempPassword: string) => ({
    subject: `Welcome to the Leave Management System`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Welcome to the Team!</h2>
        <p>Dear ${employeeName},</p>
        <p>Your account has been created in the Leave Management System.</p>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Temporary Password:</strong> ${tempPassword}</p>
        </div>
        <p>Please log in and change your password immediately.</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/login" style="display: inline-block; background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Login Now</a>
      </div>
    `,
  }),

  passwordReset: (resetUrl: string) => ({
    subject: `Reset Your Password - Leave Management System`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Reset Your Password</h2>
        <p>We received a request to reset your password. Click the button below to create a new password:</p>
        <div style="margin: 20px 0;">
          <a href="${resetUrl}" style="display: inline-block; background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">Reset Password</a>
        </div>
        <p style="color: #666; font-size: 14px;">
          This link will expire in 1 hour. If you didn't request a password reset, please ignore this email or contact support if you have concerns.
        </p>
        <p style="color: #666; font-size: 14px; margin-top: 20px;">
          Alternatively, you can copy and paste this link into your browser:<br/>
          ${resetUrl}
        </p>
      </div>
    `,
  }),
}