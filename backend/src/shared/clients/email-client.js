class EmailClient {
  constructor() {
    this.sentEmails = [];
    this.failNext = false;
  }

  async sendMail({ to, subject, html, text, idempotencyKey = null }) {
    if (this.failNext) {
      this.failNext = false;
      throw new Error('SIMULATED_EMAIL_TRANSPORT_ERROR: Servidor SMTP no disponible');
    }

    const emailRecord = {
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      to,
      subject,
      html,
      text: text || subject,
      idempotencyKey,
      sentAt: new Date().toISOString(),
      status: 'DELIVERED',
    };

    this.sentEmails.push(emailRecord);
    return { ok: true, messageId: emailRecord.id, timestamp: emailRecord.sentAt };
  }

  getSentEmails() {
    return [...this.sentEmails];
  }

  clearSentEmails() {
    this.sentEmails = [];
  }

  simulateFailure() {
    this.failNext = true;
  }
}

module.exports = new EmailClient();

