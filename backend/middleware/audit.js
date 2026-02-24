const pool = require('../config/database');

const auditLog = (action, entityType) => {
  return async (req, res, next) => {
    const originalSend = res.send;

    res.send = function (data) {
      if (res.statusCode < 400 && req.user) {
        const logData = {
          user_id: req.user.id,
          action,
          entity_type: entityType,
          entity_id: req.params.id || req.body.id,
          new_values: JSON.stringify(req.body),
          ip_address: req.ip
        };
        
        pool.query('INSERT INTO audit_logs SET ?', [logData]).catch(err => {
          console.error('Audit log error:', err);
        });
      }
      originalSend.call(this, data);
    };

    next();
  };
};

module.exports = auditLog;
