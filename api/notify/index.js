const { getGraphToken } = require('../graphAuth');

const SENDER_EMAIL = process.env.NOTIFY_SENDER || 'cs@macproducts.net';

module.exports = async function (context, req) {
  try {
    const { toEmail, toName, taskTitle, assignedBy } = req.body;

    if (!toEmail || !taskTitle) {
      context.res = { status: 400, body: { error: 'Missing toEmail or taskTitle' } };
      return;
    }

    const token = await getGraphToken();

    const emailPayload = {
      message: {
        subject: `Task Assigned: ${taskTitle}`,
        body: {
          contentType: 'HTML',
          content: `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: #1a365d; color: white; padding: 20px 30px; border-radius: 12px 12px 0 0;">
                <h2 style="margin: 0; font-size: 18px;">MAC Task Manager</h2>
              </div>
              <div style="background: #ffffff; padding: 30px; border: 1px solid #e2e8f0; border-top: none;">
                <p style="color: #2d3436; font-size: 16px; margin-top: 0;">Hi ${toName || toEmail.split('@')[0]},</p>
                <p style="color: #636e72; font-size: 14px;">A task has been delegated to you on the MAC Task Manager:</p>
                <div style="background: #f0f4f8; border-left: 4px solid #3182ce; padding: 15px 20px; border-radius: 0 8px 8px 0; margin: 20px 0;">
                  <p style="margin: 0; font-weight: 700; color: #1a365d; font-size: 16px;">${taskTitle}</p>
                </div>
                <p style="color: #636e72; font-size: 14px;">Assigned by: <strong>${assignedBy}</strong></p>
                <p style="color: #636e72; font-size: 14px;">Please log in to the <a href="https://agreeable-rock-082a9c91e.6.azurestaticapps.net" style="color: #3182ce;">MAC Task Manager</a> to view details.</p>
              </div>
              <div style="text-align: center; padding: 15px; color: #a0aec0; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; font-weight: 700;">
                MAC Products Internal System
              </div>
            </div>
          `,
        },
        toRecipients: [
          { emailAddress: { address: toEmail, name: toName || '' } },
        ],
        ccRecipients: [
          { emailAddress: { address: 'anthony.jimenez@macproducts.net', name: 'Anthony Jimenez' } },
        ],
      },
      saveToSentItems: false,
    };

    const response = await fetch(
      `https://graph.microsoft.com/v1.0/users/${SENDER_EMAIL}/sendMail`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailPayload),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      context.res = { status: response.status, body: { error: err } };
      return;
    }

    context.res = { status: 200, body: { success: true } };
  } catch (err) {
    context.res = { status: 500, body: { error: err.message } };
  }
};
