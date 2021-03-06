const Promise = require('bluebird');
const rfc2253 = require('rfc2253');
const LdapAuth = require('ldapauth-extended');

Promise.promisifyAll(LdapAuth.prototype);

function Auth(config, stuff) {
  const self = Object.create(Auth.prototype);
  self._users = {};

  // config for this module
  self._config = config;

  // verdaccio logger
  self._logger = stuff.logger;

  // pass verdaccio logger to ldapauth
  self._config.client_options.log = stuff.logger;

  // TODO: Set more defaults
  self._config.groupNameAttribute = self._config.groupNameAttribute || 'cn';

  // ldap client
  self._ldapClient = new LdapAuth(self._config.client_options);

  self._ldapClient.on('error', (err) => {
    self._logger.warn({
      err: err,
    }, `LDAP error ${err}`);
  });

  return self;
}

module.exports = Auth;

//
// Attempt to authenticate user against LDAP backend
//
Auth.prototype.authenticate = function (user, password, callback) {

  this._ldapClient.authenticateAsync(user, password)
    .then((ldapUser) => {
      if (!ldapUser) return [];

      const originalGroups = [
        // _groups or memberOf could be single els or arrays.
        ...ldapUser._groups ? [].concat(ldapUser._groups).map((group) => group.cn) : [],
        ...ldapUser.memberOf ? [].concat(ldapUser.memberOf).map((groupDn) => rfc2253.parse(groupDn).get('CN')) : [],
      ];

      let groups = [];

      this._logger.debug(`[LDAP debug] ${user} groups are ${ldapUser.cn} and ${originalGroups.join('\n\t')}`);

      // there may be too many unimportant groups
      // we'll cut them off
      if (this._config.considerableGroups && this._config.considerableGroups.length > 0) {
        this._logger.debug(`[LDAP debug] Considering only ${this._config.considerableGroups} groups`);
        groups = originalGroups.filter(g => this._config.considerableGroups.includes(g));
      } else {
        groups = originalGroups;
      }

      this._logger.debug(`[LDAP debug] ${user} result groups are ${[ldapUser.cn, ...groups].join(', ')}`);

      return [ldapUser.cn, ...groups];
    })
    .catch((err) => {
      // 'No such user' is reported via error
      this._logger.warn({
        user: user,
        err: err,
      }, `LDAP error ${err}`);

      return false; // indicates failure
    })
    .asCallback(callback);
};
