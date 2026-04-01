const { getGraphToken } = require('../graphAuth');

module.exports = async function (context, req) {
  try {
    const token = await getGraphToken();

    const response = await fetch(
      'https://graph.microsoft.com/v1.0/users?$select=displayName,mail,userPrincipalName&$top=999&$filter=accountEnabled eq true',
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!response.ok) {
      const err = await response.text();
      context.res = { status: response.status, body: { error: err } };
      return;
    }

    const data = await response.json();
    const users = (data.value || [])
      .filter(u => {
        const email = (u.mail || u.userPrincipalName || '').toLowerCase();
        return email.endsWith('@macproducts.net') || email.endsWith('@macimpulse.net');
      })
      .map(u => ({
        displayName: u.displayName,
        email: (u.mail || u.userPrincipalName).toLowerCase(),
      }))
      .sort((a, b) => a.displayName.localeCompare(b.displayName));

    context.res = { status: 200, body: users };
  } catch (err) {
    context.res = { status: 500, body: { error: err.message } };
  }
};
