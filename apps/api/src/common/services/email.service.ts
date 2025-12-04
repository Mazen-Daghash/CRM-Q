import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly config: ConfigService) {
    const host = this.config.get<string>('mail.host');
    const port = this.config.get<number>('mail.port');
    const user = this.config.get<string>('mail.user');
    const password = this.config.get<string>('mail.password');

    if (host && user && password) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: {
          user,
          pass: password,
        },
      });
    } else {
      this.logger.warn('Email configuration incomplete. Email notifications will be disabled.');
    }
  }

  async sendEmail(to: string, subject: string, html: string) {
    if (!this.transporter) {
      this.logger.warn(`Email not sent (no config): ${to} - ${subject}`);
      return;
    }

    try {
      const from = this.config.get<string>('mail.from') || 'crm@company.local';
      await this.transporter.sendMail({
        from,
        to,
        subject,
        html,
      });
      this.logger.log(`Email sent to ${to}: ${subject}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}:`, error);
    }
  }

  async sendTaskAssignedEmail(to: string, taskTitle: string, assignerName: string) {
    const html = `
      <h2>New Task Assigned</h2>
      <p>Hello,</p>
      <p>You have been assigned a new task: <strong>${taskTitle}</strong></p>
      <p>Assigned by: ${assignerName}</p>
      <p>Please log in to the CRM to view details.</p>
    `;
    await this.sendEmail(to, `New Task: ${taskTitle}`, html);
  }

  async sendTaskCompletedEmail(to: string, taskTitle: string, assigneeName: string) {
    const html = `
      <h2>Task Completed</h2>
      <p>Hello,</p>
      <p>The task <strong>${taskTitle}</strong> has been marked as completed by ${assigneeName}.</p>
      <p>Please review and approve or decline the task.</p>
    `;
    await this.sendEmail(to, `Task Completed: ${taskTitle}`, html);
  }

  async sendLeaveUpdateEmail(to: string, type: string, status: string, comment?: string) {
    const html = `
      <h2>Leave Request Update</h2>
      <p>Hello,</p>
      <p>Your ${type} leave request has been <strong>${status}</strong>.</p>
      ${comment ? `<p>Comment: ${comment}</p>` : ''}
    `;
    await this.sendEmail(to, `Leave Request ${status}`, html);
  }
}


